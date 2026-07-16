import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { buildDiagnosticContext } from '../constants/diagnosticFlow';
import { buildGateContextAppendix, type BlueprintPath } from '../constants/blueprintFlow';
import { db } from '../config/firebase';
import { api } from './api';
import { getBlueprintGate, saveBlueprintGateSelection, clearBlueprintGate } from './blueprintGate';
import { clearInitialForm, getInitialForm, saveInitialFormDraft } from './initialForm';
import type { InitialFormData } from '../types';
import type { PhaseLocks } from '../types/phaseLock';

export type CycleStatus = 'draft' | 'active' | 'archived';

export interface DiagnosticCycle {
  id: string;
  userId: string;
  cycleNumber: number;
  label: string;
  status: CycleStatus;
  diagnosticContext: string;
  gateSummary?: string;
  gatePath?: BlueprintPath;
  gateRationale?: string;
  formData?: InitialFormData;
  /** Travamento das fases do Sprint Waves (persistido no ciclo) */
  phaseLocks?: PhaseLocks;
  completedAt?: string;
  createdAt: string;
  archivedAt?: string;
}

function toDate(value: unknown): Date | null {
  if (value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

function mapCycleDoc(id: string, raw: Record<string, unknown>): DiagnosticCycle {
  const createdAt = toDate(raw.createdAt) ?? toDate(raw.archivedAt) ?? new Date();
  const archivedAt = toDate(raw.archivedAt);
  return {
    id,
    userId: String(raw.userId),
    cycleNumber: Number(raw.cycleNumber) || 1,
    label: String(raw.label ?? `Ciclo ${raw.cycleNumber ?? 1}`),
    status: (raw.status as CycleStatus) || 'archived',
    diagnosticContext: String(raw.diagnosticContext ?? ''),
    gateSummary: raw.gateSummary ? String(raw.gateSummary) : undefined,
    gatePath: raw.gatePath === 'A' || raw.gatePath === 'B' ? raw.gatePath : undefined,
    gateRationale: raw.gateRationale ? String(raw.gateRationale) : undefined,
    formData: raw.formData as InitialFormData | undefined,
    phaseLocks:
      raw.phaseLocks && typeof raw.phaseLocks === 'object'
        ? (raw.phaseLocks as PhaseLocks)
        : undefined,
    completedAt: raw.completedAt ? String(raw.completedAt) : undefined,
    createdAt: createdAt.toISOString(),
    archivedAt: archivedAt ? archivedAt.toISOString() : undefined,
  };
}

async function listDiagnosticCyclesFromFirestore(userId: string): Promise<DiagnosticCycle[]> {
  const q = query(collection(db, 'diagnosticCycles'), where('userId', '==', userId));
  const snap = await getDocs(q);
  const items = snap.docs.map((d) => mapCycleDoc(d.id, d.data() as Record<string, unknown>));
  return items.sort((a, b) => b.cycleNumber - a.cycleNumber);
}

export async function listDiagnosticCycles(userId: string): Promise<DiagnosticCycle[]> {
  try {
    const res = await api.get<DiagnosticCycle[]>('/api/cycles');
    const items = Array.isArray(res.data) ? res.data : [];
    return items.sort((a, b) => b.cycleNumber - a.cycleNumber);
  } catch {
    return listDiagnosticCyclesFromFirestore(userId);
  }
}

export async function getDiagnosticCycle(cycleId: string): Promise<DiagnosticCycle | null> {
  const ref = doc(db, 'diagnosticCycles', cycleId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return mapCycleDoc(snap.id, snap.data() as Record<string, unknown>);
}

export async function deleteDiagnosticCycle(cycleId: string, userId: string): Promise<void> {
  const cycle = await getDiagnosticCycle(cycleId);
  if (!cycle || cycle.userId !== userId) {
    throw new Error('Processo não encontrado ou sem permissão para excluir.');
  }
  await api.delete(`/api/cycles/${cycleId}`);
}

export async function createDiagnosticCycle(
  _userId: string,
  payload: Partial<Pick<DiagnosticCycle, 'label' | 'status' | 'diagnosticContext' | 'gateSummary' | 'formData'>> & {
    archiveCycleId?: string;
  }
): Promise<DiagnosticCycle> {
  try {
    const res = await api.post<DiagnosticCycle>('/api/cycles', {
      label: payload.label,
      status: payload.status ?? 'draft',
      diagnosticContext: payload.diagnosticContext ?? '',
      gateSummary: payload.gateSummary,
      formData: payload.formData,
      archiveCycleId: payload.archiveCycleId,
    });
    return res.data;
  } catch (err) {
    const message =
      err &&
      typeof err === 'object' &&
      'response' in err &&
      (err as { response?: { data?: { message?: string } } }).response?.data?.message;
    if (typeof message === 'string' && message) {
      throw new Error(message);
    }
    throw err;
  }
}

function withoutUndefined(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

export async function updateDiagnosticCycle(
  cycleId: string,
  patch: Partial<
    Pick<
      DiagnosticCycle,
      | 'label'
      | 'status'
      | 'diagnosticContext'
      | 'gateSummary'
      | 'gatePath'
      | 'gateRationale'
      | 'formData'
      | 'phaseLocks'
    >
  > & {
    archivedAt?: string | true;
    completedAt?: string | null;
  },
): Promise<void> {
  const { archivedAt, ...rest } = patch;
  const data = withoutUndefined({ ...rest, ...(archivedAt ? { archivedAt: true } : {}) });
  if (Object.keys(data).length === 0) return;
  await api.patch(`/api/cycles/${cycleId}`, data);
}

export async function snapshotFormIntoCycle(cycleId: string, userId: string): Promise<void> {
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

  await updateDiagnosticCycle(cycleId, {
    formData: data,
    diagnosticContext,
    ...(gateSummary ? { gateSummary } : {}),
    ...(gate?.selectedPath ? { gatePath: gate.selectedPath } : {}),
    ...(gate?.rationale ? { gateRationale: gate.rationale } : {}),
    ...(completedAt ? { completedAt: completedAt.toISOString() } : {}),
    status: completedAt ? 'active' : diagnosticContext.trim() ? 'draft' : 'draft',
  });
}

export async function loadCycleIntoWorkspace(cycle: DiagnosticCycle, userId: string): Promise<void> {
  if (cycle.formData) {
    await saveInitialFormDraft(userId, cycle.formData);
  } else {
    await clearInitialForm(userId);
  }

  if (cycle.gatePath) {
    await saveBlueprintGateSelection(userId, {
      selectedPath: cycle.gatePath,
      rationale: cycle.gateRationale,
    });
  } else {
    await clearBlueprintGate(userId);
  }
}

export async function archiveDiagnosticCycle(
  _userId: string,
  payload: { diagnosticContext: string; gateSummary?: string; formData?: InitialFormData }
): Promise<{ cycleNumber: number; label: string; id: string }> {
  const created = await createDiagnosticCycle(_userId, {
    status: 'archived',
    diagnosticContext: payload.diagnosticContext.trim(),
    gateSummary: payload.gateSummary?.trim() || undefined,
    formData: payload.formData ?? undefined,
  });
  return { cycleNumber: created.cycleNumber, label: created.label, id: created.id };
}
