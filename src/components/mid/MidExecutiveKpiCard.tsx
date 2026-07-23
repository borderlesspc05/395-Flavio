import { useEffect, useId, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp, BarChart3, Rocket, Shield, Sparkles, Waves, Zap } from 'lucide-react';
import type { MidExecutiveKpi, MidTrend } from '../../types/mid';

const ICONS = {
  rocket: Rocket,
  bolt: Zap,
  wave: Waves,
  chart: BarChart3,
  shield: Shield,
} as const;

export type MidKpiRagInsightView = {
  detail: string;
  bullets: string[];
  sources: string[];
  usedRag: boolean;
};

function TrendGlyph({ trend }: { trend: MidTrend }) {
  if (trend === 'up') return <ArrowUp size={14} aria-hidden />;
  if (trend === 'down') return <ArrowDown size={14} aria-hidden />;
  return <ArrowRight size={14} aria-hidden />;
}

interface MidExecutiveKpiCardProps {
  kpi: MidExecutiveKpi;
  index: number;
  ragInsight?: MidKpiRagInsightView | null;
  ragLoading?: boolean;
}

export function MidExecutiveKpiCard({
  kpi,
  index,
  ragInsight,
  ragLoading = false,
}: MidExecutiveKpiCardProps) {
  const Icon = ICONS[kpi.icon];
  const titleId = useId();
  const [flipped, setFlipped] = useState(false);
  const [touchMode, setTouchMode] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(hover: none)');
    const sync = () => setTouchMode(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const toggle = () => {
    if (!touchMode) return;
    setFlipped((v) => !v);
  };

  const backDetail = ragInsight?.detail || kpi.detail;
  const rawBullets = ragInsight?.bullets?.length ? ragInsight.bullets : kpi.meta;
  const backBullets = rawBullets
    .map((line) => line.trim())
    .filter((line, index, all) => {
      if (!line) return false;
      if (line === backDetail.trim()) return false;
      return all.findIndex((item) => item.trim() === line) === index;
    })
    .slice(0, 3);
  const showRagBadge = Boolean(ragInsight?.usedRag);
  const sourceLabel = ragInsight?.sources?.[0]?.trim() || null;

  return (
    <article
      className={`mid-exec-kpi is-${kpi.band}${flipped ? ' is-flipped' : ''}`}
      style={{ animationDelay: `${0.04 + index * 0.05}s` }}
      aria-labelledby={titleId}
      aria-label={`${kpi.title}: ${kpi.score} de 100, ${kpi.label}. ${
        touchMode ? 'Toque para ver detalhes.' : 'Passe o mouse para ver detalhes.'
      }`}
      onClick={toggle}
      onKeyDown={(event) => {
        if (!touchMode) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setFlipped((v) => !v);
        }
      }}
      role={touchMode ? 'button' : undefined}
      tabIndex={touchMode ? 0 : undefined}
      aria-pressed={touchMode ? flipped : undefined}
    >
      <div className="mid-exec-kpi-scene">
        <div className="mid-exec-kpi-flip">
          <div className="mid-exec-kpi-face mid-exec-kpi-face--front" aria-hidden={flipped}>
            <header className="mid-exec-kpi-head">
              <span className="mid-exec-kpi-icon" aria-hidden>
                <Icon size={18} />
              </span>
              <div>
                <p className="mid-exec-kpi-question">{kpi.question}</p>
                <h3 id={titleId} className="mid-exec-kpi-title">
                  {kpi.title}
                </h3>
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

            <ol className="mid-exec-kpi-meta">
              {kpi.meta.map((line, i) => (
                <li key={line}>
                  <span className="mid-exec-kpi-meta-num" aria-hidden>
                    {i + 1}
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>

            <p className="mid-exec-kpi-hint">
              {touchMode ? 'Toque para ver o insight' : 'Passe o mouse para ver o insight'}
            </p>
          </div>

          <div className="mid-exec-kpi-face mid-exec-kpi-face--back" aria-hidden={!flipped && touchMode}>
            <div className="mid-exec-kpi-back-scroll">
              <header className="mid-exec-kpi-back-head">
                <span className="mid-exec-kpi-icon" aria-hidden>
                  <Sparkles size={16} />
                </span>
                <div>
                  <p className="mid-exec-kpi-question">
                    {showRagBadge ? 'Insight do ciclo · hoje' : 'Leitura de hoje'}
                  </p>
                  <h3 className="mid-exec-kpi-title">{kpi.title}</h3>
                  <p className="mid-exec-kpi-back-question">{kpi.question}</p>
                </div>
              </header>

              <div className="mid-exec-kpi-back-scorecard">
                <p className="mid-exec-kpi-back-score">
                  <strong>{kpi.score}</strong>
                  <span>/100</span>
                </p>
                <span className={`mid-exec-kpi-back-band is-${kpi.band}`}>{kpi.label}</span>
              </div>

              <div className="mid-exec-kpi-back-block">
                <p className="mid-exec-kpi-back-label">O que isso significa</p>
                {ragLoading && !ragInsight ? (
                  <p className="mid-exec-kpi-back-detail">
                    Buscando contexto relevante na memória do ciclo…
                  </p>
                ) : (
                  <p className="mid-exec-kpi-back-detail">{backDetail}</p>
                )}
              </div>

              {backBullets.length > 0 ? (
                <div className="mid-exec-kpi-back-block">
                  <p className="mid-exec-kpi-back-label">Causa e próxima ação</p>
                  <ol className="mid-exec-kpi-back-meta">
                    {backBullets.map((line, i) => (
                      <li key={`back-${line}`}>
                        <span className="mid-exec-kpi-meta-num" aria-hidden>
                          {i + 1}
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              {showRagBadge ? (
                <p className="mid-exec-kpi-rag-source">
                  <span>Fonte</span>
                  <strong title={sourceLabel ?? undefined}>
                    {sourceLabel || 'Memória do ciclo'}
                  </strong>
                </p>
              ) : null}

              {touchMode ? <p className="mid-exec-kpi-hint">Toque novamente para voltar</p> : null}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
