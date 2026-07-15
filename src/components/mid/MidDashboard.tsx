import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ListChecks, Pencil, X } from 'lucide-react';
import type { MidDashboardData } from '../../types/mid';
import { useCycle } from '../../context/CycleContext';
import { MidExecutiveKpiCard } from './MidExecutiveKpiCard';
import { MidCopilotFeed } from './MidCopilotFeed';
import { MidBriefingPanel } from './MidBriefingPanel';

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

function EditableProjectName({ name }: { name: string }) {
  const { renameActiveCycle } = useCycle();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(name);
  }, [name, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const cancel = () => {
    setDraft(name);
    setError('');
    setEditing(false);
  };

  const commit = async () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setError('Informe um nome para o projeto.');
      return;
    }
    if (trimmed === name) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const result = await renameActiveCycle(trimmed);
      if (!result.ok) {
        setError(result.message ?? 'Não foi possível salvar o nome.');
        return;
      }
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="mid-project-edit">
        <input
          ref={inputRef}
          type="text"
          className="mid-project-input"
          value={draft}
          maxLength={120}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void commit();
            if (e.key === 'Escape') cancel();
          }}
          aria-label="Nome do projeto"
        />
        <div className="mid-project-edit-actions">
          <button
            type="button"
            className="mid-project-edit-btn mid-project-edit-btn--save"
            onClick={() => void commit()}
            disabled={saving}
            aria-label="Salvar nome do projeto"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            className="mid-project-edit-btn"
            onClick={cancel}
            disabled={saving}
            aria-label="Cancelar edição"
          >
            <X size={14} />
          </button>
        </div>
        {error && <p className="mid-project-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mid-project-display">
      <span className="mid-project-name">{name}</span>
      <button
        type="button"
        className="mid-project-rename"
        onClick={() => setEditing(true)}
        aria-label="Renomear projeto"
        title="Renomear projeto"
      >
        <Pencil size={13} />
      </button>
    </div>
  );
}

export function MidDashboard({ data, loading }: MidDashboardProps) {
  const { overview, executiveKpis, execution, briefing } = data;

  if (loading) {
    return (
      <div className="mid-dashboard mid-dashboard--loading" aria-busy="true">
        <div className="mid-skeleton mid-skeleton--hero" />
        <div className="mid-skeleton-row mid-skeleton-row--kpis">
          <div className="mid-skeleton" />
          <div className="mid-skeleton" />
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

      <section className="mid-block mid-block--overview mid-reveal" aria-labelledby="mid-overview">
        <div className="mid-overview-grid mid-overview-grid--slim">
          <div className="mid-overview-copy">
            <h1 id="mid-overview" className="mid-title">
              Intelligence Dashboard
            </h1>
            <p className="mid-mantra">
              A execução gera inteligência.
              <br />
              A inteligência impulsiona a evolução.
            </p>
            <p className="mid-subtitle">
              O Intelligence Dashboard (ID) apresenta cinco indicadores executivos — incluindo o
              Sustainability Score da Onda 4 — e o Health Score do projeto para acompanhar evolução,
              execução e sustentação da mudança.
            </p>
            <MidBriefingPanel
              briefing={briefing}
              health={overview.health}
              factors={overview.healthFactors ?? []}
            />
          </div>

          <div className="mid-project-card">
            <div className="mid-project-card-top">
              <span className="mid-project-card-label">Projeto</span>
              <EditableProjectName name={overview.projectName} />
            </div>

            <MidCopilotFeed data={data} />

            <div className="mid-project-card-progress">
              <div className="mid-project-card-progress-head">
                <span className="mid-project-card-label">Progresso</span>
                <strong>{overview.progressPercent}%</strong>
              </div>
              <div className="mid-progress">
                <div
                  className="mid-progress-fill"
                  style={{ width: `${overview.progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mid-exec-kpi-grid mid-reveal mid-reveal--1" aria-label="Indicadores executivos">
        {executiveKpis.map((kpi, index) => (
          <MidExecutiveKpiCard key={kpi.id} kpi={kpi} index={index} />
        ))}
      </section>

      <section className="mid-block mid-reveal mid-reveal--2" aria-labelledby="mid-execution">
        <SectionTitle
          eyebrow="Follow-up simplificado"
          title="Execution Tracker"
          icon={<ListChecks size={20} />}
        />
        {execution.length === 0 ? (
          <p className="mid-empty">
            Nenhuma entrega registrada ainda. Inicie o Action Canvas na Difusão para acompanhar a
            realização das atividades propostas.
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
    </div>
  );
}
