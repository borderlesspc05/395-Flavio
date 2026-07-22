import { AppError } from '../utils/errors';
import { getFirestore, isFirebaseEnabled } from './firebase';
import { getPlanIdForUser } from './subscriptions';
import { PLANS } from './plans';
import {
  assertCanAddOpenCycle,
  countOpenCycles,
  getMaxOpenCyclesForUser,
  type CycleStatus,
} from './cyclePolicy';
import {
  concludePhaseInState,
  createInitialSprintProgress,
  isNavPhase,
  reopenPhaseInState,
  resolveSprintProgress,
  type NavSprintPhase,
  type PhaseCompletions,
  type PhaseEvent,
  type SprintProgressState,
} from './sprintPhaseProgress';

export interface ServerDiagnosticCycle {
  id: string;
  userId: string;
  cycleNumber: number;
  label: string;
  status: CycleStatus;
  diagnosticContext: string;
  gateSummary?: string;
  gatePath?: 'A' | 'B';
  gateRationale?: string;
  formData?: Record<string, unknown>;
  phaseLocks?: Record<string, boolean>;
  sprintProgress?: NavSprintPhase;
  phaseCompletions?: PhaseCompletions;
  phaseEvents?: PhaseEvent[];
  reopenedPhase?: NavSprintPhase | null;
  completedAt?: string;
  createdAt: string;
  archivedAt?: string;
}

function mapCycleDoc(id: string, raw: Record<string, unknown>): ServerDiagnosticCycle {
  const createdAt =
    (raw.createdAt as { toDate?: () => Date })?.toDate?.()?.toISOString?.() ??
    (typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString());
  const archivedAt = (raw.archivedAt as { toDate?: () => Date })?.toDate?.()?.toISOString?.();
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
    formData: raw.formData as Record<string, unknown> | undefined,
    phaseLocks:
      raw.phaseLocks && typeof raw.phaseLocks === 'object'
        ? (raw.phaseLocks as Record<string, boolean>)
        : undefined,
    sprintProgress: isNavPhase(raw.sprintProgress) ? raw.sprintProgress : undefined,
    phaseCompletions:
      raw.phaseCompletions && typeof raw.phaseCompletions === 'object'
        ? (raw.phaseCompletions as PhaseCompletions)
        : undefined,
    phaseEvents: Array.isArray(raw.phaseEvents) ? (raw.phaseEvents as PhaseEvent[]) : undefined,
    reopenedPhase:
      raw.reopenedPhase === null
        ? null
        : isNavPhase(raw.reopenedPhase)
          ? raw.reopenedPhase
          : undefined,
    completedAt: raw.completedAt ? String(raw.completedAt) : undefined,
    createdAt,
    archivedAt,
  };
}

export async function listDiagnosticCyclesForUser(userId: string): Promise<ServerDiagnosticCycle[]> {
  const db = getFirestore();
  if (!db || !isFirebaseEnabled()) {
    throw new AppError(503, 'Armazenamento indisponível para validar ciclos.');
  }

  const snap = await db.collection('diagnosticCycles').where('userId', '==', userId).get();
  return snap.docs
    .map((d) => mapCycleDoc(d.id, d.data()))
    .sort((a, b) => b.cycleNumber - a.cycleNumber);
}

export async function createDiagnosticCycleForUser(
  userId: string,
  payload: {
    label?: string;
    status?: CycleStatus;
    diagnosticContext?: string;
    gateSummary?: string;
    gatePath?: 'A' | 'B';
    gateRationale?: string;
    formData?: Record<string, unknown>;
    archiveCycleId?: string;
  }
): Promise<ServerDiagnosticCycle> {
  const db = getFirestore();
  if (!db || !isFirebaseEnabled()) {
    throw new AppError(503, 'Armazenamento indisponível para criar projetos.');
  }

  const existing = await listDiagnosticCyclesForUser(userId);
  const maxOpen = await getMaxOpenCyclesForUser(userId);
  const planId = await getPlanIdForUser(userId);
  const planName = PLANS[planId].name;

  assertCanAddOpenCycle(existing.length, maxOpen, planName);

  const cycleNumber =
    existing.length > 0 ? Math.max(...existing.map((c) => c.cycleNumber)) + 1 : 1;
  const label =
    payload.label?.trim() ||
    `Ciclo ${cycleNumber} · ${new Date().toLocaleDateString('pt-BR')}`;

  const ref = db.collection('diagnosticCycles').doc();
  const now = new Date();
  await ref.set({
    userId,
    cycleNumber,
    label,
    status: payload.status ?? 'draft',
    diagnosticContext: payload.diagnosticContext?.trim() ?? '',
    gateSummary: payload.gateSummary?.trim() || null,
    gatePath: payload.gatePath ?? null,
    gateRationale: payload.gateRationale?.trim() || null,
    formData: payload.formData ?? null,
    sprintProgress: 'diagnostic',
    phaseCompletions: {},
    phaseEvents: [],
    reopenedPhase: null,
    phaseLocks: {},
    createdAt: now,
    archivedAt: payload.status === 'archived' ? now : null,
  });

  const created = mapCycleDoc(ref.id, (await ref.get()).data() ?? {});
  return created;
}

export async function getDiagnosticCycleForUser(
  userId: string,
  cycleId: string
): Promise<ServerDiagnosticCycle | null> {
  const db = getFirestore();
  if (!db || !isFirebaseEnabled()) {
    throw new AppError(503, 'Armazenamento indisponível para consultar projetos.');
  }

  const snap = await db.collection('diagnosticCycles').doc(cycleId).get();
  if (!snap.exists) return null;
  const cycle = mapCycleDoc(snap.id, snap.data() ?? {});
  if (cycle.userId !== userId) return null;
  return cycle;
}

export async function updateDiagnosticCycleForUser(
  userId: string,
  cycleId: string,
  patch: Partial<{
    label: string;
    status: CycleStatus;
    diagnosticContext: string;
    gateSummary: string;
    gatePath: 'A' | 'B';
    gateRationale: string;
    formData: Record<string, unknown>;
    phaseLocks: Record<string, boolean>;
    sprintProgress: NavSprintPhase;
    phaseCompletions: PhaseCompletions;
    phaseEvents: PhaseEvent[];
    reopenedPhase: NavSprintPhase | null;
    completedAt: string | null;
    archivedAt: string | true;
  }>
): Promise<ServerDiagnosticCycle> {
  const db = getFirestore();
  if (!db || !isFirebaseEnabled()) {
    throw new AppError(503, 'Armazenamento indisponível para atualizar projetos.');
  }

  const existing = await getDiagnosticCycleForUser(userId, cycleId);
  if (!existing) {
    throw new AppError(404, 'Processo não encontrado.');
  }

  const ref = db.collection('diagnosticCycles').doc(cycleId);
  const next: Record<string, unknown> = {};

  if (patch.label !== undefined) next.label = patch.label.trim();
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.diagnosticContext !== undefined) next.diagnosticContext = patch.diagnosticContext.trim();
  if (patch.gateSummary !== undefined) next.gateSummary = patch.gateSummary.trim() || null;
  if (patch.gatePath !== undefined) next.gatePath = patch.gatePath;
  if (patch.gateRationale !== undefined) next.gateRationale = patch.gateRationale.trim() || null;
  if (patch.formData !== undefined) next.formData = patch.formData;
  // phaseLocks / sprintProgress via PATCH genérico: aceita sync do cliente após conclude/reopen local
  if (patch.phaseLocks !== undefined) next.phaseLocks = patch.phaseLocks;
  if (patch.sprintProgress !== undefined) next.sprintProgress = patch.sprintProgress;
  if (patch.phaseCompletions !== undefined) next.phaseCompletions = patch.phaseCompletions;
  if (patch.phaseEvents !== undefined) next.phaseEvents = patch.phaseEvents;
  if (patch.reopenedPhase !== undefined) next.reopenedPhase = patch.reopenedPhase;
  if (patch.completedAt !== undefined) next.completedAt = patch.completedAt;
  if (patch.archivedAt || patch.status === 'archived') {
    next.archivedAt = new Date();
  }

  if (Object.keys(next).length > 0) {
    await ref.update(next);
  }

  return (await getDiagnosticCycleForUser(userId, cycleId)) ?? existing;
}

function cycleToProgressState(cycle: ServerDiagnosticCycle): SprintProgressState {
  return resolveSprintProgress({
    sprintProgress: cycle.sprintProgress,
    phaseLocks: cycle.phaseLocks,
    phaseCompletions: cycle.phaseCompletions,
    phaseEvents: cycle.phaseEvents,
    reopenedPhase: cycle.reopenedPhase,
  });
}

async function persistProgressState(
  userId: string,
  cycleId: string,
  state: SprintProgressState,
): Promise<ServerDiagnosticCycle> {
  return updateDiagnosticCycleForUser(userId, cycleId, {
    sprintProgress: state.sprintProgress,
    phaseCompletions: state.phaseCompletions,
    phaseEvents: state.phaseEvents,
    reopenedPhase: state.reopenedPhase ?? null,
    phaseLocks: state.phaseLocks,
  });
}

export async function concludeCyclePhaseForUser(
  userId: string,
  cycleId: string,
  phase: NavSprintPhase,
): Promise<ServerDiagnosticCycle> {
  const existing = await getDiagnosticCycleForUser(userId, cycleId);
  if (!existing) throw new AppError(404, 'Processo não encontrado.');

  const current = cycleToProgressState(existing);
  const result = concludePhaseInState(current, phase, userId);
  if (!result.ok) throw new AppError(400, result.message);

  return persistProgressState(userId, cycleId, result.state);
}

export async function reopenCyclePhaseForUser(
  userId: string,
  cycleId: string,
  phase: NavSprintPhase,
  reason?: string,
): Promise<ServerDiagnosticCycle> {
  const existing = await getDiagnosticCycleForUser(userId, cycleId);
  if (!existing) throw new AppError(404, 'Processo não encontrado.');

  const current = cycleToProgressState(existing);
  const result = reopenPhaseInState(current, phase, userId, reason);
  if (!result.ok) throw new AppError(400, result.message);

  return persistProgressState(userId, cycleId, result.state);
}

export { createInitialSprintProgress };

export async function deleteDiagnosticCycleForUser(userId: string, cycleId: string): Promise<void> {
  const db = getFirestore();
  if (!db || !isFirebaseEnabled()) {
    throw new AppError(503, 'Armazenamento indisponível para excluir projetos.');
  }

  const existing = await getDiagnosticCycleForUser(userId, cycleId);
  if (!existing) {
    throw new AppError(404, 'Processo não encontrado.');
  }

  await db.collection('diagnosticCycles').doc(cycleId).delete();
}

export async function getCycleQuotaForUser(userId: string): Promise<{
  openCount: number;
  maxOpenCycles: number | null;
  canCreate: boolean;
}> {
  const existing = await listDiagnosticCyclesForUser(userId).catch(() => []);
  const openCount = countOpenCycles(existing);
  const maxOpenCycles = await getMaxOpenCyclesForUser(userId);
  const canCreate = maxOpenCycles === null || existing.length < maxOpenCycles;
  return { openCount, maxOpenCycles, canCreate };
}
