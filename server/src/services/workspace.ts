import { COLLECTIONS } from '../config/env';
import { deleteByUser, getById, remove, create, update } from './storage';
import { MAGNUS_MEMORY_COLLECTION, MagnusMemorySnapshot } from './magnusMemory';
import { logActivity } from './activities';
import { nowIso } from '../utils/id';

export interface WorkspaceResetOptions {
  objectives?: boolean;
  actionCanvases?: boolean;
  reports?: boolean;
  conversations?: boolean;
  magnusMemory?: boolean;
}

export interface WorkspaceResetResult {
  removed: Record<string, number>;
}

export async function resetWorkspaceData(
  userId: string,
  options: WorkspaceResetOptions
): Promise<WorkspaceResetResult> {
  const removed: Record<string, number> = {};

  if (options.objectives) {
    removed.objectives = await deleteByUser(COLLECTIONS.objectives, userId);
  }
  if (options.actionCanvases) {
    removed.actionCanvases = await deleteByUser(COLLECTIONS.actionCanvases, userId);
  }
  if (options.reports) {
    removed.reports = await deleteByUser(COLLECTIONS.reports, userId);
  }
  if (options.conversations) {
    removed.conversations = await deleteByUser(COLLECTIONS.conversations, userId);
  }
  if (options.magnusMemory) {
    const deleted = await remove(MAGNUS_MEMORY_COLLECTION, userId);
    removed.magnusMemory = deleted ? 1 : 0;
  }

  await logActivity(userId, 'workspace_reset', 'Dados de execução reiniciados', {
    metadata: removed,
  });

  return { removed };
}

export async function appendDiagnosticCycleToMemory(
  userId: string,
  payload: { cycleNumber: number; label: string; diagnosticContext: string }
): Promise<void> {
  const existing = await getById<MagnusMemorySnapshot>(MAGNUS_MEMORY_COLLECTION, userId);
  const header = `--- Ciclo ${payload.cycleNumber} (${payload.label}) ---`;
  const block = `${header}\n${payload.diagnosticContext.trim()}`;
  const history = [...(existing?.cycleHistory ?? []), block].slice(-12);
  const now = nowIso();

  const next: MagnusMemorySnapshot = {
    id: userId,
    userId,
    diagnosticContext: undefined,
    gateContext: undefined,
    cycleHistory: history,
    diagnosticUpdatedAt: existing?.diagnosticUpdatedAt,
    gateUpdatedAt: existing?.gateUpdatedAt,
    updatedAt: now,
  };

  if (existing) {
    await update(MAGNUS_MEMORY_COLLECTION, userId, next as unknown as Record<string, unknown>);
  } else {
    await create(MAGNUS_MEMORY_COLLECTION, userId, next as unknown as Record<string, unknown>);
  }
}
