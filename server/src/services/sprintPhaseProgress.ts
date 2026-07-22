/**
 * Lógica de progresso sequencial do Sprint (server-side).
 * Espelha as regras de src/types/phaseLock.ts
 */

export type NavSprintPhase = 'diagnostic' | 'design' | 'diffusion' | 'domain' | 'loopClosed';

export const NAV_SPRINT_PHASES: NavSprintPhase[] = [
  'diagnostic',
  'design',
  'diffusion',
  'domain',
];

export const PHASE_LABELS: Record<NavSprintPhase, string> = {
  diagnostic: 'Diagnóstico',
  design: 'Design',
  diffusion: 'Difusão',
  domain: 'Domínio',
  loopClosed: 'Loop contínuo',
};

export type PhaseLocks = Record<string, boolean>;

export interface PhaseCompletionMeta {
  completedAt: string;
  completedBy: string;
}

export type PhaseCompletions = Partial<Record<NavSprintPhase, PhaseCompletionMeta>>;

export interface PhaseEvent {
  type: 'conclude' | 'reopen';
  phase: NavSprintPhase;
  at: string;
  by: string;
  reason?: string;
  invalidatedPhases?: NavSprintPhase[];
}

export interface SprintProgressState {
  sprintProgress: NavSprintPhase;
  phaseCompletions: PhaseCompletions;
  phaseEvents: PhaseEvent[];
  reopenedPhase?: NavSprintPhase | null;
  phaseLocks: PhaseLocks;
}

const VALID_NAV = new Set<string>([...NAV_SPRINT_PHASES, 'loopClosed']);

export function isNavPhase(value: unknown): value is NavSprintPhase {
  return typeof value === 'string' && VALID_NAV.has(value);
}

export function createInitialSprintProgress(): SprintProgressState {
  return {
    sprintProgress: 'diagnostic',
    phaseCompletions: {},
    phaseEvents: [],
    reopenedPhase: null,
    phaseLocks: {},
  };
}

function navPhaseIndex(phase: NavSprintPhase): number {
  if (phase === 'loopClosed') return NAV_SPRINT_PHASES.length;
  return NAV_SPRINT_PHASES.indexOf(phase);
}

export function locksFromProgress(progress: NavSprintPhase): PhaseLocks {
  const locks: PhaseLocks = {};
  if (progress === 'loopClosed') {
    for (const p of NAV_SPRINT_PHASES) locks[p] = true;
    locks.solutionPick = true;
    locks.loopClosed = true;
    return locks;
  }
  const idx = navPhaseIndex(progress);
  for (let i = 0; i < idx; i++) {
    const p = NAV_SPRINT_PHASES[i];
    locks[p] = true;
    if (p === 'diagnostic') locks.solutionPick = true;
  }
  return locks;
}

export function inferProgressFromLocks(locks: PhaseLocks | undefined): NavSprintPhase {
  if (!locks || Object.keys(locks).length === 0) return 'diagnostic';
  if (locks.loopClosed) return 'loopClosed';
  for (const phase of NAV_SPRINT_PHASES) {
    const locked =
      phase === 'diagnostic'
        ? Boolean(locks.diagnostic || locks.solutionPick)
        : Boolean(locks[phase]);
    if (!locked) return phase;
  }
  return 'domain';
}

export function resolveSprintProgress(raw: {
  sprintProgress?: unknown;
  phaseLocks?: PhaseLocks;
  phaseCompletions?: PhaseCompletions;
  phaseEvents?: PhaseEvent[];
  reopenedPhase?: unknown;
}): SprintProgressState {
  const progress = isNavPhase(raw.sprintProgress)
    ? raw.sprintProgress
    : inferProgressFromLocks(raw.phaseLocks);
  return {
    sprintProgress: progress,
    phaseCompletions: raw.phaseCompletions ?? {},
    phaseEvents: Array.isArray(raw.phaseEvents) ? raw.phaseEvents : [],
    reopenedPhase: isNavPhase(raw.reopenedPhase) ? raw.reopenedPhase : null,
    phaseLocks: locksFromProgress(progress),
  };
}

function nextPhaseAfter(phase: NavSprintPhase): NavSprintPhase {
  if (phase === 'loopClosed') return 'loopClosed';
  if (phase === 'domain') return 'loopClosed';
  const idx = navPhaseIndex(phase);
  return NAV_SPRINT_PHASES[idx + 1] ?? 'loopClosed';
}

function phasesAfter(phase: NavSprintPhase): NavSprintPhase[] {
  if (phase === 'loopClosed') return [];
  const idx = navPhaseIndex(phase);
  return [...NAV_SPRINT_PHASES.slice(idx + 1), 'loopClosed'];
}

function canReopenPhase(state: SprintProgressState, phase: NavSprintPhase): boolean {
  if (phase === 'loopClosed') return false;
  const pIdx = navPhaseIndex(state.sprintProgress === 'loopClosed' ? 'domain' : state.sprintProgress);
  const phaseIdx = navPhaseIndex(phase);
  const domainDone = state.sprintProgress === 'loopClosed';
  if (domainDone) return phaseIdx <= navPhaseIndex('domain');
  return phaseIdx < pIdx;
}

export function concludePhaseInState(
  state: SprintProgressState,
  phase: NavSprintPhase,
  by: string,
  at: string = new Date().toISOString(),
): { ok: true; state: SprintProgressState } | { ok: false; message: string } {
  if (phase === 'loopClosed') {
    return { ok: false, message: 'O Loop contínuo não se conclui desta forma.' };
  }
  if (state.sprintProgress !== phase) {
    return {
      ok: false,
      message: `Só é possível concluir a fase atual (${PHASE_LABELS[state.sprintProgress]}).`,
    };
  }

  const nextProgress = nextPhaseAfter(phase);
  const completions: PhaseCompletions = {
    ...state.phaseCompletions,
    [phase]: { completedAt: at, completedBy: by },
  };
  for (const p of phasesAfter(phase)) {
    if (p !== 'loopClosed') delete completions[p];
  }

  return {
    ok: true,
    state: {
      sprintProgress: nextProgress,
      phaseCompletions: completions,
      phaseEvents: [
        ...state.phaseEvents,
        { type: 'conclude', phase, at, by },
      ],
      reopenedPhase: null,
      phaseLocks: locksFromProgress(nextProgress),
    },
  };
}

export function reopenPhaseInState(
  state: SprintProgressState,
  phase: NavSprintPhase,
  by: string,
  reason?: string,
  at: string = new Date().toISOString(),
): { ok: true; state: SprintProgressState } | { ok: false; message: string } {
  if (phase === 'loopClosed') {
    return { ok: false, message: 'Não é possível reabrir o Loop contínuo.' };
  }
  if (!canReopenPhase(state, phase)) {
    return { ok: false, message: 'Só é possível reabrir uma fase já concluída.' };
  }

  const invalidated = phasesAfter(phase).filter((p) => p !== 'loopClosed') as NavSprintPhase[];
  if (state.sprintProgress === 'loopClosed' || state.phaseLocks.loopClosed) {
    invalidated.push('loopClosed');
  }

  const completions: PhaseCompletions = { ...state.phaseCompletions };
  for (const p of invalidated) {
    if (p !== 'loopClosed') delete completions[p];
  }

  return {
    ok: true,
    state: {
      sprintProgress: phase,
      phaseCompletions: completions,
      phaseEvents: [
        ...state.phaseEvents,
        {
          type: 'reopen',
          phase,
          at,
          by,
          reason: reason?.trim() || undefined,
          invalidatedPhases: invalidated,
        },
      ],
      reopenedPhase: phase,
      phaseLocks: locksFromProgress(phase),
    },
  };
}
