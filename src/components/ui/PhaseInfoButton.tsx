import { useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Modal } from './Modal';

interface PhaseInfoButtonProps {
  title: string;
  children: ReactNode;
  label?: string;
  className?: string;
}

export function PhaseInfoButton({
  title,
  children,
  label = 'Informações',
  className = '',
}: PhaseInfoButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`phase-info-btn ${className}`.trim()}
        onClick={() => setOpen(true)}
        aria-label={label}
        title={label}
      >
        <Info size={16} aria-hidden />
        <span className="phase-info-btn__text">{label}</span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} size="info">
        <div className="phase-info-panel">
          <div className="phase-info-body">{children}</div>
          <div className="phase-info-actions">
            <button type="button" className="phase-info-close" onClick={() => setOpen(false)}>
              Entendi
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
