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

export interface ServerDiagnosticCycle {
  id: string;
  userId: string;
  cycleNumber: number;
  label: string;
  status: CycleStatus;
  diagnosticContext: string;
  gateSummary?: string;
  formData?: Record<string, unknown>;
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
    formData: raw.formData as Record<string, unknown> | undefined,
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
    formData: payload.formData ?? null,
    createdAt: now,
  });

  const created = mapCycleDoc(ref.id, (await ref.get()).data() ?? {});
  return created;
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
