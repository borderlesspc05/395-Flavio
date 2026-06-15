import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ChevronRight, Loader2 } from 'lucide-react';
import { activitiesApi } from '../services/api';
import type { Activity as ActivityItem } from '../types';
import {
  ACTIVITY_TYPE_LABELS,
  activityLinkForType,
  activityTypeIcon,
  normalizeActivity,
} from '../utils/activityDisplay';

type TypeFilter = 'todos' | string;

interface ActivityTimelineProps {
  className?: string;
  title?: string;
  subtitle?: string;
  showFilters?: boolean;
  limit?: number;
  refreshKey?: number;
  onActivitiesLoaded?: (count: number) => void;
}

export function ActivityTimeline({
  className = '',
  title = 'Histórico do usuário',
  subtitle,
  showFilters = true,
  limit,
  refreshKey = 0,
  onActivitiesLoaded,
}: ActivityTimelineProps) {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await activitiesApi.list();
      const list = (Array.isArray(data) ? data : []).map((a: Record<string, unknown>) =>
        normalizeActivity(a)
      );
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setActivities(list);
      onActivitiesLoaded?.(list.length);
    } catch {
      setError('Não foi possível carregar o histórico.');
      onActivitiesLoaded?.(0);
    } finally {
      setLoading(false);
    }
  }, [onActivitiesLoaded]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const types = useMemo(() => {
    const set = new Set(activities.map((a) => a.type));
    return ['todos', ...Array.from(set)];
  }, [activities]);

  const filtered = useMemo(() => {
    const base =
      typeFilter === 'todos' ? activities : activities.filter((a) => a.type === typeFilter);
    return limit ? base.slice(0, limit) : base;
  }, [activities, typeFilter, limit]);

  return (
    <section className={`activity-timeline ${className}`.trim()} aria-label={title}>
      <div className="activity-timeline-head">
        <div>
          <h2 className="activity-timeline-title">{title}</h2>
          {subtitle && <p className="activity-timeline-subtitle">{subtitle}</p>}
        </div>
        {showFilters && types.length > 1 && (
          <div className="activity-timeline-filters" role="group" aria-label="Filtrar por tipo">
            {types.map((t) => (
              <button
                key={t}
                type="button"
                className={`historico-filter-pill ${typeFilter === t ? 'is-active' : ''}`}
                onClick={() => setTypeFilter(t)}
              >
                {t === 'todos' ? 'Todos' : ACTIVITY_TYPE_LABELS[t] || t}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="historico-loading">
          <Loader2 size={28} className="spinning" aria-hidden />
          <p>Carregando atividades…</p>
        </div>
      ) : error ? (
        <div className="historico-error">
          <p>{error}</p>
          <button type="button" className="retry-button" onClick={() => void load()}>
            Tentar novamente
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="historico-empty">
          <Activity size={40} className="empty-icon" aria-hidden />
          <p>Nenhuma atividade registrada ainda.</p>
          <p className="activity-timeline-empty-hint">
            Avance no diagnóstico, design ou difusão para alimentar o Domínio MID.
          </p>
        </div>
      ) : (
        <div className="historico-timeline">
          {filtered.map((act) => {
            const Icon = activityTypeIcon(act.type);
            const link = activityLinkForType(act.type);
            const expanded = expandedId === act.id;
            const meta = act.metadata || {};

            return (
              <article key={act.id} className="activity-card">
                <div className="activity-card-header">
                  <div className="activity-icon-wrapper">
                    <Icon size={18} aria-hidden />
                  </div>
                  <div className="activity-content">
                    <div className="activity-title-row">
                      <h3 className="activity-title">{act.title}</h3>
                      <span className="activity-type-badge">
                        {ACTIVITY_TYPE_LABELS[act.type] || act.type}
                      </span>
                    </div>
                    {act.description && act.description !== act.title && (
                      <p className="activity-description">{act.description}</p>
                    )}
                    <div className="activity-meta">
                      <span className="activity-date">
                        {new Date(act.createdAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="activity-actions">
                  {Object.keys(meta).length > 0 && (
                    <button
                      type="button"
                      className="activity-expand-button"
                      onClick={() => setExpandedId(expanded ? null : act.id)}
                    >
                      <ChevronRight size={14} className={expanded ? 'expanded' : ''} aria-hidden />
                      {expanded ? 'Ocultar' : 'Detalhes'}
                    </button>
                  )}
                  {link && (
                    <button type="button" className="activity-link-button" onClick={() => navigate(link)}>
                      Abrir seção
                    </button>
                  )}
                </div>
                {expanded && Object.keys(meta).length > 0 && (
                  <div className="activity-details">
                    <div className="activity-details-section">
                      <h4>Metadados</h4>
                      <div className="metadata-grid">
                        {Object.entries(meta).map(([key, value]) => (
                          <div key={key} className="metadata-item">
                            <span className="metadata-key">{key}</span>
                            <span className="metadata-value">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
