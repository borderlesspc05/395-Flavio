import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Bot,
  ChevronRight,
  FileText,
  Filter,
  History,
  Loader2,
  Target,
  Users,
} from 'lucide-react';
import { activitiesApi } from '../services/api';
import type { Activity as ActivityItem } from '../types';

type TypeFilter = 'todos' | string;

const TYPE_LABELS: Record<string, string> = {
  chat: 'Consultoria IA',
  objective: 'Objetivo',
  team: 'Equipe',
  report: 'Relatório',
};

function normalizeActivity(raw: Record<string, unknown>): ActivityItem {
  return {
    id: String(raw.id),
    type: String(raw.type ?? raw.tipo ?? 'info'),
    title: String(raw.title ?? raw.descricao ?? 'Atividade'),
    description: raw.description ? String(raw.description) : raw.descricao ? String(raw.descricao) : undefined,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    metadata: (raw.metadata as Record<string, unknown>) || undefined,
    relatedId: raw.relatedId ? String(raw.relatedId) : raw.entidadeId ? String(raw.entidadeId) : undefined,
  };
}

function typeIcon(type: string) {
  if (type === 'chat') return Bot;
  if (type === 'objective') return Target;
  if (type === 'team') return Users;
  if (type === 'report') return FileText;
  return Activity;
}

function linkForType(type: string): string | null {
  if (type === 'chat') return '/dashboard/consultoria-ia';
  if (type === 'objective') return '/dashboard/objetivos';
  if (type === 'team') return '/dashboard/minha-equipe';
  if (type === 'report') return '/dashboard/relatorios';
  return null;
}

export function HistoricoPage() {
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
      const list = (Array.isArray(data) ? data : []).map((a: Record<string, unknown>) => normalizeActivity(a));
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setActivities(list);
    } catch {
      setError('Não foi possível carregar o histórico.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const types = useMemo(() => {
    const set = new Set(activities.map((a) => a.type));
    return ['todos', ...Array.from(set)];
  }, [activities]);

  const filtered = useMemo(() => {
    if (typeFilter === 'todos') return activities;
    return activities.filter((a) => a.type === typeFilter);
  }, [activities, typeFilter]);

  return (
    <div className="historico-page">
      <header className="historico-header">
        <div className="historico-header-content">
          <div className="historico-icon-wrapper">
            <History size={28} />
          </div>
          <div>
            <h1 className="historico-title">Loop contínuo · 4.2</h1>
            <p className="historico-subtitle">
              Follow-up e rastreio — se não satisfeito ou para subir de nível, retome o Diagnóstico (passo 1)
            </p>
          </div>
        </div>
      </header>

      <div className="historico-filters">
        <div className="filter-group">
          <Filter size={18} className="filter-icon" />
          <span className="filter-label">Filtrar por tipo</span>
          <div className="filter-buttons">
            {types.map((t) => (
              <button
                key={t}
                type="button"
                className={`filter-button ${typeFilter === t ? 'active' : ''}`}
                onClick={() => setTypeFilter(t)}
              >
                {t === 'todos' ? 'Todos' : TYPE_LABELS[t] || t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="historico-loading">
          <Loader2 size={32} className="spinning" />
          <p>Carregando histórico...</p>
        </div>
      ) : error ? (
        <div className="historico-error">
          <p>{error}</p>
          <button type="button" className="retry-button" onClick={load}>
            Tentar novamente
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="historico-empty">
          <Activity size={48} className="empty-icon" />
          <p>Nenhuma atividade registrada.</p>
        </div>
      ) : (
        <div className="historico-list">
          {filtered.map((act) => {
            const Icon = typeIcon(act.type);
            const link = linkForType(act.type);
            const expanded = expandedId === act.id;
            const meta = act.metadata || {};

            return (
              <article key={act.id} className="activity-card">
                <div className="activity-card-header">
                  <div className="activity-icon-wrapper">
                    <Icon size={20} />
                  </div>
                  <div className="activity-content">
                    <div className="activity-title-row">
                      <h3 className="activity-title">{act.title}</h3>
                      <span className="activity-type-badge">{TYPE_LABELS[act.type] || act.type}</span>
                    </div>
                    {act.description && act.description !== act.title && (
                      <p className="activity-description">{act.description}</p>
                    )}
                    <div className="activity-meta">
                      <span className="activity-date">
                        <History size={14} />
                        {new Date(act.createdAt).toLocaleString('pt-BR')}
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
                      <ChevronRight size={16} className={expanded ? 'expanded' : ''} />
                      {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                    </button>
                  )}
                  {link && (
                    <button type="button" className="activity-link-button" onClick={() => navigate(link)}>
                      Ir para seção
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
                    {act.relatedId && (
                      <div className="activity-details-section">
                        <h4>ID relacionado</h4>
                        <code className="related-id">{act.relatedId}</code>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
