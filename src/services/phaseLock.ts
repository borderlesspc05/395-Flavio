import { auth } from '../config/firebase';
import { api } from './api';
import { updateDiagnosticCycle, type DiagnosticCycle } from './diagnosticCycles';
import {
  canReopenPhase,
  canUnlockPhase,
  concludePhaseInState,
  createEmptyPhaseLocks,
  createInitialSprintProgress,
  getPhaseAccess,
  getPhaseAccessFromProgress,
  inferProgressFromLocks,
  isPhaseEditable,
  isPhaseLocked,
  isPathAllowedForProgress,
  locksFromProgress,
  lockPhaseInState,
  NAV_SPRINT_PHASES,
  normalizePhaseLocks,
  pathRequiresPhase,
  PHASE_LABELS,
  PHASE_PATHS,
  phasesAfter,
  reopenPhaseInState,
  toNavPhase,
  unlockPhaseInState,
  type NavSprintPhase,
  type PhaseAccess,
  type PhaseLocks,
  type SprintPhase,
  type SprintProgressState,
} from '../types/phaseLock';

const STORAGE_PREFIX = 'mm.sprintProgress.';

function storageKey(cycleId: string) {
  return `${STORAGE_PREFIX}${cycleId}`;
}

function legacyLocksKey(cycleId: string) {
  return `mm.phaseLocks.${cycleId}`;
}

export function readLocalSprintProgress(cycleId: string | null | undefined): SprintProgressState | null {
  if (!cycleId || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(cycleId));
    if (raw) {
      const parsed = JSON.parse(raw) as SprintProgressState;
      if (parsed?.sprintProgress) {
        return {
          ...createInitialSprintProgress(),
          ...parsed,
          phaseLocks: locksFromProgress(parsed.sprintProgress),
        };
      }
    }
    const legacy = window.localStorage.getItem(legacyLocksKey(cycleId));
    if (legacy) {
      const locks = normalizePhaseLocks(JSON.parse(legacy) as PhaseLocks);
      const progress = inferProgressFromLocks(locks);
      return {
        sprintProgress: progress,
        phaseCompletions: {},
        phaseEvents: [],
        reopenedPhase: null,
        phaseLocks: locksFromProgress(progress),
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function writeLocalSprintProgress(cycleId: string, state: SprintProgressState) {
  if (typeof window === 'undefined') return;
  const normalized: SprintProgressState = {
    ...state,
    phaseLocks: locksFromProgress(state.sprintProgress),
  };
  window.localStorage.setItem(storageKey(cycleId), JSON.stringify(normalized));
  window.localStorage.setItem(legacyLocksKey(cycleId), JSON.stringify(normalized.phaseLocks));
}

export function getSprintProgressFromCycle(
  cycle: DiagnosticCycle | null | undefined,
): SprintProgressState {
  if (!cycle) return createInitialSprintProgress();

  const local = readLocalSprintProgress(cycle.id);

  if (cycle.sprintProgress) {
    const server: SprintProgressState = {
      sprintProgress: cycle.sprintProgress,
      phaseCompletions: cycle.phaseCompletions ?? {},
      phaseEvents: cycle.phaseEvents ?? [],
      reopenedPhase: cycle.reopenedPhase ?? null,
      phaseLocks: locksFromProgress(cycle.sprintProgress),
    };
    // Prefer server progress; merge events if local has more (offline)
    if (
      local &&
      (local.phaseEvents?.length ?? 0) > (server.phaseEvents?.length ?? 0) &&
      local.sprintProgress
    ) {
      // If local is "behind" in progress index terms, still prefer server for security;
      // only keep local if server has no events yet
      if ((server.phaseEvents?.length ?? 0) === 0) return local;
    }
    return server;
  }

  if (local) return local;

  const locks = cycle.phaseLocks ?? createEmptyPhaseLocks();
  const progress = inferProgressFromLocks(locks);
  return {
    sprintProgress: progress,
    phaseCompletions: {},
    phaseEvents: [],
    reopenedPhase: null,
    phaseLocks: locksFromProgress(progress),
  };
}

/** Compat: locks derivados do progresso. */
export function getPhaseLocksFromCycle(cycle: DiagnosticCycle | null | undefined): PhaseLocks {
  return getSprintProgressFromCycle(cycle).phaseLocks;
}

export function readLocalPhaseLocks(cycleId: string | null | undefined): PhaseLocks {
  const state = readLocalSprintProgress(cycleId);
  return state?.phaseLocks ?? createEmptyPhaseLocks();
}

export function writeLocalPhaseLocks(cycleId: string, locks: PhaseLocks) {
  const progress = inferProgressFromLocks(locks);
  writeLocalSprintProgress(cycleId, {
    sprintProgress: progress,
    phaseCompletions: {},
    phaseEvents: [],
    reopenedPhase: null,
    phaseLocks: locksFromProgress(progress),
  });
}

function emitProgressChanged(cycleId: string, state: SprintProgressState) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('mm:phase-locks-changed', {
      detail: {
        cycleId,
        locks: state.phaseLocks,
        progress: state,
      },
    }),
  );
}

export async function persistSprintProgress(
  cycleId: string,
  state: SprintProgressState,
): Promise<SprintProgressState> {
  const normalized: SprintProgressState = {
    ...state,
    phaseLocks: locksFromProgress(state.sprintProgress),
  };
  writeLocalSprintProgress(cycleId, normalized);
  try {
    await updateDiagnosticCycle(cycleId, {
      sprintProgress: normalized.sprintProgress,
      phaseCompletions: normalized.phaseCompletions,
      phaseEvents: normalized.phaseEvents,
      reopenedPhase: normalized.reopenedPhase ?? null,
      phaseLocks: normalized.phaseLocks,
    });
  } catch {
    // local already updated
  }
  emitProgressChanged(cycleId, normalized);
  return normalized;
}

function currentUserId(): string {
  return auth.currentUser?.uid ?? auth.currentUser?.email ?? 'unknown';
}

export async function concludeSprintPhase(
  cycle: DiagnosticCycle | null | undefined,
  phase: SprintPhase,
): Promise<{ ok: boolean; state: SprintProgressState; message?: string; nextPath?: string }> {
  const nav = toNavPhase(phase);
  if (!cycle) {
    const initial = createInitialSprintProgress();
    const result = concludePhaseInState(initial, nav, currentUserId());
    if (!result.ok) return { ok: false, state: initial, message: result.message };
    return {
      ok: true,
      state: result.state,
      nextPath: PHASE_PATHS[result.state.sprintProgress],
    };
  }

  const current = getSprintProgressFromCycle(cycle);

  // Prefer API when online
  try {
    const res = await api.post<DiagnosticCycle>(`/api/cycles/${cycle.id}/phases/conclude`, {
      phase: nav,
    });
    const state = getSprintProgressFromCycle(res.data);
    writeLocalSprintProgress(cycle.id, state);
    emitProgressChanged(cycle.id, state);
    return {
      ok: true,
      state,
      nextPath: PHASE_PATHS[state.sprintProgress],
    };
  } catch {
    // fallback local
  }

  const result = concludePhaseInState(current, nav, currentUserId());
  if (!result.ok) {
    return { ok: false, state: current, message: result.message };
  }
  await persistSprintProgress(cycle.id, result.state);
  return {
    ok: true,
    state: result.state,
    nextPath: PHASE_PATHS[result.state.sprintProgress],
  };
}

export async function reopenSprintPhase(
  cycle: DiagnosticCycle | null | undefined,
  phase: SprintPhase,
  reason?: string,
): Promise<{ ok: boolean; state: SprintProgressState; message?: string; nextPath?: string }> {
  const nav = toNavPhase(phase);
  if (!cycle) {
    return {
      ok: false,
      state: createInitialSprintProgress(),
      message: 'Nenhum ciclo ativo.',
    };
  }

  const current = getSprintProgressFromCycle(cycle);

  try {
    const res = await api.post<DiagnosticCycle>(`/api/cycles/${cycle.id}/phases/reopen`, {
      phase: nav,
      reason: reason?.trim() || undefined,
    });
    const state = getSprintProgressFromCycle(res.data);
    writeLocalSprintProgress(cycle.id, state);
    emitProgressChanged(cycle.id, state);
    return {
      ok: true,
      state,
      nextPath: PHASE_PATHS[state.sprintProgress],
    };
  } catch {
    // fallback local
  }

  const result = reopenPhaseInState(current, nav, currentUserId(), reason);
  if (!result.ok) {
    return { ok: false, state: current, message: result.message };
  }
  await persistSprintProgress(cycle.id, result.state);
  return {
    ok: true,
    state: result.state,
    nextPath: PHASE_PATHS[result.state.sprintProgress],
  };
}

/** @deprecated Prefer concludeSprintPhase — mantido para callers legados. */
export async function lockSprintPhase(
  cycle: DiagnosticCycle | null | undefined,
  phase: SprintPhase,
): Promise<PhaseLocks> {
  const result = await concludeSprintPhase(cycle, phase);
  return result.state.phaseLocks;
}

/** @deprecated Prefer reopenSprintPhase. */
export async function unlockSprintPhase(
  cycle: DiagnosticCycle | null | undefined,
  phase: SprintPhase,
): Promise<{ ok: boolean; locks: PhaseLocks; message?: string; state?: SprintProgressState }> {
  const result = await reopenSprintPhase(cycle, phase);
  return {
    ok: result.ok,
    locks: result.state.phaseLocks,
    message: result.message,
    state: result.state,
  };
}

export async function persistPhaseLocks(
  cycleId: string,
  locks: PhaseLocks,
): Promise<PhaseLocks> {
  const progress = inferProgressFromLocks(locks);
  const state = await persistSprintProgress(cycleId, {
    sprintProgress: progress,
    phaseCompletions: {},
    phaseEvents: [],
    reopenedPhase: null,
    phaseLocks: locksFromProgress(progress),
  });
  return state.phaseLocks;
}

export {
  canReopenPhase,
  canUnlockPhase,
  createEmptyPhaseLocks,
  createInitialSprintProgress,
  getPhaseAccess,
  getPhaseAccessFromProgress,
  inferProgressFromLocks,
  isPhaseEditable,
  isPhaseLocked,
  isPathAllowedForProgress,
  locksFromProgress,
  lockPhaseInState,
  NAV_SPRINT_PHASES,
  normalizePhaseLocks,
  pathRequiresPhase,
  phasesAfter,
  PHASE_LABELS,
  PHASE_PATHS,
  toNavPhase,
  unlockPhaseInState,
};

export type {
  NavSprintPhase,
  PhaseAccess,
  PhaseLocks,
  SprintPhase,
  SprintProgressState,
};
