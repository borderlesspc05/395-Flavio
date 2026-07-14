import type { MidBriefing, MidHealthFactor, MidHealth } from '../../types/mid';

interface MidBriefingPanelProps {
  briefing: MidBriefing;
  health: MidHealth;
  factors: MidHealthFactor[];
}

export function MidBriefingPanel({ briefing, health, factors }: MidBriefingPanelProps) {
  const factorsLine =
    factors.length > 0
      ? `Baseado em ${factors.map((f) => f.label.toLowerCase()).join(' · ')}`
      : 'Baseado em prazo · evolução · velocidade · check-ins · bloqueios · participação';

  return (
    <div className="mid-briefing" aria-label="Intelligence Dashboard">
      <div className="mid-briefing-top">
        <div className="mid-briefing-lead">
          <p className="mid-briefing-eyebrow">Intelligence Dashboard</p>
          <h2 className="mid-briefing-greeting">{briefing.greeting}</h2>
        </div>

        <div
          className={`mid-briefing-score mid-briefing-score--${health}`}
          aria-label={`Health Score ${briefing.healthScore}, ${briefing.healthLabel}`}
        >
          <span className="mid-briefing-score-label">Health Score</span>
          <strong className="mid-briefing-score-value">{briefing.healthScore}</strong>
          <span className="mid-briefing-score-band">{briefing.healthLabel}</span>
        </div>
      </div>

      <ul className="mid-briefing-signals">
        {briefing.signals.map((signal) => (
          <li key={signal.id} className={`mid-briefing-signal mid-briefing-signal--${signal.tone}`}>
            <span className="mid-briefing-dot" aria-hidden />
            <span>{signal.text}</span>
          </li>
        ))}
      </ul>

      <div className="mid-briefing-reco">
        <p className="mid-briefing-reco-label">Recomendação da IA</p>
        <p className="mid-briefing-reco-text">{briefing.recommendation}</p>
      </div>

      <p className="mid-briefing-footing">{factorsLine}</p>
    </div>
  );
}
