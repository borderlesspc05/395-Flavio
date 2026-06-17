import { ArrowDown, ArrowRight, ArrowUp, BarChart3, Rocket, Waves, Zap } from 'lucide-react';
import type { MidExecutiveKpi, MidTrend } from '../../types/mid';

const ICONS = {
  rocket: Rocket,
  bolt: Zap,
  wave: Waves,
  chart: BarChart3,
} as const;

function TrendGlyph({ trend }: { trend: MidTrend }) {
  if (trend === 'up') return <ArrowUp size={14} aria-hidden />;
  if (trend === 'down') return <ArrowDown size={14} aria-hidden />;
  return <ArrowRight size={14} aria-hidden />;
}

interface MidExecutiveKpiCardProps {
  kpi: MidExecutiveKpi;
  index: number;
}

export function MidExecutiveKpiCard({ kpi, index }: MidExecutiveKpiCardProps) {
  const Icon = ICONS[kpi.icon];

  return (
    <article
      className={`mid-exec-kpi is-${kpi.band}`}
      style={{ animationDelay: `${0.04 + index * 0.05}s` }}
      aria-label={`${kpi.title}: ${kpi.score} de 100, ${kpi.label}`}
    >
      <header className="mid-exec-kpi-head">
        <span className="mid-exec-kpi-icon" aria-hidden>
          <Icon size={18} />
        </span>
        <div>
          <p className="mid-exec-kpi-question">{kpi.question}</p>
          <h3 className="mid-exec-kpi-title">{kpi.title}</h3>
        </div>
      </header>

      <div className="mid-exec-kpi-score-row">
        <p className="mid-exec-kpi-score">
          {kpi.score}
          <span>/100</span>
        </p>
        <span className={`mid-exec-kpi-trend is-${kpi.trend}`} title="Tendência">
          <TrendGlyph trend={kpi.trend} />
          {kpi.trendValue}
        </span>
      </div>

      <p className="mid-exec-kpi-status">{kpi.label}</p>

      <ul className="mid-exec-kpi-meta">
        {kpi.meta.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </article>
  );
}
