import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import {
  ArrowRight,
  BarChart3,
  Bot,
  Calendar,
  Download,
  FileText,
  Filter,
  GitBranch,
  Lightbulb,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { auth } from '../config/firebase';
import { ActionCanvasPanel } from '../components/ActionCanvasPanel';
import { MagnusMemoryBanner } from '../components/MagnusMemoryBanner';
import { objectivesApi } from '../services/api';
import { loadDesignDiffusionContext, type DesignDiffusionContext } from '../services/designDiffusionContext';
import {
  PRIORITY_LABELS,
  type Objective,
  type ObjectiveHorizon,
  type ObjectivePriority,
  type ObjectiveStatus,
} from '../types';

const STATUS_LABELS: Record<ObjectiveStatus, string> = {
  nao_iniciado: 'Não iniciado',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
};

const HORIZON_LABELS: Record<ObjectiveHorizon, string> = {
  curto: 'Curto prazo',
  medio: 'Médio prazo',
  longo: 'Longo prazo',
};

type StatusFilter = ObjectiveStatus | 'todos';
type PriorityFilter = ObjectivePriority | 'todos';
type HorizonFilter = ObjectiveHorizon | 'todos';
type SortKey = 'titulo' | 'prioridade' | 'prazo' | 'status';

interface SuggestedItem {
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade?: number | ObjectivePriority;
  horizonte?: ObjectiveHorizon;
  impacto?: string;
  responsavel?: string;
  insightOrigem?: string;
}

const EMPTY_FORM: Partial<Objective> = {
  titulo: '',
  descricao: '',
  categoria: 'Geral',
  prioridade: 'media',
  status: 'nao_iniciado',
  horizonte: 'medio',
  prazo: '',
  responsavel: '',
  impacto: '',
};

function numToPriority(n?: number): ObjectivePriority {
  if (n === 1) return 'alta';
  if (n === 3) return 'baixa';
  return 'media';
}

function priorityToNum(p: ObjectivePriority): number {
  if (p === 'alta') return 1;
  if (p === 'baixa') return 3;
  return 2;
}

function normalizeStatus(s?: string): ObjectiveStatus {
  if (s === 'em_andamento' || s === 'concluido') return s;
  if (s === 'pendente' || s === 'nao_iniciado') return 'nao_iniciado';
  return 'nao_iniciado';
}

function normalizeObjective(raw: Record<string, unknown>): Objective {
  const prioridade =
    typeof raw.prioridade === 'number'
      ? numToPriority(raw.prioridade)
      : (raw.prioridade as ObjectivePriority) || 'media';
  return {
    id: String(raw.id),
    titulo: String(raw.titulo ?? ''),
    descricao: String(raw.descricao ?? ''),
    categoria: String(raw.categoria ?? 'Geral'),
    prioridade,
    status: normalizeStatus(String(raw.status)),
    horizonte: (raw.horizonte as ObjectiveHorizon) || 'medio',
    prazo: raw.prazo ? String(raw.prazo) : undefined,
    responsavel: raw.responsavel ? String(raw.responsavel) : undefined,
    impacto: raw.impacto ? String(raw.impacto) : undefined,
    origem: raw.origem === 'ia' ? 'ia' : 'manual',
    insightOrigem: raw.insightOrigem ? String(raw.insightOrigem) : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

function isNearDeadline(prazo?: string) {
  if (!prazo) return false;
  const d = new Date(prazo);
  const now = new Date();
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= 14;
}

function defaultDueDate(horizon?: ObjectiveHorizon) {
  const days = horizon === 'curto' ? 30 : horizon === 'longo' ? 180 : 90;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function ObjetivosPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [designContext, setDesignContext] = useState<DesignDiffusionContext | null>(null);
  const [designContextLoading, setDesignContextLoading] = useState(true);
  const [autoSuggestConsumed, setAutoSuggestConsumed] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('todos');
  const [horizonFilter, setHorizonFilter] = useState<HorizonFilter>('todos');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('prioridade');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Objective | null>(null);
  const [form, setForm] = useState<Partial<Objective>>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedItem[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [difusaoTab, setDifusaoTab] = useState<'canvas' | 'objetivos'>('canvas');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await objectivesApi.list();
      const list = (Array.isArray(data) ? data : data?.items ?? []).map((o: Record<string, unknown>) =>
        normalizeObjective(o)
      );
      setObjectives(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reloadDesignContext = useCallback(() => {
    const user = auth.currentUser;
    if (!user) {
      setDesignContext(null);
      setDesignContextLoading(false);
      return;
    }
    setDesignContextLoading(true);
    loadDesignDiffusionContext(user.uid)
      .then(setDesignContext)
      .catch(() => setDesignContext(null))
      .finally(() => setDesignContextLoading(false));
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setDesignContext(null);
        setDesignContextLoading(false);
        return;
      }
      reloadDesignContext();
    });
    return unsub;
  }, [reloadDesignContext]);

  useEffect(() => {
    const state = location.state as {
      openCreateModal?: boolean;
      difusaoTab?: 'canvas' | 'objetivos';
    } | null;
    if (state?.difusaoTab) {
      setDifusaoTab(state.difusaoTab);
    }
    if (state?.openCreateModal) {
      setDifusaoTab('objetivos');
      setEditing(null);
      setForm({ ...EMPTY_FORM });
      setFormError(null);
      setModalOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const filtered = useMemo(() => {
    let list = [...objectives];
    if (statusFilter !== 'todos') list = list.filter((o) => o.status === statusFilter);
    if (priorityFilter !== 'todos') list = list.filter((o) => o.prioridade === priorityFilter);
    if (horizonFilter !== 'todos') list = list.filter((o) => o.horizonte === horizonFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (o) =>
          o.titulo.toLowerCase().includes(q) ||
          o.descricao.toLowerCase().includes(q) ||
          o.categoria.toLowerCase().includes(q)
      );
    }
    const prioOrder = { alta: 0, media: 1, baixa: 2 };
    const statusOrder = { nao_iniciado: 0, em_andamento: 1, concluido: 2 };
    list.sort((a, b) => {
      if (sortBy === 'titulo') return a.titulo.localeCompare(b.titulo);
      if (sortBy === 'prazo') return (a.prazo || '').localeCompare(b.prazo || '');
      if (sortBy === 'status') return statusOrder[a.status] - statusOrder[b.status];
      return prioOrder[a.prioridade] - prioOrder[b.prioridade];
    });
    return list;
  }, [objectives, statusFilter, priorityFilter, horizonFilter, search, sortBy]);

  const total = objectives.length;
  const iaCount = objectives.filter((o) => o.origem === 'ia').length;
  const emAndamento = objectives.filter((o) => o.status === 'em_andamento').length;
  const concluidos = objectives.filter((o) => o.status === 'concluido').length;
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (obj: Objective) => {
    setEditing(obj);
    setForm({ ...obj });
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm({ ...EMPTY_FORM });
  };

  const saveObjective = async () => {
    if (!form.titulo?.trim() || !form.descricao?.trim()) {
      setFormError('Título e descrição são obrigatórios.');
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      titulo: form.titulo.trim(),
      descricao: form.descricao.trim(),
      categoria: form.categoria || 'Geral',
      status: form.status === 'nao_iniciado' ? 'pendente' : form.status,
      prioridade: priorityToNum(form.prioridade || 'media'),
      prazo: form.prazo || undefined,
      horizonte: form.horizonte,
      responsavel: form.responsavel,
      impacto: form.impacto,
      origem: form.origem || 'manual',
    };
    try {
      if (editing) {
        await objectivesApi.update(editing.id, payload);
      } else {
        await objectivesApi.create(payload);
      }
      closeModal();
      await load();
    } catch {
      setFormError('Erro ao salvar objetivo.');
    } finally {
      setSaving(false);
    }
  };

  const deleteObjective = async (id: string) => {
    if (!window.confirm('Remover este objetivo?')) return;
    await objectivesApi.remove(id);
    await load();
  };

  const exportCsv = () => {
    const header = 'Título,Descrição,Categoria,Prioridade,Status,Horizonte,Prazo,Responsável,Origem\n';
    const rows = filtered
      .map((o) =>
        [
          o.titulo,
          o.descricao,
          o.categoria,
          PRIORITY_LABELS[o.prioridade],
          STATUS_LABELS[o.status],
          HORIZON_LABELS[o.horizonte],
          o.prazo || '',
          o.responsavel || '',
          o.origem === 'ia' ? 'IA' : 'Manual',
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `objetivos-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const loadSuggestions = useCallback(async () => {
    setSuggestLoading(true);
    setSuggestionsOpen(true);
    setSelectedSuggestions(new Set());
    setSuggestionsError(null);
    try {
      const res = await objectivesApi.suggest(designContext?.context);
      setSuggestions((res.suggestions ?? []) as SuggestedItem[]);
    } catch {
      setSuggestions([]);
      setSuggestionsError('Não foi possível gerar sugestões agora. Verifique a conexão e tente novamente.');
    } finally {
      setSuggestLoading(false);
    }
  }, [designContext?.context]);

  useEffect(() => {
    const state = location.state as { generateFromDesign?: boolean } | null;
    if (
      !state?.generateFromDesign ||
      autoSuggestConsumed ||
      designContextLoading ||
      !designContext?.diagnosticComplete
    ) {
      return;
    }
    setAutoSuggestConsumed(true);
    void loadSuggestions();
    navigate(location.pathname, { replace: true, state: {} });
  }, [
    autoSuggestConsumed,
    designContext?.diagnosticComplete,
    designContextLoading,
    loadSuggestions,
    location.pathname,
    location.state,
    navigate,
  ]);

  const importSuggestions = async () => {
    const selected = suggestions.filter((_, i) => selectedSuggestions.has(i));
    if (selected.length === 0) return;
    setImportLoading(true);
    setSuggestionsError(null);
    try {
      const safeSelected = selected
        .map((s) => ({
          ...s,
          titulo: String(s.titulo ?? '').trim(),
          descricao: String(s.descricao ?? '').trim(),
        }))
        .filter((s) => s.titulo && s.descricao);

      if (safeSelected.length === 0) {
        setSuggestionsError('As sugestões selecionadas não têm título/descrição válidos.');
        return;
      }

      const results = await Promise.allSettled(
        safeSelected.map(async (s) => {
          const prioridade =
            typeof s.prioridade === 'number' ? numToPriority(s.prioridade) : s.prioridade || 'media';
          const horizonte = s.horizonte || 'medio';
          await objectivesApi.create({
            titulo: s.titulo,
            descricao: s.descricao,
            categoria: s.categoria || 'Geral',
            status: 'pendente',
            prioridade: priorityToNum(prioridade),
            origem: 'ia',
            horizonte,
            prazo: defaultDueDate(horizonte),
            impacto: s.impacto || '',
            responsavel: s.responsavel || '',
            insightOrigem: s.insightOrigem || '',
          });
        })
      );

      const okCount = results.filter((r) => r.status === 'fulfilled').length;
      const fail = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;

      if (okCount === 0) {
        const err = fail?.reason as { response?: { data?: { error?: string } }; message?: string } | undefined;
        const detail = err?.response?.data?.error || err?.message || '';
        setSuggestionsError(
          detail
            ? `Não foi possível adicionar os objetivos: ${detail}`
            : 'Não foi possível adicionar os objetivos agora. Tente novamente em instantes.'
        );
        return;
      }

      if (okCount < safeSelected.length) {
        setSuggestionsError(`${okCount} objetivo(s) adicionados. Alguns falharam, tente importar o restante.`);
      }

      await load();
      if (okCount === safeSelected.length) {
        setSuggestionsOpen(false);
      }
    } catch {
      setSuggestionsError('Não foi possível adicionar os objetivos agora. Tente novamente em instantes.');
    } finally {
      setImportLoading(false);
    }
  };

  const toggleSuggestion = (index: number) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAllSuggestions = () => {
    if (selectedSuggestions.size === suggestions.length) {
      setSelectedSuggestions(new Set());
    } else {
      setSelectedSuggestions(new Set(suggestions.map((_, i) => i)));
    }
  };

  return (
    <div className="objetivos-page">
      <header className="objetivos-header difusao-wave-header">
        <div className="objetivos-title-group">
          <div className="objetivos-icon-wrapper" aria-hidden>
            <Target size={26} />
          </div>
          <div className="objetivos-title-copy">
            <span className="difusao-header-eyebrow">MAGNUS WAVES™ · Onda 3</span>
            <h1 className="objetivos-title">Difusão</h1>
            <p className="objetivos-subtitle">
              Execute planos, monitore riscos e acompanhe o progresso até a entrega final.
            </p>
          </div>
        </div>
      </header>

      <MagnusMemoryBanner
        meta={designContext?.meta ?? null}
        statusLabel={designContext?.statusLabel}
        loading={designContextLoading}
      />

      <ActionCanvasPanel
        canUseAi={Boolean(designContext?.diagnosticComplete)}
        onCanvasClosed={() => reloadDesignContext()}
      />

      {false && difusaoTab === 'objetivos' && (
        <>
      <div className="objetivos-summary">
        <div className="objetivo-summary-card">
          <span className="summary-label">Total</span>
          <span className="summary-value">{total}</span>
        </div>
        <div className="objetivo-summary-card">
          <span className="summary-label">Gerados por IA</span>
          <span className="summary-value">{iaCount}</span>
        </div>
        <div className="objetivo-summary-card">
          <span className="summary-label">Em andamento</span>
          <span className="summary-value">{emAndamento}</span>
        </div>
        <div className="objetivo-summary-card">
          <span className="summary-label">Concluídos</span>
          <span className="summary-value">{concluidos}</span>
        </div>
        <div className="objetivo-summary-card">
          <span className="summary-label">Taxa de conclusão</span>
          <span className="summary-value">{pct}%</span>
        </div>
      </div>

      <section className={`design-diffusion-panel ${designContext?.ready ? 'is-ready' : ''}`}>
        <div className="design-diffusion-main">
          <div className="design-diffusion-icon">
            <GitBranch size={22} />
          </div>
          <div>
            <span className="design-diffusion-eyebrow">Onda 2 {'->'} Onda 3</span>
            <h2 className="design-diffusion-title">Design conectado à Difusão</h2>
            <p className="design-diffusion-text">
              {designContextLoading
                ? 'Lendo diagnóstico e MM Blueprint...'
                : designContext?.statusLabel ||
                  'Complete o diagnóstico para a IA transformar a leitura em objetivos.'}
            </p>
          </div>
        </div>
        <div className="design-diffusion-steps" aria-label="Fluxo Design para Difusão">
          <span>
            <FileText size={14} />
            Diagnóstico
          </span>
          <span>
            <GitBranch size={14} />
            MM Blueprint
          </span>
          <span>
            <Target size={14} />
            Objetivos
          </span>
        </div>
        <button
          type="button"
          className="design-diffusion-button"
          onClick={loadSuggestions}
          disabled={suggestLoading || designContextLoading || !designContext?.diagnosticComplete}
          title={!designContext?.diagnosticComplete ? 'Complete o diagnóstico antes de gerar objetivos' : undefined}
        >
          <RefreshCw size={17} />
          {suggestLoading ? 'Gerando...' : 'Gerar objetivos do Design'}
        </button>
      </section>

      <div className="objetivos-actions-bar">
        <div className="objetivos-search">
          <Search size={18} />
          <input
            type="search"
            className="objetivos-search-input"
            placeholder="Buscar objetivos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="objetivos-actions-group">
          <select className="objetivos-order-select" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
            <option value="prioridade">Ordenar: Prioridade</option>
            <option value="titulo">Ordenar: Título</option>
            <option value="prazo">Ordenar: Prazo</option>
            <option value="status">Ordenar: Status</option>
          </select>
          <button type="button" className="objetivos-action-button" onClick={exportCsv} title="Exportar CSV">
            <Download size={18} />
          </button>
        </div>
      </div>

      <div className="objetivos-filters">
        <div className="objetivos-filter-group">
          <span className="objetivos-filter-label">
            <Filter size={16} />
            Status
          </span>
          <div className="objetivos-filter-chips">
            {(['todos', 'nao_iniciado', 'em_andamento', 'concluido'] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={`objetivos-filter-chip ${statusFilter === s ? 'active' : ''}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'todos' ? 'Todos' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
        <div className="objetivos-filter-group">
          <span className="objetivos-filter-label">Prioridade</span>
          <div className="objetivos-filter-chips">
            {(['todos', 'alta', 'media', 'baixa'] as const).map((p) => (
              <button
                key={p}
                type="button"
                className={`objetivos-filter-chip ${priorityFilter === p ? 'active' : ''}`}
                onClick={() => setPriorityFilter(p)}
              >
                {p === 'todos' ? 'Todas' : PRIORITY_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
        <div className="objetivos-filter-group">
          <span className="objetivos-filter-label">Horizonte</span>
          <div className="objetivos-filter-chips">
            {(['todos', 'curto', 'medio', 'longo'] as const).map((h) => (
              <button
                key={h}
                type="button"
                className={`objetivos-filter-chip ${horizonFilter === h ? 'active' : ''}`}
                onClick={() => setHorizonFilter(h)}
              >
                {h === 'todos' ? 'Todos' : HORIZON_LABELS[h]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="objetivos-header-buttons" style={{ marginBottom: '1rem' }}>
        <button type="button" className="objetivos-primary-button" onClick={openCreate}>
          <Plus size={18} />
          Novo objetivo
        </button>
        <button type="button" className="objetivos-secondary-button" onClick={loadSuggestions}>
          <Lightbulb size={18} />
          Sugerir com IA
        </button>
      </div>

      <section className="objetivos-list-section">
        {loading ? (
          <p className="activity-list-loading">Carregando objetivos...</p>
        ) : filtered.length === 0 ? (
          <div className="objetivos-empty-state">
            <h3 className="objetivos-empty-title">Nenhum objetivo encontrado</h3>
            <p className="objetivos-empty-description">
              Crie um objetivo manualmente ou use a Consultoria IA para gerar sugestões.
            </p>
            <button type="button" className="objetivos-primary-button" onClick={openCreate}>
              Criar objetivo
            </button>
          </div>
        ) : (
          <div className="objetivos-grid">
            {filtered.map((obj) => (
              <article key={obj.id} className="objetivo-card">
                <div className="objetivo-card-header">
                  <div>
                    <h3 className="objetivo-title">{obj.titulo}</h3>
                    <p className="objetivo-category">{obj.categoria}</p>
                  </div>
                  <div className="objetivo-tags">
                    <span className={`objetivo-tag prioridade-${obj.prioridade}`}>
                      {PRIORITY_LABELS[obj.prioridade]}
                    </span>
                    <span className={`objetivo-tag status-${obj.status}`}>
                      {STATUS_LABELS[obj.status]}
                    </span>
                    <span className="objetivo-tag horizonte-tag">{HORIZON_LABELS[obj.horizonte]}</span>
                  </div>
                  <div className="objetivo-card-actions">
                    <button type="button" className="objetivo-action-icon" onClick={() => openEdit(obj)} aria-label="Editar">
                      <Pencil size={16} />
                    </button>
                    <button type="button" className="objetivo-action-icon" onClick={() => deleteObjective(obj.id)} aria-label="Excluir">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="objetivo-description">{obj.descricao}</p>
                {obj.impacto && <p className="objetivo-impact"><strong>Impacto esperado:</strong> {obj.impacto}</p>}
                <div className="objetivo-meta">
                  {obj.prazo && (
                    <div className="objetivo-meta-item">
                      <span className="meta-label">Prazo</span>
                      <span className={`meta-value ${isNearDeadline(obj.prazo) ? 'near-deadline' : ''}`}>
                        <Calendar size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                        {new Date(obj.prazo).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                  {obj.responsavel && (
                    <div className="objetivo-meta-item">
                      <span className="meta-label">Responsável</span>
                      <span className="meta-value">
                        <User size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                        {obj.responsavel}
                      </span>
                    </div>
                  )}
                </div>
                {obj.origem === 'ia' && (
                  <div className="objetivo-origin">
                    <span className="objetivo-origin-label">
                      <Bot size={14} />
                      Gerado por IA
                    </span>
                    {obj.insightOrigem && <p className="objetivo-origin-text">{obj.insightOrigem}</p>}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {modalOpen && (
        <div className="objetivo-modal-overlay" onClick={closeModal}>
          <div className="objetivo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="objetivo-modal-header">
              <h2 className="objetivo-modal-title">{editing ? 'Editar objetivo' : 'Novo objetivo'}</h2>
              <button type="button" className="objetivo-modal-close" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>
            <form
              className="objetivo-modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                saveObjective();
              }}
            >
              {formError && <div className="objetivo-modal-error-message">{formError}</div>}
              <div className="objetivo-modal-field">
                <label className="objetivo-modal-label">Título *</label>
                <input
                  className="objetivo-modal-input"
                  value={form.titulo || ''}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                />
              </div>
              <div className="objetivo-modal-field">
                <label className="objetivo-modal-label">Descrição *</label>
                <textarea
                  className="objetivo-modal-textarea"
                  value={form.descricao || ''}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </div>
              <div className="objetivo-modal-row">
                <div className="objetivo-modal-field">
                  <label className="objetivo-modal-label">Categoria</label>
                  <input
                    className="objetivo-modal-input"
                    value={form.categoria || ''}
                    onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  />
                </div>
                <div className="objetivo-modal-field">
                  <label className="objetivo-modal-label">Prazo</label>
                  <input
                    type="date"
                    className="objetivo-modal-input"
                    value={form.prazo || ''}
                    onChange={(e) => setForm({ ...form, prazo: e.target.value })}
                  />
                </div>
              </div>
              <div className="objetivo-modal-row">
                <div className="objetivo-modal-field">
                  <label className="objetivo-modal-label">Prioridade</label>
                  <select
                    className="objetivo-modal-select"
                    value={form.prioridade}
                    onChange={(e) => setForm({ ...form, prioridade: e.target.value as ObjectivePriority })}
                  >
                    <option value="alta">Alta</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </div>
                <div className="objetivo-modal-field">
                  <label className="objetivo-modal-label">Status</label>
                  <select
                    className="objetivo-modal-select"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as ObjectiveStatus })}
                  >
                    <option value="nao_iniciado">Não iniciado</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>
              </div>
              <div className="objetivo-modal-row">
                <div className="objetivo-modal-field">
                  <label className="objetivo-modal-label">Horizonte</label>
                  <select
                    className="objetivo-modal-select"
                    value={form.horizonte}
                    onChange={(e) => setForm({ ...form, horizonte: e.target.value as ObjectiveHorizon })}
                  >
                    <option value="curto">Curto prazo</option>
                    <option value="medio">Médio prazo</option>
                    <option value="longo">Longo prazo</option>
                  </select>
                </div>
                <div className="objetivo-modal-field">
                  <label className="objetivo-modal-label">Responsável</label>
                  <input
                    className="objetivo-modal-input"
                    value={form.responsavel || ''}
                    onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                  />
                </div>
              </div>
              <div className="objetivo-modal-field">
                <label className="objetivo-modal-label">Impacto esperado</label>
                <textarea
                  className="objetivo-modal-textarea"
                  value={form.impacto || ''}
                  onChange={(e) => setForm({ ...form, impacto: e.target.value })}
                />
              </div>
              <div className="objetivo-modal-actions">
                <button type="button" className="objetivo-modal-button-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="objetivo-modal-button-primary" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        </>
      )}

      {difusaoTab === 'objetivos' && suggestionsOpen && (
        <div className="suggestions-modal-overlay" onClick={() => setSuggestionsOpen(false)}>
          <div className="suggestions-modal" onClick={(e) => e.stopPropagation()}>
            <div className="suggestions-modal-header">
              <div>
                <h2 className="suggestions-modal-title">
                  <Sparkles size={20} />
                  Sugestões de objetivos
                </h2>
                <p className="suggestions-modal-subtitle">Selecione os objetivos sugeridos pela IA para adicionar</p>
              </div>
              <button type="button" className="suggestions-modal-close" onClick={() => setSuggestionsOpen(false)}>
                <X size={20} />
              </button>
            </div>
            {suggestLoading ? (
              <p className="suggestions-modal-loading">Gerando sugestões...</p>
            ) : suggestions.length === 0 ? (
              <p className="suggestions-modal-empty">Nenhuma sugestão disponível.</p>
            ) : (
              <>
                <div className="suggestions-modal-actions-top">
                  <button type="button" className="suggestions-modal-select-all" onClick={selectAllSuggestions}>
                    {selectedSuggestions.size === suggestions.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                  <span className="suggestions-modal-count">
                    {selectedSuggestions.size} de {suggestions.length} selecionados
                  </span>
                </div>
                {suggestionsError && <div className="objetivo-modal-error-message">{suggestionsError}</div>}
                <div className="suggestions-modal-list">
                  {suggestions.map((s, i) => {
                    const prio =
                      typeof s.prioridade === 'number' ? numToPriority(s.prioridade) : s.prioridade || 'media';
                    return (
                      <div
                        key={i}
                        className={`suggestion-card ${selectedSuggestions.has(i) ? 'selected' : ''}`}
                        onClick={() => toggleSuggestion(i)}
                      >
                        <div className="suggestion-card-checkbox">
                          <input type="checkbox" checked={selectedSuggestions.has(i)} readOnly />
                        </div>
                        <div className="suggestion-card-content">
                          <div className="suggestion-card-header">
                            <h3 className="suggestion-card-title">{s.titulo}</h3>
                            <div className="suggestion-card-tags">
                              <span className={`suggestion-tag priority-${prio}`}>
                                {PRIORITY_LABELS[prio]}
                              </span>
                              {s.horizonte && (
                                <span className="suggestion-tag horizonte-tag">
                                  {HORIZON_LABELS[s.horizonte]}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="suggestion-card-description">{s.descricao}</p>
                          <p className="suggestion-card-category">
                            <strong>Categoria:</strong> {s.categoria}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="suggestions-modal-actions">
                  <button type="button" className="suggestions-modal-button-secondary" onClick={() => setSuggestionsOpen(false)}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="suggestions-modal-button-primary"
                    disabled={selectedSuggestions.size === 0 || importLoading}
                    onClick={importSuggestions}
                  >
                    {importLoading ? 'Adicionando...' : 'Adicionar selecionados'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <section className="mid-diffusion-panel" aria-labelledby="mid-conclude-title">
        <div className="mid-diffusion-panel-copy">
          <h2 id="mid-conclude-title" className="mid-diffusion-title">
            Concluir Difusão
          </h2>
          <p className="mid-diffusion-subtitle">
            Finalize a etapa de Difusão e avance para a fase final de avaliação dos resultados e impactos gerados no
            Domínio.
          </p>
        </div>
        <button
          type="button"
          className="mid-diffusion-conclude"
          onClick={() =>
            navigate('/dashboard/relatorios', {
              state: {
                autoGenerate: true,
                midConcludeNotice: 'Difusão concluída. Gerando relatório Domínio…',
              },
            })
          }
        >
          <BarChart3 size={18} aria-hidden />
          Concluir Difusão
          <ArrowRight size={16} aria-hidden />
        </button>
      </section>
    </div>
  );
}
