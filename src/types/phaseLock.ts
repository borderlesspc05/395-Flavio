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

/**
 * Cascata de conclusão:
 * - Ao travar uma fase, todas as anteriores ficam travadas.
 * - Se uma fase posterior estiver travada, as anteriores também ficam.
 * - Loop contínuo fechado trava o ciclo inteiro.
 */
export function normalizePhaseLocks(locks: PhaseLocks | undefined): PhaseLocks {
  const next: PhaseLocks = { ...(locks ?? {}) };

  if (next.loopClosed) {
    for (const phase of SPRINT_PHASE_ORDER) {
      next[phase] = true;
    }
    next.loopClosed = true;
    return next;
  }

  // Se uma fase avançada está travada, trava tudo que veio antes.
  let laterLocked = false;
  for (let i = SPRINT_PHASE_ORDER.length - 1; i >= 0; i--) {
    const phase = SPRINT_PHASE_ORDER[i];
    if (next[phase] || laterLocked) {
      next[phase] = true;
      laterLocked = true;
    }
  }

  return next;
}

export function isPhaseLocked(locks: PhaseLocks | undefined, phase: SprintPhase): boolean {
  const normalized = normalizePhaseLocks(locks);
  if (phase === 'loopClosed') return Boolean(normalized.loopClosed);
  return Boolean(normalized[phase]);
}

/** Pode desbloquear `phase` se ela estiver locked e for a fase locked mais avançada (ou a única). */
export function canUnlockPhase(locks: PhaseLocks | undefined, phase: SprintPhase): boolean {
  if (!locks || phase === 'loopClosed') return false;
  const normalized = normalizePhaseLocks(locks);
  if (normalized.loopClosed) return false;
  if (!normalized[phase]) return false;
  const idx = SPRINT_PHASE_ORDER.indexOf(phase);
  if (idx < 0) return false;
  for (let i = idx + 1; i < SPRINT_PHASE_ORDER.length; i++) {
    if (normalized[SPRINT_PHASE_ORDER[i]]) return false;
  }
  return true;
}

export function lockPhaseInState(locks: PhaseLocks | undefined, phase: SprintPhase): PhaseLocks {
  const next: PhaseLocks = { ...(locks ?? {}) };

  if (phase === 'loopClosed') {
    for (const item of SPRINT_PHASE_ORDER) {
      next[item] = true;
    }
    next.loopClosed = true;
    return normalizePhaseLocks(next);
  }

  const idx = SPRINT_PHASE_ORDER.indexOf(phase);
  if (idx >= 0) {
    for (let i = 0; i <= idx; i++) {
      next[SPRINT_PHASE_ORDER[i]] = true;
    }
  } else {
    next[phase] = true;
  }

  return normalizePhaseLocks(next);
}

export function unlockPhaseInState(locks: PhaseLocks | undefined, phase: SprintPhase): PhaseLocks {
  const next = { ...(locks ?? {}) };
  delete next[phase];
  return normalizePhaseLocks(next);
}
