/**
 * Controle sequencial das fases do Sprint.
 *
 * Progresso = ponteiro da fase atual (editável).
 * Fases anteriores = concluídas (somente leitura).
 * Fases posteriores = bloqueadas (inacessíveis até conclusão da atual).
 */

export type SprintPhase =
  | 'diagnostic'
  | 'solutionPick'
  | 'design'
  | 'diffusion'
  | 'domain'
  | 'loopClosed';

/** Fases de navegação do fluxo sequencial (sidebar). */
export type NavSprintPhase = 'diagnostic' | 'design' | 'diffusion' | 'domain' | 'loopClosed';

export const NAV_SPRINT_PHASES: NavSprintPhase[] = [
  'diagnostic',
  'design',
  'diffusion',
  'domain',
];

/** Ordem legada (inclui solutionPick como sub-etapa do Diagnóstico). */
export const SPRINT_PHASE_ORDER: SprintPhase[] = [
  'diagnostic',
  'solutionPick',
  'design',
  'diffusion',
  'domain',
];

export type PhaseAccess = 'completed' | 'current' | 'locked' | 'reopened';

export type PhaseLocks = Partial<Record<SprintPhase, boolean>>;

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
  /** Fase atual editável (ou loopClosed se Domínio já foi concluído). */
  sprintProgress: NavSprintPhase;
  phaseCompletions: PhaseCompletions;
  phaseEvents: PhaseEvent[];
  /** Fase reaberta neste ciclo (até nova conclusão). */
  reopenedPhase?: NavSprintPhase | null;
  /** Derivado / legado — fases concluídas. */
  phaseLocks: PhaseLocks;
}

export const PHASE_LABELS: Record<NavSprintPhase, string> = {
  diagnostic: 'Diagnóstico',
  design: 'Design',
  diffusion: 'Difusão',
  domain: 'Domínio',
  loopClosed: 'Loop contínuo',
};

export const PHASE_PATHS: Record<NavSprintPhase, string> = {
  diagnostic: '/dashboard/scans',
  design: '/dashboard/design',
  diffusion: '/dashboard/objetivos',
  domain: '/dashboard/relatorios',
  loopClosed: '/dashboard/historico',
};

export function createEmptyPhaseLocks(): PhaseLocks {
  return {};
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

/** Mapeia solutionPick → diagnostic para regras de acesso. */
export function toNavPhase(phase: SprintPhase): NavSprintPhase {
  if (phase === 'solutionPick') return 'diagnostic';
  return phase;
}

export function navPhaseIndex(phase: NavSprintPhase): number {
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

/**
 * Infere progresso a partir de phaseLocks legados.
 * Primeira fase de navegação ainda não travada = atual.
 */
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

export function normalizePhaseLocks(locks: PhaseLocks | undefined): PhaseLocks {
  const progress = inferProgressFromLocks(locks);
  return locksFromProgress(progress);
}

export function isPhaseLocked(locks: PhaseLocks | undefined, phase: SprintPhase): boolean {
  const nav = toNavPhase(phase);
  const progress = inferProgressFromLocks(locks);
  const access = getPhaseAccessFromProgress(progress, nav, null);
  return access === 'completed' || access === 'locked';
}

/** Editável apenas se current ou reopened. */
export function isPhaseEditable(
  progress: NavSprintPhase,
  phase: SprintPhase,
  reopenedPhase?: NavSprintPhase | null,
): boolean {
  const access = getPhaseAccessFromProgress(progress, toNavPhase(phase), reopenedPhase);
  return access === 'current' || access === 'reopened';
}

export function getPhaseAccessFromProgress(
  progress: NavSprintPhase,
  phase: NavSprintPhase,
  reopenedPhase?: NavSprintPhase | null,
): PhaseAccess {
  if (phase === 'loopClosed') {
    if (progress === 'loopClosed') return 'current';
    return 'locked';
  }

  const pIdx = navPhaseIndex(progress === 'loopClosed' ? 'domain' : progress);
  const phaseIdx = navPhaseIndex(phase);
  const domainDone = progress === 'loopClosed';

  if (domainDone) {
    if (phaseIdx <= navPhaseIndex('domain')) {
      return reopenedPhase === phase ? 'reopened' : 'completed';
    }
    return 'locked';
  }

  if (phaseIdx < pIdx) {
    return reopenedPhase === phase ? 'reopened' : 'completed';
  }
  if (phaseIdx === pIdx) {
    return reopenedPhase === phase ? 'reopened' : 'current';
  }
  return 'locked';
}

export function getPhaseAccess(
  state: Pick<SprintProgressState, 'sprintProgress' | 'reopenedPhase'> | null | undefined,
  phase: SprintPhase,
): PhaseAccess {
  if (!state) {
    return toNavPhase(phase) === 'diagnostic' ? 'current' : 'locked';
  }
  return getPhaseAccessFromProgress(state.sprintProgress, toNavPhase(phase), state.reopenedPhase);
}

/** Pode reabrir qualquer fase já concluída (índice < progresso). */
export function canReopenPhase(
  state: Pick<SprintProgressState, 'sprintProgress' | 'reopenedPhase'> | null | undefined,
  phase: NavSprintPhase,
): boolean {
  if (!state || phase === 'loopClosed') return false;
  const access = getPhaseAccessFromProgress(state.sprintProgress, phase, state.reopenedPhase);
  return access === 'completed';
}

export function phasesAfter(phase: NavSprintPhase): NavSprintPhase[] {
  if (phase === 'loopClosed') return [];
  const idx = navPhaseIndex(phase);
  return [...NAV_SPRINT_PHASES.slice(idx + 1), 'loopClosed'];
}

export function nextPhaseAfter(phase: NavSprintPhase): NavSprintPhase {
  if (phase === 'loopClosed') return 'loopClosed';
  if (phase === 'domain') return 'loopClosed';
  const idx = navPhaseIndex(phase);
  return NAV_SPRINT_PHASES[idx + 1] ?? 'loopClosed';
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

  const event: PhaseEvent = {
    type: 'conclude',
    phase,
    at,
    by,
  };

  const next: SprintProgressState = {
    sprintProgress: nextProgress,
    phaseCompletions: completions,
    phaseEvents: [...state.phaseEvents, event],
    reopenedPhase: null,
    phaseLocks: locksFromProgress(nextProgress),
  };

  return { ok: true, state: next };
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
    return {
      ok: false,
      message: 'Só é possível reabrir uma fase já concluída.',
    };
  }

  const invalidated = phasesAfter(phase).filter((p) => p !== 'loopClosed') as NavSprintPhase[];
  // Também invalida loopClosed se estava fechado
  if (state.sprintProgress === 'loopClosed' || state.phaseLocks.loopClosed) {
    invalidated.push('loopClosed');
  }

  const completions: PhaseCompletions = { ...state.phaseCompletions };
  for (const p of invalidated) {
    if (p !== 'loopClosed') delete completions[p];
  }

  const event: PhaseEvent = {
    type: 'reopen',
    phase,
    at,
    by,
    reason: reason?.trim() || undefined,
    invalidatedPhases: invalidated,
  };

  const next: SprintProgressState = {
    sprintProgress: phase,
    phaseCompletions: completions,
    phaseEvents: [...state.phaseEvents, event],
    reopenedPhase: phase,
    phaseLocks: locksFromProgress(phase),
  };

  return { ok: true, state: next };
}

/** Compat: concluir fase = avançar progresso (locks derivados). */
export function lockPhaseInState(locks: PhaseLocks | undefined, phase: SprintPhase): PhaseLocks {
  const progress = inferProgressFromLocks(locks);
  const nav = toNavPhase(phase);
  const state: SprintProgressState = {
    sprintProgress: progress,
    phaseCompletions: {},
    phaseEvents: [],
    reopenedPhase: null,
    phaseLocks: locksFromProgress(progress),
  };
  // Se pedirem lock de solutionPick, trate como diagnostic
  const concludePhase = nav === 'diagnostic' && phase === 'solutionPick' ? 'diagnostic' : nav;
  // lockSprintPhase legado: marcar fase e anteriores como done → progresso = next
  if (concludePhase === 'loopClosed' || phase === 'loopClosed') {
    return locksFromProgress('loopClosed');
  }
  // Se a fase a "lockar" já está antes do progresso, só reforça locks
  if (navPhaseIndex(concludePhase) < navPhaseIndex(progress === 'loopClosed' ? 'domain' : progress)) {
    return locksFromProgress(progress);
  }
  // Avança para depois desta fase
  const result = concludePhaseInState(
    { ...state, sprintProgress: concludePhase },
    concludePhase,
    'system',
  );
  if (result.ok) return result.state.phaseLocks;
  return locksFromProgress(nextPhaseAfter(concludePhase));
}

export function unlockPhaseInState(locks: PhaseLocks | undefined, phase: SprintPhase): PhaseLocks {
  const progress = inferProgressFromLocks(locks);
  const nav = toNavPhase(phase);
  const state: SprintProgressState = {
    sprintProgress: progress,
    phaseCompletions: {},
    phaseEvents: [],
    reopenedPhase: null,
    phaseLocks: locksFromProgress(progress),
  };
  const result = reopenPhaseInState(state, nav, 'system');
  if (result.ok) return result.state.phaseLocks;
  return locksFromProgress(progress);
}

export function canUnlockPhase(locks: PhaseLocks | undefined, phase: SprintPhase): boolean {
  const progress = inferProgressFromLocks(locks);
  return canReopenPhase({ sprintProgress: progress, reopenedPhase: null }, toNavPhase(phase));
}

export function pathRequiresPhase(pathname: string): NavSprintPhase | null {
  if (
    pathname.startsWith('/dashboard/scans') ||
    pathname === '/dashboard/initial-form' ||
    pathname === '/dashboard/solution-pick'
  ) {
    return 'diagnostic';
  }
  if (pathname === '/dashboard/design' || pathname.startsWith('/dashboard/design')) {
    return 'design';
  }
  if (pathname === '/dashboard/objetivos' || pathname.startsWith('/dashboard/objetivos')) {
    return 'diffusion';
  }
  if (pathname === '/dashboard/relatorios' || pathname.startsWith('/dashboard/relatorios')) {
    return 'domain';
  }
  if (pathname === '/dashboard/historico' || pathname.startsWith('/dashboard/historico')) {
    return 'loopClosed';
  }
  return null;
}

export function isPathAllowedForProgress(
  pathname: string,
  progress: NavSprintPhase,
  reopenedPhase?: NavSprintPhase | null,
): boolean {
  const required = pathRequiresPhase(pathname);
  if (!required) return true;
  const access = getPhaseAccessFromProgress(progress, required, reopenedPhase);
  // completed: pode visualizar; current/reopened: ok; locked: não
  return access !== 'locked';
}
