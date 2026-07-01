import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { buildDiagnosticContext } from '../constants/diagnosticFlow';
import { buildGateContextAppendix } from '../constants/blueprintFlow';
import {
  createDiagnosticCycle,
  deleteDiagnosticCycle,
  getDiagnosticCycle,
  listDiagnosticCycles,
  loadCycleIntoWorkspace,
  snapshotFormIntoCycle,
  updateDiagnosticCycle,
  type DiagnosticCycle,
} from '../services/diagnosticCycles';
import { getInitialForm } from '../services/initialForm';
import { getBlueprintGate } from '../services/blueprintGate';
import { clearActiveCycleId, resolveActiveCycleId, setActiveCycleId } from '../services/cycleWorkspace';
import { workspaceApi } from '../services/api';
import { usePlan } from './PlanContext';
import { canCreateMoreCycles, cycleLimitMessage } from '../utils/cycleLimits';

interface CycleContextValue {
  userId: string | null;
  cycles: DiagnosticCycle[];
  activeCycle: DiagnosticCycle | null;
  loading: boolean;
  switching: boolean;
  needsDiagnosis: boolean;
  refreshCycles: () => Promise<void>;
  switchCycle: (cycleId: string) => Promise<void>;
  startNewCycle: (options?: { label?: string }) => Promise<{ ok: boolean; message?: string }>;
  deleteCycle: (cycleId: string) => Promise<{ ok: boolean; message?: string }>;
  clearNeedsDiagnosis: () => void;
  persistActiveCycleSnapshot: () => Promise<void>;
  renameActiveCycle: (label: string) => Promise<{ ok: boolean; message?: string }>;
}

const CycleContext = createContext<CycleContextValue | null>(null);

async function ensureDefaultCycle(userId: string): Promise<DiagnosticCycle> {
  const cycles = await listDiagnosticCycles(userId);
  if (cycles.length > 0) {
    const active = cycles.find((c) => c.status === 'draft' || c.status === 'active');
    return active ?? cycles[0];
  }

  const [{ data, completedAt }, gate] = await Promise.all([
    getInitialForm(userId),
    getBlueprintGate(userId).catch(() => null),
  ]);
  const diagnosticContext = buildDiagnosticContext(data);
  const gateSummary =
    gate?.selectedPath != null
      ? buildGateContextAppendix(gate.selectedPath, {
          aiRecommendedPath: gate.aiRecommendedPath,
          rationale: gate.rationale,
        })
      : undefined;

  const created = await createDiagnosticCycle(userId, {
    label: 'Ciclo 1 · Base',
    status: completedAt ? 'active' : diagnosticContext.trim() ? 'draft' : 'draft',
    diagnosticContext,
    gateSummary,
    formData: data,
  });

  if (completedAt) {
    await updateDiagnosticCycle(created.id, {
      completedAt: completedAt.toISOString(),
      status: 'active',
      ...(gate?.selectedPath ? { gatePath: gate.selectedPath } : {}),
      ...(gate?.rationale ? { gateRationale: gate.rationale } : {}),
      ...(gate?.selectedPath
        ? {
            gateSummary: buildGateContextAppendix(gate.selectedPath, {
              aiRecommendedPath: gate.aiRecommendedPath,
              rationale: gate.rationale,
            }),
          }
        : {}),
    });
  }

  return (await getDiagnosticCycle(created.id)) ?? created;
}

export function CycleProvider({ children }: { children: ReactNode }) {
  const { maxOpenCycles, plan } = usePlan();
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [cycles, setCycles] = useState<DiagnosticCycle[]>([]);
  const [activeCycle, setActiveCycle] = useState<DiagnosticCycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [needsDiagnosis, setNeedsDiagnosis] = useState(false);

  const refreshCycles = useCallback(async () => {
    if (!userId) {
      setCycles([]);
      setActiveCycle(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let list = await listDiagnosticCycles(userId);
      if (list.length === 0) {
        const defaultCycle = await ensureDefaultCycle(userId);
        list = [defaultCycle];
      }

      let activeId = await resolveActiveCycleId(userId);
      let active = activeId ? list.find((c) => c.id === activeId) ?? null : null;
      if (!active) {
        active = list.find((c) => c.status === 'draft') ?? list.find((c) => c.status === 'active') ?? list[0];
        if (active) {
          activeId = active.id;
          await setActiveCycleId(userId, active.id);
        }
      }

      setCycles(list);
      setActiveCycle(active);
      setNeedsDiagnosis(active?.status === 'draft' && !active?.completedAt);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUserId(u?.uid ?? null);
    });
    return unsub;
  }, []);

  useEffect(() => {
    void refreshCycles();
  }, [refreshCycles]);

  const persistActiveCycleSnapshot = useCallback(async () => {
    if (!userId || !activeCycle) return;
    await snapshotFormIntoCycle(activeCycle.id, userId);
    await refreshCycles();
  }, [userId, activeCycle, refreshCycles]);

  const switchCycle = useCallback(
    async (cycleId: string) => {
      if (!userId || switching) return;
      if (activeCycle?.id === cycleId) return;

      setSwitching(true);
      try {
        if (activeCycle) {
          await snapshotFormIntoCycle(activeCycle.id, userId);
        }

        const target = await getDiagnosticCycle(cycleId);
        if (!target || target.userId !== userId) return;

        await loadCycleIntoWorkspace(target, userId);
        await setActiveCycleId(userId, cycleId);
        setActiveCycle(target);
        setNeedsDiagnosis(target.status === 'draft' && !target.completedAt);

        const list = await listDiagnosticCycles(userId);
        setCycles(list);
      } finally {
        setSwitching(false);
      }
    },
    [userId, activeCycle, switching]
  );

  const startNewCycle = useCallback(async (options?: { label?: string }) => {
    if (!userId) return { ok: false, message: 'Usuário não autenticado.' };

    try {
      if (!canCreateMoreCycles(cycles, maxOpenCycles)) {
        const limit = maxOpenCycles ?? 1;
        return {
          ok: false,
          message: cycleLimitMessage(plan?.planName ?? 'Starter', limit),
        };
      }

      let archiveCycleId: string | undefined;

      if (activeCycle && activeCycle.status !== 'archived') {
        await snapshotFormIntoCycle(activeCycle.id, userId);
        const { data, completedAt } = await getInitialForm(userId);
        const diagnosticContext = buildDiagnosticContext(data);

        await updateDiagnosticCycle(activeCycle.id, {
          status: 'archived',
          archivedAt: true,
          diagnosticContext,
          formData: data,
          ...(completedAt ? { completedAt: completedAt.toISOString() } : {}),
        });
        archiveCycleId = activeCycle.id;

        if (diagnosticContext.trim()) {
          try {
            await workspaceApi.archiveCycle({
              cycleNumber: activeCycle.cycleNumber,
              label: activeCycle.label,
              diagnosticContext,
            });
          } catch {
            /* API offline */
          }
        }
      }

      const label = options?.label?.trim();
      const next = await createDiagnosticCycle(userId, {
        status: 'draft',
        diagnosticContext: '',
        archiveCycleId,
        ...(label ? { label } : {}),
      });
      await setActiveCycleId(userId, next.id);
      await loadCycleIntoWorkspace(
        { ...next, formData: undefined, gatePath: undefined, gateSummary: undefined },
        userId
      );

      setActiveCycle(next);
      setNeedsDiagnosis(true);
      await refreshCycles();
      return { ok: true, message: 'Novo ciclo criado. Preencha o diagnóstico para ativá-lo.' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar ciclo';
      return { ok: false, message: msg };
    }
  }, [userId, activeCycle, refreshCycles, cycles, maxOpenCycles, plan?.planName]);

  const deleteCycle = useCallback(
    async (cycleId: string) => {
      if (!userId) return { ok: false, message: 'Usuário não autenticado.' };

      const target = cycles.find((c) => c.id === cycleId);
      if (!target) return { ok: false, message: 'Processo não encontrado.' };

      try {
        if (activeCycle?.id === cycleId) {
          await snapshotFormIntoCycle(cycleId, userId).catch(() => undefined);
        }

        await deleteDiagnosticCycle(cycleId, userId);

        const remaining = cycles.filter((c) => c.id !== cycleId);
        if (activeCycle?.id === cycleId) {
          const next =
            remaining.find((c) => c.status === 'draft' || c.status === 'active') ?? remaining[0];
          if (next) {
            await loadCycleIntoWorkspace(next, userId);
            await setActiveCycleId(userId, next.id);
            setActiveCycle(next);
            setNeedsDiagnosis(next.status === 'draft' && !next.completedAt);
          } else {
            await clearActiveCycleId(userId);
            setActiveCycle(null);
            setNeedsDiagnosis(false);
          }
        }

        setCycles(remaining);
        await refreshCycles();
        return { ok: true, message: 'Processo excluído.' };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao excluir processo';
        return { ok: false, message: msg };
      }
    },
    [userId, cycles, activeCycle, refreshCycles]
  );

  const renameActiveCycle = useCallback(
    async (label: string) => {
      if (!userId || !activeCycle) {
        return { ok: false, message: 'Nenhum ciclo ativo para renomear.' };
      }

      const trimmed = label.trim();
      if (trimmed.length < 2) {
        return { ok: false, message: 'Informe um nome com pelo menos 2 caracteres.' };
      }

      if (trimmed === activeCycle.label) {
        return { ok: true };
      }

      try {
        await updateDiagnosticCycle(activeCycle.id, { label: trimmed });
        setActiveCycle((prev) => (prev ? { ...prev, label: trimmed } : prev));
        setCycles((prev) =>
          prev.map((cycle) => (cycle.id === activeCycle.id ? { ...cycle, label: trimmed } : cycle))
        );
        return { ok: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao renomear projeto';
        return { ok: false, message: msg };
      }
    },
    [userId, activeCycle]
  );

  const value = useMemo(
    () => ({
      userId,
      cycles,
      activeCycle,
      loading,
      switching,
      needsDiagnosis,
      refreshCycles,
      switchCycle,
      startNewCycle,
      deleteCycle,
      clearNeedsDiagnosis: () => setNeedsDiagnosis(false),
      persistActiveCycleSnapshot,
      renameActiveCycle,
    }),
    [
      userId,
      cycles,
      activeCycle,
      loading,
      switching,
      needsDiagnosis,
      refreshCycles,
      switchCycle,
      startNewCycle,
      deleteCycle,
      persistActiveCycleSnapshot,
      renameActiveCycle,
    ]
  );

  return <CycleContext.Provider value={value}>{children}</CycleContext.Provider>;
}

export function useCycle() {
  const ctx = useContext(CycleContext);
  if (!ctx) throw new Error('useCycle must be used within CycleProvider');
  return ctx;
}
