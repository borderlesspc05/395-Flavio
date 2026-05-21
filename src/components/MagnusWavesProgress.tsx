import { Link } from 'react-router-dom';
import { Check, Lock, Circle } from 'lucide-react';
import {
  MAGNUS_WAVES,
  getActiveWaveId,
  getWaveStatus,
  type SprintProgress,
  type WaveStatus,
} from '../constants/magnusWaves';

interface MagnusWavesProgressProps {
  progress: SprintProgress;
  compact?: boolean;
}

function StatusIcon({ status }: { status: WaveStatus }) {
  if (status === 'complete') return <Check size={14} aria-hidden />;
  if (status === 'locked') return <Lock size={12} aria-hidden />;
  return <Circle size={10} aria-hidden />;
}

export function MagnusWavesProgress({ progress, compact = false }: MagnusWavesProgressProps) {
  const activeId = getActiveWaveId(progress);

  return (
    <section className="magnus-waves-progress" aria-label="Progresso Magnus Waves">
      <div className="magnus-waves-progress-header">
        <span className="magnus-waves-badge">MM People Sprint 90+</span>
        <p className="magnus-waves-tagline">
          Diagnóstico revela · Design estrutura · Difusão move · Domínio sustenta
        </p>
      </div>

      <div className={`magnus-waves-grid ${compact ? 'compact' : ''}`}>
        {MAGNUS_WAVES.map((wave) => {
          const status = getWaveStatus(wave.id, progress);
          const isActive = wave.id === activeId;
          const locked = status === 'locked';

          return (
            <Link
              key={wave.id}
              to={locked ? '#' : wave.route}
              className={`magnus-wave-card status-${status} ${isActive ? 'is-active' : ''}`}
              onClick={(e) => locked && e.preventDefault()}
              aria-disabled={locked}
              tabIndex={locked ? -1 : 0}
            >
              <div className="magnus-wave-card-top">
                <span className="magnus-wave-number">{wave.number}</span>
                <span className={`magnus-wave-status-icon status-${status}`}>
                  <StatusIcon status={status} />
                </span>
              </div>
              <h3 className="magnus-wave-label">{wave.label}</h3>
              <p className="magnus-wave-subtitle">{wave.subtitle}</p>
              {!compact && (
                <ul className="magnus-wave-steps">
                  {wave.steps.map((step) => (
                    <li key={step.id}>
                      <span className="magnus-wave-step-id">{step.id}</span> {step.label}
                    </li>
                  ))}
                </ul>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
