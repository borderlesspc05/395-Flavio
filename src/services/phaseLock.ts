import { updateDiagnosticCycle } from './diagnosticCycles';
import type { DiagnosticCycle } from './diagnosticCycles';
import {
  canUnlockPhase,
  createEmptyPhaseLocks,
  isPhaseLocked,
  lockPhaseInState,
  unlockPhaseInState,
  type PhaseLocks,
  type SprintPhase,
} from '../types/phaseLock';

const STORAGE_PREFIX = 'mm.phaseLocks.';

function storageKey(cycleId: string) {
  return `${STORAGE_PREFIX}${cycleId}`;
}

export function readLocalPhaseLocks(cycleId: string | null | undefined): PhaseLocks {
  if (!cycleId || typeof window === 'undefined') return createEmptyPhaseLocks();
  try {
    const raw = window.localStorage.getItem(storageKey(cycleId));
    if (!raw) return createEmptyPhaseLocks();
    return JSON.parse(raw) as PhaseLocks;
  } catch {
    return createEmptyPhaseLocks();
  }
}

export function writeLocalPhaseLocks(cycleId: string, locks: PhaseLocks) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(cycleId), JSON.stringify(locks));
}

export function getPhaseLocksFromCycle(cycle: DiagnosticCycle | null | undefined): PhaseLocks {
  if (!cycle) return createEmptyPhaseLocks();
  const fromCycle = (cycle as DiagnosticCycle & { phaseLocks?: PhaseLocks }).phaseLocks;
  if (fromCycle && typeof fromCycle === 'object') return { ...fromCycle };
  return readLocalPhaseLocks(cycle.id);
}

export async function persistPhaseLocks(
  cycleId: string,
  locks: PhaseLocks
): Promise<PhaseLocks> {
  writeLocalPhaseLocks(cycleId, locks);
  try {
    await updateDiagnosticCycle(cycleId, { phaseLocks: locks } as Partial<DiagnosticCycle>);
  } catch {
    // localStorage already updated — cycle patch may fail offline
  }
  return locks;
}

export async function lockSprintPhase(
  cycle: DiagnosticCycle | null | undefined,
  phase: SprintPhase
): Promise<PhaseLocks> {
  if (!cycle) {
    const locks = lockPhaseInState(undefined, phase);
    return locks;
  }
  const current = getPhaseLocksFromCycle(cycle);
  const next = lockPhaseInState(current, phase);
  return persistPhaseLocks(cycle.id, next);
}

export async function unlockSprintPhase(
  cycle: DiagnosticCycle | null | undefined,
  phase: SprintPhase
): Promise<{ ok: boolean; locks: PhaseLocks; message?: string }> {
  if (!cycle) {
    return { ok: false, locks: createEmptyPhaseLocks(), message: 'Nenhum ciclo ativo.' };
  }
  if (phase === 'loopClosed') {
    return {
      ok: false,
      locks: getPhaseLocksFromCycle(cycle),
      message: 'O Loop contínuo encerra o ciclo de forma definitiva.',
    };
  }
  const current = getPhaseLocksFromCycle(cycle);
  if (!canUnlockPhase(current, phase)) {
    return {
      ok: false,
      locks: current,
      message:
        'Desbloqueie primeiro a fase seguinte (de trás para frente). Só é possível liberar uma etapa por vez.',
    };
  }
  const next = unlockPhaseInState(current, phase);
  await persistPhaseLocks(cycle.id, next);
  return { ok: true, locks: next };
}

export { isPhaseLocked, canUnlockPhase };
export type { PhaseLocks, SprintPhase };
