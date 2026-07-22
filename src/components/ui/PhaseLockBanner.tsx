import { useMemo, useState } from 'react';
import { CheckCircle2, Lock, RotateCcw, Unlock } from 'lucide-react';
import { Modal } from './Modal';
import { SprintCycleProgress } from './SprintCycleProgress';
import {
  canReopenPhase,
  createInitialSprintProgress,
  getPhaseAccess,
  getSprintProgressFromCycle,
  PHASE_LABELS,
  reopenSprintPhase,
  type NavSprintPhase,
  type PhaseLocks,
  type SprintPhase,
  type SprintProgressState,
} from '../../services/phaseLock';
import { phasesAfter } from '../../types/phaseLock';
import type { DiagnosticCycle } from '../../services/diagnosticCycles';
import { useCycle } from '../../context/CycleContext';
import { useViewTransitionNavigate } from '../../hooks/useViewTransitionNavigate';

interface PhaseLockBannerProps {
  phase: SprintPhase;
  locks: PhaseLocks;
  cycle: DiagnosticCycle | null;
  onLocksChange: (locks: PhaseLocks) => void;
  progress?: SprintProgressState;
  onProgressChange?: (progress: SprintProgressState) => void;
}

function subsequentLabels(phase: NavSprintPhase): string {
  const after = phasesAfter(phase).filter((p) => p !== 'loopClosed');
  if (after.length === 0) return '';
  return after.map((p) => PHASE_LABELS[p]).join(' e ');
}

export function PhaseLockBanner({
  phase,
  locks: _locks,
  cycle,
  onLocksChange,
  progress,
  onProgressChange,
}: PhaseLockBannerProps) {
  const navigate = useViewTransitionNavigate();
  const { refreshCycles } = useCycle();
  const navPhase = (phase === 'solutionPick' ? 'diagnostic' : phase) as NavSprintPhase;

  const state: SprintProgressState =
    progress ?? (cycle ? getSprintProgressFromCycle(cycle) : createInitialSprintProgress());
  const access = getPhaseAccess(state, phase);

  const reopenable = canReopenPhase(state, navPhase);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = PHASE_LABELS[navPhase] ?? phase;
  const later = useMemo(() => subsequentLabels(navPhase), [navPhase]);

  const handleReopen = async () => {
    setBusy(true);
    setError(null);
    const result = await reopenSprintPhase(cycle, phase, reason);
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? 'Não foi possível reabrir.');
      return;
    }
    onLocksChange(result.state.phaseLocks);
    onProgressChange?.(result.state);
    void refreshCycles?.();
    setConfirmOpen(false);
    setReason('');
    if (result.nextPath) {
      navigate(result.nextPath);
    }
  };

  const statusBanner =
    access === 'locked' ? null : access === 'current' || access === 'reopened' ? (
      <div className={`phase-lock-banner phase-lock-banner--${access}`} role="status">
        <div className="phase-lock-banner__copy">
          {access === 'reopened' ? (
            <RotateCcw size={18} aria-hidden />
          ) : (
            <CheckCircle2 size={18} aria-hidden />
          )}
          <div>
            <strong>
              {access === 'reopened' ? `${label} reaberta` : `Você está em ${label}`}
            </strong>
            <p>
              {access === 'reopened'
                ? later
                  ? `${later} aguardam nova conclusão para manter a consistência do projeto.`
                  : 'Continue o fluxo e conclua esta etapa quando estiver pronto.'
                : 'Conclua esta fase explicitamente para bloquear o histórico e liberar a próxima.'}
            </p>
          </div>
        </div>
      </div>
    ) : (
      <div className="phase-lock-banner phase-lock-banner--completed" role="status">
        <div className="phase-lock-banner__copy">
          <Lock size={18} aria-hidden />
          <div>
            <strong>{label} concluída · somente leitura</strong>
            <p>
              Esta etapa foi finalizada para preservar o histórico do ciclo. Reabrir invalida
              automaticamente as fases posteriores.
            </p>
          </div>
        </div>
        {reopenable ? (
          <button
            type="button"
            className="phase-lock-banner__btn"
            onClick={() => setConfirmOpen(true)}
          >
            <Unlock size={16} aria-hidden />
            Reabrir esta etapa
          </button>
        ) : null}
      </div>
    );

  return (
    <>
      <div className="sprint-phase-chrome">
        <SprintCycleProgress phase={phase} progress={state} />
        {statusBanner}
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => !busy && setConfirmOpen(false)}
        title={`Reabrir ${label}?`}
        size="info"
        dismissLocked={busy}
      >
        <div className="phase-lock-confirm-panel">
          <p className="phase-lock-confirm-text">
            Deseja reabrir a fase <strong>{label}</strong>?
            {later ? (
              <>
                {' '}
                As fases posteriores (<strong>{later}</strong>) deixarão de ser concluídas e
                precisarão ser executadas novamente para manter a consistência do projeto.
              </>
            ) : null}
          </p>
          <label className="phase-lock-reason">
            <span>Motivo (opcional)</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Por que esta etapa precisa ser reaberta?"
              disabled={busy}
            />
          </label>
          {error ? <p className="phase-lock-confirm-error">{error}</p> : null}
          <div className="phase-info-actions">
            <button
              type="button"
              className="phase-info-close is-ghost"
              disabled={busy}
              onClick={() => setConfirmOpen(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="phase-info-close"
              disabled={busy}
              onClick={() => void handleReopen()}
            >
              {busy ? 'Reabrindo…' : 'Reabrir fase'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
