import type { MidSignal } from '../../types/mid';

const LABELS: Record<MidSignal, string> = {
  green: 'Saudável',
  yellow: 'Atenção',
  red: 'Crítico',
};

interface MidSignalDotProps {
  signal: MidSignal;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function MidSignalDot({ signal, size = 'md', showLabel = false }: MidSignalDotProps) {
  return (
    <span className={`mid-signal mid-signal--${signal} mid-signal--${size}`} title={LABELS[signal]}>
      <span className="mid-signal-core" aria-hidden />
      {showLabel && <span className="mid-signal-label">{LABELS[signal]}</span>}
    </span>
  );
}
