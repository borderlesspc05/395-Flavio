import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { onAuthStateChanged } from 'firebase/auth';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { auth } from '../config/firebase';
import { actionCanvasesApi } from '../services/api';
import { getInitialForm } from '../services/initialForm';
import {
  parseSelectedSolutionActions,
  readStashedSelectedSolutionActions,
} from '../services/solutionPick';
import type { SuggestedSolutionAction } from '../types/solutionPick';
import { syncMagnusMemoryAfterCanvasChange } from '../services/magnusMemorySync';
import {
  clearSelectedInheritedPractices,
  MAX_INHERITED_INITIATIVES,
  readSelectedInheritedPractices,
  readStashedEvolution,
} from '../services/evolutionLoopStorage';
import { enrichDraftObjetivo, ensureObjetivoParagraphs } from '../utils/enrichObjetivoEspecifico';
import type { ActionCanvas, SuggestedActionCanvasDraft } from '../types';
import { ToastStack } from '../components/ui/ToastStack';
import { PhaseInfoButton } from '../components/ui/PhaseInfoButton';
import { PhaseLockBanner } from '../components/ui/PhaseLockBanner';
import { Modal } from '../components/ui/Modal';
import { usePhaseLock } from '../hooks/usePhaseLock';
import { useCycle } from '../context/CycleContext';
import { canReopenPhase, PHASE_PATHS, reopenSprintPhase } from '../services/phaseLock';

type EditablePlan = SuggestedActionCanvasDraft & {
  localId: string;
  validated: boolean;
  canvasId?: string;
  successCriteria: string[];
  inheritedFromCycle?: boolean;
};

function newId() {
  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function defaultPrazo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function emptyCriteria(): string[] {
  return ['', '', ''];
}

function normalizeCriteria(raw?: string[] | null): string[] {
  const list = Array.isArray(raw) ? raw.map((c) => String(c ?? '')) : [];
  while (list.length < 3) list.push('');
  return list.slice(0, 3);
}

function blankPlan(): EditablePlan {
  return {
    localId: newId(),
    validated: false,
    nomeIniciativa: '',
    objetivoEspecifico: '',
    owner: '',
    sponsor: '',
    prazoFinal: defaultPrazo(90),
    successCriteria: emptyCriteria(),
    entregas: [
      {
        entrega: '',
        responsavel: '',
        prazo: defaultPrazo(30),
        status: 'amarelo',
      },
    ],
    riscos: [{ risco: '', acaoTomar: '' }],
  };
}

function fromDraft(
  draft: SuggestedActionCanvasDraft,
  canvasId?: string,
  meta?: { descricao?: string; rationale?: string; categoria?: string }
): EditablePlan {
  const enriched = enrichDraftObjetivo(draft, meta);
  return {
    localId: newId(),
    validated: Boolean(canvasId),
    canvasId,
    ...enriched,
    objetivoEspecifico: ensureObjetivoParagraphs(enriched.objetivoEspecifico),
    successCriteria: normalizeCriteria(enriched.successCriteria),
    inheritedFromCycle: Boolean(enriched.inheritedFromCycle),
  };
}

function fromCanvas(canvas: ActionCanvas): EditablePlan {
  return {
    localId: newId(),
    validated: true,
    canvasId: canvas.id,
    nomeIniciativa: canvas.nomeIniciativa,
    objetivoEspecifico: ensureObjetivoParagraphs(canvas.objetivoEspecifico),
    owner: canvas.owner,
    sponsor: canvas.sponsor,
    prazoFinal: canvas.prazoFinal,
    successCriteria: normalizeCriteria(canvas.successCriteria),
    inheritedFromCycle: Boolean(canvas.inheritedFromCycle),
    entregas: canvas.entregas.map((e) => ({
      entrega: e.entrega,
      responsavel: e.responsavel,
      prazo: e.prazo,
      status: e.status,
      evidencia: e.evidencia,
    })),
    riscos: canvas.riscos.map((r) => ({ risco: r.risco, acaoTomar: r.acaoTomar })),
  };
}

function normalizeTitle(value: string) {
  return value.trim().toLowerCase();
}

function extractApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string; message?: string } | undefined;
    const serverMessage = data?.error || data?.message;
    if (serverMessage) return serverMessage;
  }
  return fallback;
}

function toCreateBody(plan: EditablePlan) {
  return {
    nomeIniciativa: plan.nomeIniciativa.trim(),
    objetivoEspecifico: plan.objetivoEspecifico.trim(),
    owner: plan.owner.trim() || 'A definir',
    sponsor: plan.sponsor.trim() || 'A definir',
    prazoFinal: plan.prazoFinal || defaultPrazo(90),
    successCriteria: normalizeCriteria(plan.successCriteria).map((c) => c.trim()).filter(Boolean),
    inheritedFromCycle: Boolean(plan.inheritedFromCycle),
    signOff: 'pendente' as const,
    fechado: false,
    entregas: plan.entregas.map((e, i) => ({
      id: `del-${i}-${Date.now()}`,
      entrega: e.entrega,
      responsavel: e.responsavel,
      prazo: e.prazo,
      status: e.status ?? 'amarelo',
      evidencia: e.evidencia ?? '',
    })),
    riscos: plan.riscos.map((r, i) => ({
      id: `risk-${i}-${Date.now()}`,
      risco: r.risco,
      acaoTomar: r.acaoTomar,
    })),
  };
}

function resolveSelectedActions(
  navState: unknown,
  formData: Awaited<ReturnType<typeof getInitialForm>>['data']
): SuggestedSolutionAction[] {
  const fromNav = (navState as { selectedActions?: SuggestedSolutionAction[] } | null)?.selectedActions;
  if (fromNav?.length) return fromNav;

  const fromForm = parseSelectedSolutionActions(formData);
  if (fromForm.length) return fromForm;

  return readStashedSelectedSolutionActions();
}

function linkPlansToCanvases(
  selected: SuggestedSolutionAction[],
  canvases: ActionCanvas[]
): EditablePlan[] {
  const byTitle = new Map<string, ActionCanvas>();
  for (const canvas of canvases) {
    byTitle.set(normalizeTitle(canvas.nomeIniciativa), canvas);
  }
  const used = new Set<string>();

  return selected.map((item) => {
    const key = normalizeTitle(item.draft.nomeIniciativa);
    const match = byTitle.get(key);
    if (match && !used.has(match.id)) {
      used.add(match.id);
      const plan = fromDraft(item.draft, match.id, {
        descricao: item.descricao,
        rationale: item.rationale,
        categoria: item.categoria,
      });
      return {
        ...plan,
        successCriteria: normalizeCriteria(match.successCriteria ?? plan.successCriteria),
        inheritedFromCycle: Boolean(match.inheritedFromCycle),
        owner: match.owner || plan.owner,
        sponsor: match.sponsor || plan.sponsor,
      };
    }
    return fromDraft(item.draft, undefined, {
      descricao: item.descricao,
      rationale: item.rationale,
      categoria: item.categoria,
    });
  });
}

export function DesignPlansPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearNeedsDiagnosis, refreshCycles } = useCycle();
  const {
    locks,
    setLocks,
    locked: phaseLocked,
    cycle,
    concludeCurrent,
    progress,
    setProgress,
  } = usePhaseLock('design');
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<EditablePlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [suggestingCriteriaId, setSuggestingCriteriaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reopenDiagnosticOpen, setReopenDiagnosticOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopeningDiagnostic, setReopeningDiagnostic] = useState(false);
  const syncTimers = useRef<Record<string, number>>({});

  useEffect(() => {
    if (progress.sprintProgress !== 'diagnostic') {
      clearNeedsDiagnosis();
    }
  }, [progress.sprintProgress, clearNeedsDiagnosis]);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(null), 6000);
    return () => window.clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const validatedCount = useMemo(() => plans.filter((p) => p.validated).length, [plans]);
  const pendingCount = useMemo(() => plans.filter((p) => !p.validated).length, [plans]);
  const allValidated = plans.length > 0 && pendingCount === 0;
  const diagnosticReopenable = canReopenPhase(progress, 'diagnostic');
  const activePlan = useMemo(
    () => plans.find((p) => p.localId === activePlanId) ?? plans[0] ?? null,
    [plans, activePlanId]
  );

  const handleReopenDiagnostic = async () => {
    setReopeningDiagnostic(true);
    setError(null);
    const result = await reopenSprintPhase(cycle, 'diagnostic', reopenReason);
    setReopeningDiagnostic(false);

    if (!result.ok) {
      setError(result.message ?? 'Não foi possível reabrir o Diagnóstico.');
      return;
    }

    setLocks(result.state.phaseLocks);
    setProgress(result.state);
    await refreshCycles();
    setReopenDiagnosticOpen(false);
    setReopenReason('');
    navigate(result.nextPath ?? PHASE_PATHS.diagnostic);
  };

  const persistCanvas = useCallback(async (plan: EditablePlan): Promise<string | undefined> => {
    if (!plan.nomeIniciativa.trim()) return plan.canvasId;
    const body = toCreateBody(plan);
    if (plan.canvasId) {
      await actionCanvasesApi.update(plan.canvasId, body);
      return plan.canvasId;
    }
    const created = await actionCanvasesApi.create(body);
    return created.id;
  }, []);

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      // Materializa iniciativas selecionadas no Loop (até 3) neste ciclo de Design
      const queued = readSelectedInheritedPractices();
      if (queued.length > 0) {
        let existing = await actionCanvasesApi.list().catch(() => [] as ActionCanvas[]);
        const names = new Set(
          existing.map((c) => c.nomeIniciativa.trim().toLowerCase()).filter(Boolean)
        );
        for (const item of queued.slice(0, MAX_INHERITED_INITIATIVES)) {
          const key = item.practice.trim().toLowerCase();
          if (!key || names.has(key)) continue;
          try {
            const created = await actionCanvasesApi.create({
              nomeIniciativa: item.practice.trim(),
              objetivoEspecifico:
                item.rationale?.trim() ||
                `Insight herdado do Loop contínuo: ${item.practice.trim()}`,
              owner: '',
              sponsor: '',
              prazoFinal: defaultPrazo(90),
              successCriteria: emptyCriteria(),
              inheritedFromCycle: true,
              entregas: [
                {
                  entrega: `Primeiro passo: ${item.practice.trim()}`,
                  responsavel: '',
                  prazo: defaultPrazo(30),
                  status: 'amarelo',
                  evidencia: '',
                },
              ],
              riscos: [
                {
                  risco: 'Risco a mapear nesta iniciativa herdada',
                  acaoTomar: 'Definir plano de mitigação no Design',
                },
              ],
              signOff: 'pendente',
              fechado: false,
            });
            names.add(key);
            existing = [...existing, created];
          } catch {
            // Continua as demais; aviso abaixo se nada foi criado
          }
        }
        clearSelectedInheritedPractices();
      }

      const [{ data }, canvases] = await Promise.all([
        getInitialForm(uid),
        actionCanvasesApi.list().catch(() => [] as ActionCanvas[]),
      ]);
      const selected = resolveSelectedActions(location.state, data);
      let next =
        selected.length > 0
          ? linkPlansToCanvases(selected, canvases)
          : canvases.map((c) => fromCanvas(c));
      // Append inherited canvases not already linked
      const linkedIds = new Set(next.map((p) => p.canvasId).filter(Boolean));
      for (const canvas of canvases) {
        if (canvas.inheritedFromCycle && !linkedIds.has(canvas.id)) {
          next = [...next, fromCanvas(canvas)];
          linkedIds.add(canvas.id);
        }
      }
      setPlans(next);
      setActivePlanId((prev) =>
        prev && next.some((p) => p.localId === prev) ? prev : next[0]?.localId ?? null
      );
      if (queued.length > 0) {
        setNotice(
          `${Math.min(queued.length, MAX_INHERITED_INITIATIVES)} iniciativa(s) herdada(s) do ciclo anterior — revise e valide no Design.`
        );
      }
    } catch {
      setError('Não foi possível carregar os planos do Solution Pick.');
    } finally {
      setLoading(false);
    }
  }, [location.state]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
      if (user?.uid) void load(user.uid);
      else setLoading(false);
    });
    return unsub;
  }, [load]);

  useEffect(() => {
    return () => {
      Object.values(syncTimers.current).forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const state = location.state as { addPlan?: boolean } | null;
    if (!state?.addPlan || phaseLocked) return;
    const plan = blankPlan();
    setPlans((prev) => [...prev, plan]);
    setActivePlanId(plan.localId);
    navigate(location.pathname, { replace: true, state: {} });
  }, [loading, location.state, location.pathname, navigate, phaseLocked]);

  const scheduleCanvasSync = useCallback(
    (plan: EditablePlan) => {
      if (!plan.canvasId) return;
      const existing = syncTimers.current[plan.localId];
      if (existing) window.clearTimeout(existing);
      syncTimers.current[plan.localId] = window.setTimeout(() => {
        setSyncingId(plan.localId);
        void persistCanvas(plan)
          .catch(() => setError('Não foi possível sincronizar o plano.'))
          .finally(() => setSyncingId(null));
      }, 450);
    },
    [persistCanvas]
  );

  const updatePlan = (localId: string, patch: Partial<EditablePlan>) => {
    setPlans((prev) => {
      const current = prev.find((p) => p.localId === localId);
      if (!current) return prev;
      const updated = {
        ...current,
        ...patch,
        validated: current.canvasId ? current.validated : false,
      };
      if (updated.canvasId) scheduleCanvasSync(updated);
      return prev.map((p) => (p.localId === localId ? updated : p));
    });
  };

  const removePlan = async (localId: string) => {
    const plan = plans.find((p) => p.localId === localId);
    if (plan?.canvasId) {
      try {
        await actionCanvasesApi.remove(plan.canvasId);
      } catch {
        setError('Não foi possível remover o plano vinculado.');
        return;
      }
    }
    setPlans((prev) => {
      const next = prev.filter((p) => p.localId !== localId);
      if (activePlanId === localId) setActivePlanId(next[0]?.localId ?? null);
      return next;
    });
  };

  const addPlan = () => {
    const plan = blankPlan();
    setPlans((prev) => [...prev, plan]);
    setActivePlanId(plan.localId);
  };

  const suggestCriteria = async (plan: EditablePlan) => {
    setError(null);
    setSuggestingCriteriaId(plan.localId);
    try {
      const result = await actionCanvasesApi.suggestSuccessCriteria({
        nomeIniciativa: plan.nomeIniciativa.trim(),
        objetivoEspecifico: plan.objetivoEspecifico.trim(),
        prazoFinal: plan.prazoFinal,
        entregas: plan.entregas.map((item) => item.entrega.trim()).filter(Boolean),
        riscos: plan.riscos.map((item) => item.risco.trim()).filter(Boolean),
      });
      if (result.criteria.length !== 3) {
        throw new Error('A IA não retornou os três critérios esperados.');
      }
      updatePlan(plan.localId, { successCriteria: result.criteria });
      setNotice(
        result.demoMode
          ? 'Critérios SMART gerados com o modelo de contingência.'
          : 'Três critérios SMART distintos foram gerados.',
      );
    } catch (err) {
      setError(extractApiError(err, 'Não foi possível sugerir os critérios. Tente novamente.'));
    } finally {
      setSuggestingCriteriaId(null);
    }
  };

  const validatePlan = async (localId: string) => {
    const plan = plans.find((p) => p.localId === localId);
    if (!plan?.nomeIniciativa.trim()) {
      setError('Informe o nome da iniciativa antes de validar.');
      return;
    }
    setError(null);
    setSyncingId(localId);
    try {
      const canvasId = await persistCanvas(plan);
      setPlans((prev) =>
        prev.map((p) =>
          p.localId === localId ? { ...p, validated: true, canvasId: canvasId ?? p.canvasId } : p
        )
      );
      setNotice(`Plano "${plan.nomeIniciativa}" validado e sincronizado na Difusão.`);
      await syncMagnusMemoryAfterCanvasChange();
    } catch (err) {
      setError(extractApiError(err, 'Erro ao publicar o plano. Tente novamente.'));
    } finally {
      setSyncingId(null);
    }
  };


  const concludeDesign = async (options?: { skipValidation?: boolean }) => {
    if (!userId || plans.length === 0) return;

    const skipValidation = Boolean(options?.skipValidation);
    if (!allValidated && !skipValidation) return;

    const namedPlans = plans.filter((p) => p.nomeIniciativa.trim());
    if (namedPlans.length === 0) {
      setError('Nomeie ao menos um plano antes de avançar.');
      return;
    }

    if (skipValidation && pendingCount > 0) {
      const ok = window.confirm(
        `Ainda falta validar ${pendingCount} plano${pendingCount === 1 ? '' : 's'}.\n\n` +
          'Deseja avançar para a Difusão mesmo assim? Os planos serão salvos, mas podem ficar incompletos.',
      );
      if (!ok) return;
    }

    setSaving(true);
    setError(null);
    try {
      for (const plan of namedPlans) {
        const canvasId = await persistCanvas(plan);
        if (canvasId && canvasId !== plan.canvasId) {
          setPlans((prev) =>
            prev.map((p) =>
              p.localId === plan.localId ? { ...p, canvasId, validated: true } : p,
            ),
          );
        }
      }
      await syncMagnusMemoryAfterCanvasChange();
      const concluded = await concludeCurrent();
      if (!concluded.ok) {
        setError(concluded.message ?? 'Não foi possível concluir o Design.');
        return;
      }
      if (concluded.state) setProgress(concluded.state);
      const skipped = skipValidation ? pendingCount : 0;
      navigate(concluded.nextPath ?? PHASE_PATHS.diffusion, {
        state: {
          postDesignNotice: {
            title: 'Design concluído',
            message:
              skipped > 0
                ? `${namedPlans.length} plano(s) sincronizados na Difusão · ${skipped} ainda sem validação explícita.`
                : `${namedPlans.length} plano(s) de ação sincronizados na Difusão.`,
          },
        },
      });
    } catch (err) {
      setError(extractApiError(err, 'Erro ao concluir o Design. Tente novamente.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="form-loading">Carregando planos de Design...</p>;
  }

  if (plans.length === 0) {
    const evolution = readStashedEvolution();
    return (
      <div className="design-plans-empty">
        {evolution && (
          <div className="design-evolution-banner">
            <p className="design-evolution-banner__eyebrow">Nova onda · Evolution Loop</p>
            <h2>Foco: {evolution.nextWave.focus}</h2>
            <p>{evolution.nextWave.rationale}</p>
          </div>
        )}
        <Sparkles size={32} aria-hidden />
        <h1>Design — planos de ação</h1>
        <p>
          {evolution
            ? 'Crie os planos desta nova onda com base nos aprendizados do ciclo anterior.'
            : 'Conclua o diagnóstico e escolha ações no Solution Pick (1.5) para chegar aqui.'}
        </p>
        <div className="design-plans-empty-actions">
          {evolution ? (
            <button type="button" className="design-plans-link" onClick={addPlan}>
              Criar primeiro plano da nova onda
            </button>
          ) : null}
          <Link to="/dashboard/initial-form" className="design-plans-link">
            Ir para o diagnóstico
          </Link>
        </div>
      </div>
    );
  }

  const evolutionCarryOver = readStashedEvolution();

  return (
    <div className={`design-plans-page phase-locked-shell${phaseLocked ? ' is-locked' : ''}`}>
      <header className="design-plans-header sprint-wave-header">
        <div className="sprint-wave-title-group">
          <div className="sprint-wave-icon-wrapper" aria-hidden>
            <Sparkles size={26} />
          </div>
          <div className="sprint-wave-title-copy">
            <span className="design-plans-kicker sprint-wave-eyebrow">SPRINT WAVES™ · Onda 2</span>
            <div className="design-plans-title-row">
              <h1 className="sprint-wave-title">Design</h1>
              <PhaseInfoButton title="Como usar o Design">
                <p>
                  Transforme as ações do Solution Pick em planos claros: o que a iniciativa pretende
                  alcançar e como saberão que deu certo. Iniciativas herdadas do Loop (até{' '}
                  {MAX_INHERITED_INITIATIVES}) aparecem marcadas — você decide o que validar.
                </p>
                <ul>
                  <li>
                    <strong>Iniciativa e resultado</strong> — intenção e impacto esperado
                  </li>
                  <li>
                    <strong>Critérios de sucesso</strong> — como medir que deu certo
                  </li>
                  <li>
                    <strong>Prazo</strong> — horizonte do plano
                  </li>
                </ul>
                <p>
                  Owner, Sponsor, entregas, riscos e sign-off ficam para a Difusão / Execução.
                  Valide só o que estiver pronto para avançar.
                </p>
              </PhaseInfoButton>
            </div>
            <p className="sprint-wave-subtitle">
              Defina iniciativa, resultado esperado e critérios de sucesso. Valide só o que
              estiver pronto para a Difusão.
            </p>
          </div>
        </div>
        <div className="design-plans-progress sprint-wave-side" aria-label={`${validatedCount} de ${plans.length} planos validados`}>
          <strong>
            {validatedCount}/{plans.length}
          </strong>
          <span>validados</span>
        </div>
      </header>
      <PhaseLockBanner
        phase="design"
        locks={locks}
        cycle={cycle}
        onLocksChange={setLocks}
        progress={progress}
        onProgressChange={setProgress}
      />
      {evolutionCarryOver && (
        <div className="design-evolution-banner">
          <p className="design-evolution-banner__eyebrow">Nova onda · Evolution Loop</p>
          <h2>Foco: {evolutionCarryOver.nextWave.focus}</h2>
          <p>{evolutionCarryOver.nextWave.rationale}</p>
        </div>
      )}

      <ToastStack
        toasts={[
          ...(error ? [{ id: 'error', tone: 'error' as const, message: error }] : []),
          ...(notice ? [{ id: 'notice', tone: 'success' as const, message: notice }] : []),
        ]}
        onDismiss={(id) => (id === 'error' ? setError(null) : setNotice(null))}
      />

      <div className="design-plans-workspace design-plans-workspace--single">
        <div className="design-plans-editor">
          <div className="design-plans-stack">
            {plans.map((plan, index) => (
              <article
                key={plan.localId}
                className={`design-plan-card design-plan-card--wide ${plan.validated ? 'is-validated' : ''} ${
                  activePlan?.localId === plan.localId ? 'is-active' : ''
                } ${plan.inheritedFromCycle ? 'is-inherited' : ''}`}
                onClick={() => setActivePlanId(plan.localId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setActivePlanId(plan.localId);
                }}
                role="button"
                tabIndex={0}
              >
                <div className="design-plan-card-head">
                  <div className="design-plan-card-title">
                    <span className="design-plan-index" aria-hidden>
                      {index + 1}
                    </span>
                    <h2>Plano de ação</h2>
                    {plan.inheritedFromCycle ? (
                      <span className="design-plan-inherited-badge">Herdado do ciclo anterior</span>
                    ) : null}
                  </div>
                  <div className="design-plan-card-head-meta">
                    {plan.validated && (
                      <span className="design-plan-validated">
                        <CheckCircle2 size={15} aria-hidden />
                        Validado
                      </span>
                    )}
                    {syncingId === plan.localId && (
                      <Loader2 size={14} className="spin design-plan-sync" aria-label="Sincronizando" />
                    )}
                  </div>
                </div>

                <label className="design-plan-field design-plan-field--initiative" onClick={(e) => e.stopPropagation()}>
                  <span>Iniciativa</span>
                  <input
                    value={plan.nomeIniciativa}
                    onChange={(e) => updatePlan(plan.localId, { nomeIniciativa: e.target.value })}
                  />
                </label>

                <div className="design-plan-card-body">
                  <label className="design-plan-field design-plan-field--objective" onClick={(e) => e.stopPropagation()}>
                    <span>O que esta iniciativa pretende alcançar?</span>
                    <small className="design-plan-field-hint">
                      Descreva o resultado desejado em linguagem clara — detalhes operacionais ficam na Difusão.
                    </small>
                    <textarea
                      rows={8}
                      value={plan.objetivoEspecifico}
                      onChange={(e) => updatePlan(plan.localId, { objetivoEspecifico: e.target.value })}
                      placeholder="Ex.: Reduzir retrabalho no processo X e alinhar a equipe em um ritmo semanal claro…"
                    />
                  </label>

                  <div className="design-plan-criteria" onClick={(e) => e.stopPropagation()}>
                    <div className="design-plan-criteria-head">
                      <span>Como saberemos que deu certo?</span>
                      <button
                        type="button"
                        className="design-plan-btn is-ghost"
                        onClick={() => void suggestCriteria(plan)}
                        disabled={suggestingCriteriaId === plan.localId}
                      >
                        {suggestingCriteriaId === plan.localId ? (
                          <Loader2 size={14} className="spin" aria-hidden />
                        ) : (
                          <Sparkles size={14} aria-hidden />
                        )}
                        {suggestingCriteriaId === plan.localId ? 'Gerando critérios…' : 'Sugerir critérios'}
                      </button>
                    </div>
                    {normalizeCriteria(plan.successCriteria).map((criterion, ci) => (
                      <label key={ci} className="design-plan-field">
                        <span>
                          Critério {ci + 1} · {['Resultado', 'Adoção', 'Qualidade / sustentação'][ci]}
                        </span>
                        <input
                          value={criterion}
                          onChange={(e) => {
                            const next = normalizeCriteria(plan.successCriteria);
                            next[ci] = e.target.value;
                            updatePlan(plan.localId, { successCriteria: next });
                          }}
                          placeholder={`Indicador observável ${ci + 1}`}
                        />
                      </label>
                    ))}
                  </div>

                  <aside className="design-plan-side">
                    <label className="design-plan-field" onClick={(e) => e.stopPropagation()}>
                      <span>Prazo final</span>
                      <input
                        type="date"
                        value={plan.prazoFinal}
                        onChange={(e) => updatePlan(plan.localId, { prazoFinal: e.target.value })}
                      />
                    </label>

                    <div className="design-plan-deliveries">
                      <h3>Sugestões personalizadas para você</h3>
                      <ul>
                        {plan.entregas.map((e, i) => (
                          <li key={i}>
                            {e.entrega} — {e.responsavel}, {e.prazo}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="design-plan-actions" onClick={(e) => e.stopPropagation()}>
                      {!plan.validated && (
                        <button
                          type="button"
                          className="design-plan-btn is-primary"
                          onClick={() => void validatePlan(plan.localId)}
                          disabled={syncingId === plan.localId}
                        >
                          Validar plano
                        </button>
                      )}
                      <button
                        type="button"
                        className="design-plan-btn is-danger"
                        onClick={() => void removePlan(plan.localId)}
                        aria-label="Remover plano"
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </div>
                  </aside>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <footer className="design-plans-footer">
        <button type="button" className="design-plan-btn is-ghost" onClick={addPlan}>
          <Plus size={16} aria-hidden />
          Adicionar plano
        </button>
        <div className="design-plans-footer-end">
          {pendingCount > 0 ? (
            <p className="design-plans-footer-hint" role="status">
              Falta validar <strong>{pendingCount}</strong> de {plans.length} plano
              {plans.length === 1 ? '' : 's'} para avançar com tudo sincronizado.
            </p>
          ) : (
            <p className="design-plans-footer-hint is-ready" role="status">
              Todos os {plans.length} planos validados — pronto para Difusão.
            </p>
          )}
          <div className="design-plans-footer-actions">
            {diagnosticReopenable ? (
              <button
                type="button"
                className="design-plan-btn is-ghost design-plans-reopen"
                onClick={() => setReopenDiagnosticOpen(true)}
              >
                <RotateCcw size={16} aria-hidden />
                Reabrir Diagnóstico
              </button>
            ) : null}
            {pendingCount > 0 ? (
              <button
                type="button"
                className="design-plan-btn is-ghost design-plans-skip"
                disabled={saving || phaseLocked}
                onClick={() => void concludeDesign({ skipValidation: true })}
              >
                Avançar sem validar todos
              </button>
            ) : null}
            <button
              type="button"
              className="design-plans-conclude"
              disabled={!allValidated || saving || phaseLocked}
              onClick={() => void concludeDesign()}
              title={
                pendingCount > 0
                  ? `Valide os ${pendingCount} plano(s) restantes ou use “Avançar sem validar todos”.`
                  : undefined
              }
            >
              {saving ? (
                <Loader2 size={18} className="spin" aria-hidden />
              ) : (
                <ArrowRight size={18} aria-hidden />
              )}
              Concluir Design e ir para Difusão
            </button>
          </div>
        </div>
      </footer>

      <Modal
        open={reopenDiagnosticOpen}
        onClose={() => !reopeningDiagnostic && setReopenDiagnosticOpen(false)}
        title="Reabrir Diagnóstico?"
        size="info"
        dismissLocked={reopeningDiagnostic}
      >
        <div className="phase-lock-confirm-panel">
          <p className="phase-lock-confirm-text">
            Deseja reabrir a fase <strong>Diagnóstico</strong>? O Design deixará de ser a fase
            atual e precisará ser concluído novamente para manter a consistência do projeto.
          </p>
          <label className="phase-lock-reason">
            <span>Motivo (opcional)</span>
            <textarea
              value={reopenReason}
              onChange={(event) => setReopenReason(event.target.value)}
              rows={3}
              placeholder="Por que o diagnóstico precisa ser reaberto?"
              disabled={reopeningDiagnostic}
            />
          </label>
          <div className="phase-info-actions">
            <button
              type="button"
              className="phase-info-close is-ghost"
              disabled={reopeningDiagnostic}
              onClick={() => setReopenDiagnosticOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="phase-info-close"
              disabled={reopeningDiagnostic}
              onClick={() => void handleReopenDiagnostic()}
            >
              {reopeningDiagnostic ? 'Reabrindo…' : 'Reabrir Diagnóstico'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
