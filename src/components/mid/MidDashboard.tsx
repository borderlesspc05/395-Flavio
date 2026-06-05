import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Radar, Sparkles, Heart, ListChecks, Lightbulb, Orbit } from 'lucide-react';
import type { MidDashboardData } from '../../types/mid';
import { MidSignalDot } from './MidSignalDot';

interface MidDashboardProps {
  data: MidDashboardData;
  loading?: boolean;
}

function SectionTitle({
  eyebrow,
  title,
  icon,
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
}) {
  return (
    <header className="mid-section-head">
      <div className="mid-section-icon" aria-hidden>
        {icon}
      </div>
      <div>
        <p className="mid-section-eyebrow">{eyebrow}</p>
        <h2 className="mid-section-title">{title}</h2>
      </div>
    </header>
  );
}

export function MidDashboard({ data, loading }: MidDashboardProps) {
  const { overview, businessImpact, humanImpact, execution, insights, evolution } = data;
  const primaryKpi = businessImpact.find((m) => m.isPrimary) ?? businessImpact[0];

  if (loading) {
    return (
      <div className="mid-dashboard mid-dashboard--loading" aria-busy="true">
        <div className="mid-skeleton mid-skeleton--hero" />
        <div className="mid-skeleton-row">
          <div className="mid-skeleton" />
          <div className="mid-skeleton" />
        </div>
        <div className="mid-skeleton mid-skeleton--wide" />
      </div>
    );
  }

  return (
    <div className="mid-dashboard">
      <div className="mid-dashboard-bg" aria-hidden>
        <div className="mid-dashboard-glow mid-dashboard-glow--1" />
        <div className="mid-dashboard-glow mid-dashboard-glow--2" />
        <div className="mid-dashboard-grain" />
      </div>

      {/* 1 — Visão Geral */}
      <section className="mid-block mid-block--overview mid-reveal" aria-labelledby="mid-overview">
        <div className="mid-overview-grid">
          <div className="mid-overview-copy">
            <p className="mid-brand-eyebrow">Onda 4 · Domínio</p>
            <h1 id="mid-overview" className="mid-title">
              MID — Magnus Intelligence Dashboard
            </h1>
            <p className="mid-mantra">
              What gets diffused gets measured.
              <br />
              What gets measured evolves.
            </p>
            <p className="mid-subtitle">
              Radar de evolução organizacional — leitura rápida, decisão e impacto humano + negócio.
            </p>
          </div>

          <div className="mid-overview-meta">
            <article className="mid-health-card">
              <span className="mid-health-label">Health Score</span>
              <MidSignalDot signal={overview.health} size="lg" showLabel />
              <p className="mid-health-desc">{overview.healthLabel}</p>
            </article>

            <dl className="mid-meta-list">
              <div>
                <dt>Projeto</dt>
                <dd>{overview.projectName}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{overview.owner}</dd>
              </div>
              <div>
                <dt>Sponsor</dt>
                <dd>{overview.sponsor}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{overview.statusLabel}</dd>
              </div>
              <div>
                <dt>Wave atual</dt>
                <dd>{overview.currentWaveLabel}</dd>
              </div>
              <div className="mid-meta-progress">
                <dt>Progresso</dt>
                <dd>
                  <div className="mid-progress">
                    <div
                      className="mid-progress-fill"
                      style={{ width: `${overview.progressPercent}%` }}
                    />
                  </div>
                  <strong>{overview.progressPercent}%</strong>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Linha 1 — Health + KPIs principais */}
      <section className="mid-kpi-strip mid-reveal mid-reveal--1" aria-label="Indicadores principais">
        {primaryKpi && (
          <article className="mid-kpi-card mid-kpi-card--primary">
            <span className="mid-kpi-tag">KPI principal</span>
            <h3>{primaryKpi.label}</h3>
            <div className="mid-kpi-values">
              <div>
                <span>Antes</span>
                <strong>{primaryKpi.before}</strong>
              </div>
              <ArrowRight size={18} aria-hidden />
              <div>
                <span>Atual</span>
                <strong>{primaryKpi.current}</strong>
              </div>
              <div className="mid-kpi-variation">
                <span>Variação</span>
                <strong>{primaryKpi.variation}</strong>
              </div>
            </div>
            <MidSignalDot signal={primaryKpi.signal} />
          </article>
        )}
        {businessImpact
          .filter((m) => !m.isPrimary)
          .slice(0, 3)
          .map((metric) => (
            <article key={metric.id} className="mid-kpi-card">
              <h3>{metric.label}</h3>
              <p className="mid-kpi-compact">
                <span>{metric.before}</span>
                <ArrowRight size={14} aria-hidden />
                <strong>{metric.current}</strong>
                <em>{metric.variation}</em>
              </p>
              <MidSignalDot signal={metric.signal} size="sm" />
            </article>
          ))}
      </section>

      {/* Linha 2 — Business + Human Impact */}
      <div className="mid-dual-row mid-reveal mid-reveal--2">
        <section className="mid-block" aria-labelledby="mid-business">
          <SectionTitle
            eyebrow="Resultado de negócio"
            title="Business Impact"
            icon={<Radar size={20} />}
          />
          <div className="mid-table-wrap">
            <table className="mid-table">
              <thead>
                <tr>
                  <th>Indicador</th>
                  <th>Antes</th>
                  <th>Atual</th>
                  <th>Variação</th>
                  <th aria-label="Sinal" />
                </tr>
              </thead>
              <tbody>
                {businessImpact.map((row) => (
                  <tr key={row.id} className={row.isPrimary ? 'mid-row-primary' : ''}>
                    <td>{row.label}</td>
                    <td>{row.before}</td>
                    <td>{row.current}</td>
                    <td className="mid-variation">{row.variation}</td>
                    <td>
                      <MidSignalDot signal={row.signal} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mid-block mid-block--human" aria-labelledby="mid-human">
          <SectionTitle
            eyebrow="Mudança humana e cultural"
            title="Human Impact"
            icon={<Heart size={20} />}
          />
          <div className="mid-table-wrap">
            <table className="mid-table mid-table--human">
              <thead>
                <tr>
                  <th>Indicador humano</th>
                  <th>Antes</th>
                  <th>Atual</th>
                  <th>Satisfação</th>
                </tr>
              </thead>
              <tbody>
                {humanImpact.map((row) => (
                  <tr key={row.id}>
                    <td>{row.label}</td>
                    <td>{row.before}</td>
                    <td>{row.current}</td>
                    <td>
                      <MidSignalDot signal={row.satisfaction} size="sm" showLabel />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Linha 3 — Execution Tracker */}
      <section className="mid-block mid-reveal mid-reveal--3" aria-labelledby="mid-execution">
        <SectionTitle
          eyebrow="Follow-up simplificado"
          title="Execution Tracker"
          icon={<ListChecks size={20} />}
        />
        {execution.length === 0 ? (
          <p className="mid-empty">
            Nenhuma entrega registrada ainda. Inicie o Action Canvas na Difusão para acompanhar
            execução aqui.
          </p>
        ) : (
          <div className="mid-table-wrap">
            <table className="mid-table mid-table--execution">
              <thead>
                <tr>
                  <th>Entrega</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Evidência</th>
                  <th>Próxima ação</th>
                </tr>
              </thead>
              <tbody>
                {execution.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="mid-delivery-name">{row.delivery}</span>
                      <span className="mid-delivery-source">{row.source}</span>
                    </td>
                    <td>{row.owner}</td>
                    <td>
                      <span className={`mid-status-pill mid-status-pill--${row.status}`}>
                        {row.statusLabel}
                      </span>
                    </td>
                    <td className="mid-cell-muted">{row.evidence}</td>
                    <td>{row.nextAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Linha 4 — Insights + Evolution */}
      <div className="mid-dual-row mid-reveal mid-reveal--4">
        <section className="mid-block" aria-labelledby="mid-insights">
          <SectionTitle
            eyebrow="Inteligência gerada"
            title="Learning & Insights"
            icon={<Lightbulb size={20} />}
          />
          <ul className="mid-insights-list">
            {insights.map((item) => (
              <li key={item.question}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mid-block mid-block--evolution" aria-labelledby="mid-evolution">
          <SectionTitle
            eyebrow="Próximo movimento"
            title="Evolution Loop"
            icon={<Orbit size={20} />}
          />
          <ul className="mid-evolution-list">
            {evolution.map((item) => (
              <li key={`${item.label}-${item.priority}`}>
                <div className="mid-evolution-head">
                  <h3>{item.label}</h3>
                  <span className={`mid-priority mid-priority--${item.priority}`}>
                    {item.priority}
                  </span>
                </div>
                <p>{item.description}</p>
                {item.route && (
                  <Link to={item.route} className="mid-evolution-link">
                    Ir para ação
                    <ArrowRight size={14} />
                  </Link>
                )}
              </li>
            ))}
          </ul>
          <p className="mid-evolution-foot">
            <Sparkles size={14} aria-hidden />
            Conecta com Continuous Loop — retorno à Wave 1 ou próximo nível de maturidade.
          </p>
        </section>
      </div>
    </div>
  );
}
