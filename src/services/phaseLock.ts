import { updateDiagnosticCycle } from './diagnosticCycles';
import type { DiagnosticCycle } from './diagnosticCycles';
import {
  canUnlockPhase,
  createEmptyPhaseLocks,
  isPhaseLocked,
  lockPhaseInState,
  normalizePhaseLocks,
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
    return normalizePhaseLocks(JSON.parse(raw) as PhaseLocks);
  } catch {
    return createEmptyPhaseLocks();
  }
}

export function writeLocalPhaseLocks(cycleId: string, locks: PhaseLocks) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(cycleId), JSON.stringify(normalizePhaseLocks(locks)));
}

function mergePhaseLocks(a: PhaseLocks, b: PhaseLocks): PhaseLocks {
  const merged: PhaseLocks = { ...a };
  for (const [key, value] of Object.entries(b) as [SprintPhase, boolean | undefined][]) {
    if (value) merged[key] = true;
  }
  return normalizePhaseLocks(merged);
}

/**
 * Lê locks do ciclo + localStorage e faz merge OR.
 * Assim, se o patch na API atrasar/falhar, o localStorage não é apagado
 * por um `phaseLocks: {}` vindo do servidor.
 */
export function getPhaseLocksFromCycle(cycle: DiagnosticCycle | null | undefined): PhaseLocks {
  if (!cycle) return createEmptyPhaseLocks();
  const fromCycle = (cycle as DiagnosticCycle & { phaseLocks?: PhaseLocks }).phaseLocks;
  const cycleLocks =
    fromCycle && typeof fromCycle === 'object' ? normalizePhaseLocks(fromCycle) : createEmptyPhaseLocks();
  const localLocks = readLocalPhaseLocks(cycle.id);
  return mergePhaseLocks(cycleLocks, localLocks);
}

export async function persistPhaseLocks(
  cycleId: string,
  locks: PhaseLocks
): Promise<PhaseLocks> {
  const normalized = normalizePhaseLocks(locks);
  writeLocalPhaseLocks(cycleId, normalized);
  try {
    await updateDiagnosticCycle(cycleId, { phaseLocks: normalized } as Partial<DiagnosticCycle>);
  } catch {
    // localStorage already updated — cycle patch may fail offline
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('mm:phase-locks-changed', {
        detail: { cycleId, locks: normalized },
      }),
    );
  }
  return normalized;
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

export { isPhaseLocked, canUnlockPhase, normalizePhaseLocks, createEmptyPhaseLocks };
export type { PhaseLocks, SprintPhase };
