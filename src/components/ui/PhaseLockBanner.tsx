import { useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { Modal } from './Modal';
import {
  canUnlockPhase,
  isPhaseLocked,
  unlockSprintPhase,
  type PhaseLocks,
  type SprintPhase,
} from '../../services/phaseLock';
import type { DiagnosticCycle } from '../../services/diagnosticCycles';
import { useCycle } from '../../context/CycleContext';

const PHASE_LABELS: Record<SprintPhase, string> = {
  diagnostic: 'Diagnóstico',
  solutionPick: 'Solution Pick',
  design: 'Design',
  diffusion: 'Difusão',
  domain: 'Domínio',
  loopClosed: 'Loop contínuo',
};

interface PhaseLockBannerProps {
  phase: SprintPhase;
  locks: PhaseLocks;
  cycle: DiagnosticCycle | null;
  onLocksChange: (locks: PhaseLocks) => void;
}

export function PhaseLockBanner({ phase, locks, cycle, onLocksChange }: PhaseLockBannerProps) {
  const { refreshCycles } = useCycle();
  const locked = isPhaseLocked(locks, phase);
  const unlockable = canUnlockPhase(locks, phase);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!locked) return null;

  const label = PHASE_LABELS[phase];

  const handleUnlock = async () => {
    setBusy(true);
    setError(null);
    const result = await unlockSprintPhase(cycle, phase);
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? 'Não foi possível desbloquear.');
      return;
    }
    onLocksChange(result.locks);
    void refreshCycles?.();
    setConfirmOpen(false);
  };

  return (
    <>
      <div className="phase-lock-banner" role="status">
        <div className="phase-lock-banner__copy">
          <Lock size={18} aria-hidden />
          <div>
            <strong>{label} concluído e congelado</strong>
            <p>
              Esta etapa está bloqueada para preservar o histórico. Para editar, desbloqueie de
              trás para frente (uma fase por vez).
            </p>
          </div>
        </div>
        {unlockable ? (
          <button
            type="button"
            className="phase-lock-banner__btn"
            onClick={() => setConfirmOpen(true)}
          >
            <Unlock size={16} aria-hidden />
            Desbloquear
          </button>
        ) : (
          <span className="phase-lock-banner__hint">Desbloqueie a fase seguinte primeiro</span>
        )}
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => !busy && setConfirmOpen(false)}
        title="Tem certeza disso?"
        size="info"
        dismissLocked={busy}
      >
        <div className="phase-lock-confirm-panel">
          <p className="phase-lock-confirm-text">
            Desbloquear <strong>{label}</strong> permite editar novamente esta etapa. Confirma?
          </p>
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
              onClick={() => void handleUnlock()}
            >
              {busy ? 'Desbloqueando…' : 'Sim, desbloquear'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
