import { Check } from 'lucide-react';
import {
  getPhaseAccessFromProgress,
  NAV_SPRINT_PHASES,
  PHASE_LABELS,
  toNavPhase,
  type NavSprintPhase,
  type SprintPhase,
  type SprintProgressState,
} from '../../services/phaseLock';

interface SprintCycleProgressProps {
  /** Fase da página atual (pode ser solutionPick → conta como Diagnóstico). */
  phase: SprintPhase;
  progress: SprintProgressState;
}

type StepVisualState = 'done' | 'reopened' | 'current' | 'locked';

/**
 * Indicador do ciclo Sprint: título + progresso numérico, barra, depois as 4 fases.
 */
export function SprintCycleProgress({ phase, progress }: SprintCycleProgressProps) {
  const navPhase = toNavPhase(phase);
  const viewing: NavSprintPhase =
    navPhase === 'loopClosed' ? 'domain' : (navPhase as Exclude<NavSprintPhase, 'loopClosed'>);
  const stepIndex = Math.max(0, NAV_SPRINT_PHASES.indexOf(viewing));
  const stepNumber = stepIndex + 1;
  const total = NAV_SPRINT_PHASES.length;
  const label = PHASE_LABELS[viewing];

  const completedCount = NAV_SPRINT_PHASES.filter((p) => {
    const access = getPhaseAccessFromProgress(
      progress.sprintProgress,
      p,
      progress.reopenedPhase,
    );
    return access === 'completed';
  }).length;

  const allDone = progress.sprintProgress === 'loopClosed';
  /** Barra: fases concluídas + meia etapa na fase atual. */
  const fillRatio = allDone
    ? 1
    : Math.min(1, (completedCount + (completedCount < total ? 0.45 : 0)) / total);
  const fillPercent = Math.round(fillRatio * 100);

  const headline = allDone
    ? 'Ciclo concluído · 4 de 4 fases'
    : `Fase ${stepNumber} de ${total} · ${label}`;

  const progressLabel = allDone
    ? `Ciclo concluído, ${fillPercent} por cento`
    : `Fase ${stepNumber} de ${total}, ${label}, ${fillPercent} por cento do ciclo`;

  return (
    <section className="sprint-cycle-progress" aria-label={progressLabel}>
      <div className="sprint-cycle-progress__lede">
        <p className="sprint-cycle-progress__title">{headline}</p>
        <p className="sprint-cycle-progress__metric" aria-hidden="true">
          <span className="sprint-cycle-progress__pct">{fillPercent}</span>
          <span className="sprint-cycle-progress__pct-unit">%</span>
        </p>
      </div>

      <div className="sprint-cycle-progress__bar">
        <div
          className="sprint-cycle-progress__track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={fillPercent}
          aria-valuetext={progressLabel}
        >
          <div
            className="sprint-cycle-progress__fill"
            style={{ width: `${fillPercent}%` }}
          />
        </div>
      </div>

      <ol className="sprint-cycle-progress__steps">
        {NAV_SPRINT_PHASES.map((p, index) => {
          const access = getPhaseAccessFromProgress(
            progress.sprintProgress,
            p,
            progress.reopenedPhase,
          );
          const isViewing = p === viewing;
          const state: StepVisualState =
            allDone || access === 'completed'
              ? 'done'
              : access === 'reopened'
                ? 'reopened'
                : access === 'current'
                  ? 'current'
                  : 'locked';

          return (
            <li
              key={p}
              className={`sprint-cycle-progress__step is-${state}${isViewing ? ' is-viewing' : ''}`}
            >
              <span className="sprint-cycle-progress__dot" aria-hidden="true">
                {state === 'done' ? <Check size={12} strokeWidth={3} /> : index + 1}
              </span>
              <span className="sprint-cycle-progress__step-label">{PHASE_LABELS[p]}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
