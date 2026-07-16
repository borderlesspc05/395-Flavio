export type SprintPhase =
  | 'diagnostic'
  | 'solutionPick'
  | 'design'
  | 'diffusion'
  | 'domain'
  | 'loopClosed';

/** Ordem do fluxo (índice menor = mais cedo). Desbloqueio só da fase imediatamente anterior. */
export const SPRINT_PHASE_ORDER: SprintPhase[] = [
  'diagnostic',
  'solutionPick',
  'design',
  'diffusion',
  'domain',
];

export type PhaseLocks = Partial<Record<SprintPhase, boolean>>;

export function createEmptyPhaseLocks(): PhaseLocks {
  return {};
}

export function isPhaseLocked(locks: PhaseLocks | undefined, phase: SprintPhase): boolean {
  if (phase === 'loopClosed') return Boolean(locks?.loopClosed);
  return Boolean(locks?.[phase]);
}

/** Pode desbloquear `phase` se ela estiver locked e for a fase locked mais avançada (ou a única). */
export function canUnlockPhase(locks: PhaseLocks | undefined, phase: SprintPhase): boolean {
  if (!locks || phase === 'loopClosed') return false;
  // Loop contínuo encerra o ciclo de forma definitiva — sem desbloqueio
  if (locks.loopClosed) return false;
  if (!locks[phase]) return false;
  const idx = SPRINT_PHASE_ORDER.indexOf(phase);
  if (idx < 0) return false;
  // Só desbloqueia se nenhuma fase posterior estiver locked
  for (let i = idx + 1; i < SPRINT_PHASE_ORDER.length; i++) {
    if (locks[SPRINT_PHASE_ORDER[i]]) return false;
  }
  return true;
}

export function lockPhaseInState(locks: PhaseLocks | undefined, phase: SprintPhase): PhaseLocks {
  return { ...(locks ?? {}), [phase]: true };
}

export function unlockPhaseInState(locks: PhaseLocks | undefined, phase: SprintPhase): PhaseLocks {
  const next = { ...(locks ?? {}) };
  delete next[phase];
  return next;
}
