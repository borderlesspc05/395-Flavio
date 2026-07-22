import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardList,
  Lock,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import { auth } from '../config/firebase';
import { actionCanvasesApi } from '../services/api';
import { loadMagnusWavesMemory } from '../services/magnusWavesMemory';
import { syncMagnusMemoryAfterCanvasChange } from '../services/magnusMemorySync';
import type {
  ActionCanvas,
  ActionCanvasDelivery,
  ActionCanvasRisk,
  ActionCanvasSignOff,
  DeliveryStatus,
  SuggestedActionCanvasDraft,
} from '../types';

const MAX_CANVASES = 5;
const MAX_ENTREGAS = 10;
const MAX_RISCOS = 8;

const STEPS = [
  { id: 1, title: 'A mudança', hint: 'Defina a iniciativa e quem lidera' },
  { id: 2, title: 'Execução', hint: 'Distribua entregas com dono e prazo' },
  { id: 3, title: 'Riscos', hint: 'Antecipe e defina ações' },
  { id: 4, title: 'Sign-off', hint: 'Encerre e envie ao Intelligence Dashboard' },
] as const;

const STATUS_OPTIONS: { value: DeliveryStatus; label: string }[] = [
  { value: 'verde', label: 'No prazo' },
  { value: 'amarelo', label: 'Atenção' },
  { value: 'vermelho', label: 'Atrasado' },
];

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyDelivery(): ActionCanvasDelivery {
  return {
    id: newId('del'),
    entrega: '',
    responsavel: '',
    prazo: '',
    status: 'amarelo',
    evidencia: '',
  };
}

function emptyRisk(): ActionCanvasRisk {
  return {
    id: newId('risk'),
    risco: '',
    acaoTomar: '',
    impacto: 'medio',
    probabilidade: 'media',
    responsavel: '',
    status: 'nao_iniciado',
  };
}

function blankCanvas(): Omit<ActionCanvas, 'id'> {
  return {
    nomeIniciativa: '',
    objetivoEspecifico: '',
    owner: '',
    sponsor: '',
    prazoFinal: '',
    entregas: [emptyDelivery(), emptyDelivery()],
    riscos: [emptyRisk()],
    signOff: 'pendente',
    fechado: false,
  };
}

function normalizeCanvas(raw: Record<string, unknown>): ActionCanvas {
  return {
    id: String(raw.id),
    nomeIniciativa: String(raw.nomeIniciativa ?? ''),
    objetivoEspecifico: String(raw.objetivoEspecifico ?? ''),
    owner: String(raw.owner ?? ''),
    sponsor: String(raw.sponsor ?? ''),
    prazoFinal: String(raw.prazoFinal ?? ''),
    entregas: Array.isArray(raw.entregas) ? (raw.entregas as ActionCanvasDelivery[]) : [],
    riscos: Array.isArray(raw.riscos) ? (raw.riscos as ActionCanvasRisk[]) : [],
    signOff: (raw.signOff as ActionCanvasSignOff) || 'pendente',
    fechado: Boolean(raw.fechado),
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

function deliverySummary(canvas: ActionCanvas) {
  const filled = canvas.entregas.filter((e) => e.entrega.trim());
  return {
    total: filled.length,
    verde: filled.filter((e) => e.status === 'verde').length,
    amarelo: filled.filter((e) => e.status === 'amarelo').length,
    vermelho: filled.filter((e) => e.status === 'vermelho').length,
  };
}

function stepDone(step: number, draft: ActionCanvas): boolean {
  switch (step) {
    case 1:
      return Boolean(draft.nomeIniciativa.trim() && draft.owner.trim());
    case 2:
      return draft.entregas.some((e) => e.entrega.trim() && e.responsavel.trim());
    case 3:
      return draft.riscos.some((r) => r.risco.trim());
    case 4:
      return draft.fechado;
    default:
      return false;
  }
}

interface ActionCanvasPanelProps {
  onCanvasClosed?: () => void;
  /** Diagnóstico concluído — necessário para gerar automaticamente */
  canUseAi?: boolean;
}

export function ActionCanvasPanel({ onCanvasClosed, canUseAi = false }: ActionCanvasPanelProps) {
  const navigate = useNavigate();
  const [canvases, setCanvases] = useState<ActionCanvas[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ActionCanvas | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiImporting, setAiImporting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<SuggestedActionCanvasDraft[]>([]);
  const [aiSelected, setAiSelected] = useState<Set<number>>(new Set());
  const [aiDemoMode, setAiDemoMode] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await actionCanvasesApi.list();
      const list = (Array.isArray(data) ? data : []).map((c) =>
        normalizeCanvas(c as unknown as Record<string, unknown>)
      );
      setCanvases(list);
    } catch {
      setError('Não foi possível carregar os Action Canvas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCanvas = (canvas: ActionCanvas) => {
    setActiveId(canvas.id);
    setDraft({ ...canvas, entregas: [...canvas.entregas], riscos: [...canvas.riscos] });
    setCurrentStep(canvas.fechado ? 4 : 1);
    setError(null);
    setNotice(null);
  };

  const startNew = async () => {
    if (canvases.length >= MAX_CANVASES) return;
    setSaving(true);
    setError(null);
    try {
      const created = await actionCanvasesApi.create(blankCanvas());
      const normalized = normalizeCanvas(created as unknown as Record<string, unknown>);
      setCanvases((prev) => [normalized, ...prev]);
      openCanvas(normalized);
      setNotice('Novo Action Canvas criado. Preencha o passo 1 e salve quando quiser.');
    } catch {
      setError('Não foi possível criar um novo Action Canvas.');
    } finally {
      setSaving(false);
    }
  };

  const saveDraft = async (silent?: boolean) => {
    if (!draft) return false;
    setSaving(true);
    setError(null);
    try {
      const updated = await actionCanvasesApi.update(draft.id, draft);
      const normalized = normalizeCanvas(updated as unknown as Record<string, unknown>);
      setCanvases((prev) => prev.map((c) => (c.id === normalized.id ? normalized : c)));
      setDraft(normalized);
      if (!silent) {
        setNotice('Rascunho salvo com sucesso.');
        void syncMagnusMemoryAfterCanvasChange();
      }
      return true;
    } catch {
      setError('Erro ao salvar. Tente novamente.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const setSignOff = async (signOff: ActionCanvasSignOff) => {
    if (!draft || draft.fechado) return;
    const ok = await saveDraft(true);
    if (!ok) return;

    const next = { ...draft, signOff, fechado: true };
    setSaving(true);
    setError(null);
    try {
      const updated = await actionCanvasesApi.update(next.id, next);
      const normalized = normalizeCanvas(updated as unknown as Record<string, unknown>);
      setCanvases((prev) => prev.map((c) => (c.id === normalized.id ? normalized : c)));
      setDraft(null);
      setActiveId(null);
      void syncMagnusMemoryAfterCanvasChange();
      onCanvasClosed?.();
      if (signOff === 'sim') {
        navigate('/dashboard/relatorios', {
          state: {
            autoGenerate: true,
            midConcludeNotice:
              'Action Canvas encerrado com sign-off positivo. Gerando relatório Domínio (ID)...',
          },
        });
        return;
      }
      setNotice('Action Canvas encerrado. Resultados disponíveis no Intelligence Dashboard.');
    } catch {
      setError('Erro ao registrar sign-off.');
    } finally {
      setSaving(false);
    }
  };

  const reopenCanvas = async (canvas: ActionCanvas) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await actionCanvasesApi.update(canvas.id, {
        ...canvas,
        signOff: 'pendente',
        fechado: false,
      });
      const normalized = normalizeCanvas(updated as unknown as Record<string, unknown>);
      setCanvases((prev) => prev.map((c) => (c.id === normalized.id ? normalized : c)));
      openCanvas(normalized);
      setNotice('Action Canvas reaberto para edição.');
    } catch {
      setError('Não foi possível reabrir.');
    } finally {
      setSaving(false);
    }
  };

  const removeCanvas = async (id: string, name?: string) => {
    const label = name?.trim() || 'este Action Canvas';
    if (!window.confirm(`Remover "${label}"? Esta ação não pode ser desfeita.`)) return;

    setSaving(true);
    setError(null);
    try {
      await actionCanvasesApi.remove(id);
      setCanvases((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) {
        setActiveId(null);
        setDraft(null);
      }
      setNotice('Action Canvas removido.');
    } catch {
      setError('Não foi possível excluir. Verifique se o servidor está rodando.');
    } finally {
      setSaving(false);
    }
  };

  const updateDelivery = (index: number, patch: Partial<ActionCanvasDelivery>) => {
    if (!draft) return;
    const entregas = draft.entregas.map((e, i) => (i === index ? { ...e, ...patch } : e));
    setDraft({ ...draft, entregas });
  };

  const updateRisk = (index: number, patch: Partial<ActionCanvasRisk>) => {
    if (!draft) return;
    const riscos = draft.riscos.map((r, i) => (i === index ? { ...r, ...patch } : r));
    setDraft({ ...draft, riscos });
  };

  const readOnly = Boolean(draft?.fechado);

  const progressPct = useMemo(() => {
    if (!draft) return 0;
    const done = STEPS.filter((s) => stepDone(s.id, draft)).length;
    return Math.round((done / STEPS.length) * 100);
  }, [draft]);

  const goNext = async () => {
    if (!draft || readOnly) return;
    await saveDraft(true);
    setCurrentStep((s) => Math.min(4, s + 1));
  };

  const goPrev = () => setCurrentStep((s) => Math.max(1, s - 1));

  const openAiModal = async () => {
    if (!canUseAi || canvases.length >= MAX_CANVASES) return;
    const user = auth.currentUser;
    if (!user) {
      setError('Faça login para gerar iniciativas.');
      return;
    }

    setAiModalOpen(true);
    setAiLoading(true);
    setAiSuggestions([]);
    setAiSelected(new Set());
    setAiDemoMode(false);
    setError(null);

    try {
      const memory = await loadMagnusWavesMemory(user.uid);
      const res = await actionCanvasesApi.suggest({
        diagnosticContext: memory.diagnosticContext || undefined,
        gateContext: memory.gateContext || undefined,
      });
      setAiSuggestions(res.suggestions ?? []);
      setAiDemoMode(Boolean(res.demoMode));
      setAiSelected(new Set(res.suggestions?.map((_, i) => i) ?? []));
      if (!res.suggestions?.length) {
        setError('Não há slots disponíveis ou a IA não retornou sugestões.');
        setAiModalOpen(false);
      }
    } catch {
      setError('Não foi possível gerar iniciativas. Verifique o servidor.');
      setAiModalOpen(false);
    } finally {
      setAiLoading(false);
    }
  };

  const toggleAiSelection = (index: number) => {
    setAiSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const importAiSuggestions = async () => {
    const selected = aiSuggestions.filter((_, i) => aiSelected.has(i));
    if (!selected.length) return;

    setAiImporting(true);
    setError(null);
    try {
      const created: ActionCanvas[] = [];
      for (const draft of selected) {
        if (canvases.length + created.length >= MAX_CANVASES) break;
        const body = {
          nomeIniciativa: draft.nomeIniciativa,
          objetivoEspecifico: draft.objetivoEspecifico,
          owner: draft.owner,
          sponsor: draft.sponsor,
          prazoFinal: draft.prazoFinal,
          signOff: 'pendente' as const,
          fechado: false,
          entregas: draft.entregas.map((e) => ({
            id: newId('del'),
            entrega: e.entrega,
            responsavel: e.responsavel,
            prazo: e.prazo,
            status: e.status ?? 'amarelo',
            evidencia: e.evidencia ?? '',
          })),
          riscos: draft.riscos.map((r) => ({
            id: newId('risk'),
            risco: r.risco,
            acaoTomar: r.acaoTomar,
            impacto: 'medio' as const,
            probabilidade: 'media' as const,
            responsavel: '',
            status: 'nao_iniciado' as const,
          })),
        };
        const raw = await actionCanvasesApi.create(body);
        created.push(normalizeCanvas(raw as unknown as Record<string, unknown>));
      }
      setCanvases((prev) => [...created, ...prev]);
      if (created[0]) openCanvas(created[0]);
      setAiModalOpen(false);
      setNotice(
        `${created.length} Action Canvas criado${created.length > 1 ? 's' : ''} automaticamente. Revise e salve se necessário.`
      );
      void syncMagnusMemoryAfterCanvasChange();
      onCanvasClosed?.();
    } catch {
      setError('Erro ao importar sugestões. Tente novamente.');
    } finally {
      setAiImporting(false);
    }
  };

  const quotaPct = Math.round((canvases.length / MAX_CANVASES) * 100);
  const slotsLeft = MAX_CANVASES - canvases.length;

  return (
    <section className="action-canvas-panel" aria-labelledby="action-canvas-heading">
      <div className="action-canvas-panel-inner">
      <header className="action-canvas-panel-header">
        <div className="action-canvas-header-copy">
          <span className="action-canvas-wave-mark" aria-hidden>
            03
          </span>
          <div>
            <span className="action-canvas-eyebrow">SPRINT WAVES™ · Difusão</span>
            <h2 id="action-canvas-heading" className="action-canvas-panel-title">
              Action Canvas
            </h2>
            <p className="action-canvas-panel-subtitle">
              Passo a passo: defina a mudança, execute, trate riscos e encerre. Até {MAX_CANVASES}{' '}
              iniciativas.
            </p>
          </div>
        </div>
        <div className="action-canvas-header-actions">
          <div
            className="action-canvas-quota-ring"
            style={{ '--quota-pct': `${quotaPct}%` } as Record<string, string>}
            title={`${canvases.length} de ${MAX_CANVASES} iniciativas`}
          >
            <span className="action-canvas-quota-value">
              {canvases.length}<span className="action-canvas-quota-sep">/</span>{MAX_CANVASES}
            </span>
          </div>
          <button
            type="button"
            className="action-canvas-ai-button"
            onClick={() => void openAiModal()}
            disabled={saving || aiLoading || !canUseAi || slotsLeft <= 0}
            title={
              !canUseAi
                ? 'Complete o diagnóstico Sprint Waves primeiro'
                : slotsLeft <= 0
                  ? 'Limite de 5 Action Canvas atingido'
                  : 'Gerar iniciativas a partir do diagnóstico e da escolha de caminho'
            }
          >
            <Sparkles size={17} />
            Gerar iniciativas
          </button>
          <button
            type="button"
            className="action-canvas-new-button"
            onClick={() => void startNew()}
            disabled={saving || canvases.length >= MAX_CANVASES}
          >
            <Plus size={18} />
            Nova iniciativa
          </button>
        </div>
      </header>

      {notice && (
        <p className="action-canvas-notice" role="status">
          <CheckCircle2 size={16} aria-hidden />
          {notice}
        </p>
      )}
      {error && (
        <p className="action-canvas-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="action-canvas-loading" aria-busy="true" aria-label="Carregando">
          <div className="action-canvas-skeleton action-canvas-skeleton--list" />
          <div className="action-canvas-skeleton action-canvas-skeleton--editor" />
        </div>
      ) : (
        <div className="action-canvas-layout">
          <aside className="action-canvas-list-shell" aria-label="Suas iniciativas">
          <div className="action-canvas-list">
            <h3 className="action-canvas-list-heading">Suas iniciativas</h3>
            {canvases.length === 0 ? (
              <div className="action-canvas-list-empty-card">
                <Sparkles size={28} />
                <p>Comece criando sua primeira mudança prática.</p>
                <button type="button" className="action-canvas-new-button" onClick={() => void startNew()}>
                  <Plus size={16} />
                  Criar agora
                </button>
              </div>
            ) : (
              canvases.map((c) => {
                const sum = deliverySummary(c);
                const isActive = activeId === c.id;
                return (
                  <div
                    key={c.id}
                    className={`action-canvas-list-item ${isActive ? 'active' : ''} ${c.fechado ? 'closed' : ''}`}
                  >
                    <button type="button" className="action-canvas-list-item-main" onClick={() => openCanvas(c)}>
                      <div className="action-canvas-list-item-top">
                        {c.fechado ? <Lock size={14} /> : <ClipboardList size={14} />}
                        <span className="action-canvas-list-item-title">
                          {c.nomeIniciativa || 'Sem nome'}
                        </span>
                      </div>
                      <div className="action-canvas-list-badges">
                        {c.fechado ? (
                          <span className="ac-badge ac-badge-done">
                            Encerrado · {c.signOff === 'sim' ? 'SIM' : 'NÃO'}
                          </span>
                        ) : (
                          <span className="ac-badge ac-badge-draft">Em andamento</span>
                        )}
                        {sum.total > 0 && (
                          <span className="ac-badge ac-badge-counts">
                            <span className="ac-count">
                              <i className="ac-count-dot ac-count-dot--verde" aria-hidden />
                              {sum.verde}
                            </span>
                            <span className="ac-count">
                              <i className="ac-count-dot ac-count-dot--vermelho" aria-hidden />
                              {sum.vermelho}
                            </span>
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      type="button"
                      className="action-canvas-list-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        void removeCanvas(c.id, c.nomeIniciativa);
                      }}
                      disabled={saving}
                      aria-label={`Excluir ${c.nomeIniciativa || 'iniciativa'}`}
                      title="Excluir"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
          </aside>

          <div className="action-canvas-editor-wrap">
            {!draft ? (
              <div className="action-canvas-editor-placeholder">
                <div className="action-canvas-placeholder-icon">
                  <ClipboardList size={36} />
                </div>
                <h3>Selecione ou crie uma iniciativa</h3>
                <p>Use a lista à esquerda ou clique em &quot;Nova iniciativa&quot;.</p>
              </div>
            ) : (
              <div className="action-canvas-editor">
                <div className="action-canvas-editor-top">
                  <div>
                    <h3 className="action-canvas-editor-title">
                      {draft.nomeIniciativa || 'Nova iniciativa'}
                    </h3>
                    <div className="action-canvas-progress-bar" aria-hidden>
                      <div className="action-canvas-progress-fill" style={{ width: `${progressPct}%` }} />
                    </div>
                    <p className="action-canvas-progress-label">{progressPct}% do fluxo preenchido</p>
                  </div>
                  {!readOnly && (
                    <button
                      type="button"
                      className="action-canvas-save-button action-canvas-save-button--compact"
                      onClick={() => void saveDraft()}
                      disabled={saving}
                    >
                      <Save size={16} />
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                  )}
                </div>

                {readOnly && (
                  <div className="action-canvas-readonly-banner">
                    <Lock size={16} />
                    <span>Encerrado e salvo no Intelligence Dashboard.</span>
                    <button
                      type="button"
                      className="action-canvas-reopen-button"
                      onClick={() => void reopenCanvas(draft)}
                      disabled={saving}
                    >
                      <Unlock size={14} />
                      Reabrir
                    </button>
                  </div>
                )}

                <nav className="action-canvas-stepper" aria-label="Etapas do Action Canvas">
                  {STEPS.map((step) => {
                    const done = stepDone(step.id, draft);
                    const active = currentStep === step.id;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        className={`action-canvas-step ${active ? 'active' : ''} ${done ? 'done' : ''}`}
                        onClick={() => setCurrentStep(step.id)}
                      >
                        <span className="action-canvas-step-num">
                          {done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                          {step.id}
                        </span>
                        <span className="action-canvas-step-text">
                          <strong>{step.title}</strong>
                          <small>{step.hint}</small>
                        </span>
                      </button>
                    );
                  })}
                </nav>

                <div className="action-canvas-step-content" key={currentStep}>
                  {currentStep === 1 && (
                    <div className="action-canvas-section">
                      <p className="action-canvas-section-lead">
                        Qual mudança prática queremos gerar?
                      </p>
                      <div className="action-canvas-fields-grid">
                        <label className="ac-field ac-field--wide">
                          <span>Nome da iniciativa *</span>
                          <input
                            value={draft.nomeIniciativa}
                            onChange={(e) => setDraft({ ...draft, nomeIniciativa: e.target.value })}
                            disabled={readOnly}
                            placeholder="Ex.: Reduzir tempo de onboarding em 30%"
                          />
                        </label>
                        <label className="ac-field ac-field--wide">
                          <span>Objetivo específico (resultado mensurável, contexto e critério de sucesso)</span>
                          <textarea
                            rows={2}
                            value={draft.objetivoEspecifico}
                            onChange={(e) => setDraft({ ...draft, objetivoEspecifico: e.target.value })}
                            disabled={readOnly}
                            placeholder="Resultado mensurável em uma frase"
                          />
                        </label>
                        <label className="ac-field">
                          <span>Owner *</span>
                          <input
                            value={draft.owner}
                            onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
                            disabled={readOnly}
                            placeholder="Responsável principal"
                          />
                        </label>
                        <label className="ac-field">
                          <span>Sponsor</span>
                          <input
                            value={draft.sponsor}
                            onChange={(e) => setDraft({ ...draft, sponsor: e.target.value })}
                            disabled={readOnly}
                            placeholder="Quem apoia"
                          />
                        </label>
                        <label className="ac-field">
                          <span>Prazo final</span>
                          <input
                            type="date"
                            value={draft.prazoFinal}
                            onChange={(e) => setDraft({ ...draft, prazoFinal: e.target.value })}
                            disabled={readOnly}
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="action-canvas-section">
                      <div className="action-canvas-section-head">
                        <p className="action-canvas-section-lead">
                          Distribua entregas para a equipe (máx. {MAX_ENTREGAS}).
                        </p>
                        {!readOnly && draft.entregas.length < MAX_ENTREGAS && (
                          <button
                            type="button"
                            className="action-canvas-inline-button"
                            onClick={() =>
                              setDraft({ ...draft, entregas: [...draft.entregas, emptyDelivery()] })
                            }
                          >
                            <Plus size={14} />
                            Adicionar entrega
                          </button>
                        )}
                      </div>
                      <div className="action-canvas-deliveries">
                        {draft.entregas.map((row, i) => (
                          <article key={row.id} className="action-canvas-delivery-card">
                            <div className="action-canvas-delivery-card-head">
                              <span className="action-canvas-delivery-num">Entrega {i + 1}</span>
                              {!readOnly && draft.entregas.length > 1 && (
                                <button
                                  type="button"
                                  className="action-canvas-icon-button"
                                  onClick={() =>
                                    setDraft({
                                      ...draft,
                                      entregas: draft.entregas.filter((_, idx) => idx !== i),
                                    })
                                  }
                                  aria-label="Remover entrega"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                            <label className="ac-field ac-field--wide">
                              <span>O quê?</span>
                              <input
                                value={row.entrega}
                                onChange={(e) => updateDelivery(i, { entrega: e.target.value })}
                                disabled={readOnly}
                                placeholder="Descrição da entrega"
                              />
                            </label>
                            <div className="action-canvas-delivery-row">
                              <label className="ac-field">
                                <span>Responsável</span>
                                <input
                                  value={row.responsavel}
                                  onChange={(e) => updateDelivery(i, { responsavel: e.target.value })}
                                  disabled={readOnly}
                                />
                              </label>
                              <label className="ac-field">
                                <span>Prazo</span>
                                <input
                                  type="date"
                                  value={row.prazo}
                                  onChange={(e) => updateDelivery(i, { prazo: e.target.value })}
                                  disabled={readOnly}
                                />
                              </label>
                            </div>
                            <div className="ac-field">
                              <span>Status</span>
                              <div className="action-canvas-status-pills" role="group" aria-label="Status">
                                {STATUS_OPTIONS.map((o) => (
                                  <button
                                    key={o.value}
                                    type="button"
                                    className={`status-pill status-pill--${o.value} ${row.status === o.value ? 'selected' : ''}`}
                                    onClick={() => !readOnly && updateDelivery(i, { status: o.value })}
                                    disabled={readOnly}
                                  >
                                    <span className="status-pill-dot" aria-hidden />
                                    {o.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <label className="ac-field ac-field--wide">
                              <span>Evidência</span>
                              <input
                                value={row.evidencia}
                                onChange={(e) => updateDelivery(i, { evidencia: e.target.value })}
                                disabled={readOnly}
                                placeholder="Link, métrica ou artefato"
                              />
                            </label>
                          </article>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="action-canvas-section">
                      <div className="action-canvas-section-head">
                        <p className="action-canvas-section-lead">
                          Antecipe riscos e defina a ação para cada um.
                        </p>
                        {!readOnly && draft.riscos.length < MAX_RISCOS && (
                          <button
                            type="button"
                            className="action-canvas-inline-button"
                            onClick={() => setDraft({ ...draft, riscos: [...draft.riscos, emptyRisk()] })}
                          >
                            <Plus size={14} />
                            Adicionar risco
                          </button>
                        )}
                      </div>
                      <div className="action-canvas-risks">
                        {draft.riscos.map((risk, i) => (
                          <article key={risk.id} className="action-canvas-risk-card">
                            <div className="action-canvas-risk-card-head">
                              <span>Risco {i + 1}</span>
                              {!readOnly && draft.riscos.length > 1 && (
                                <button
                                  type="button"
                                  className="action-canvas-icon-button"
                                  onClick={() =>
                                    setDraft({
                                      ...draft,
                                      riscos: draft.riscos.filter((_, idx) => idx !== i),
                                    })
                                  }
                                  aria-label="Remover risco"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                            <label className="ac-field ac-field--wide">
                              <span>O que pode dar errado?</span>
                              <input
                                value={risk.risco}
                                onChange={(e) => updateRisk(i, { risco: e.target.value })}
                                disabled={readOnly}
                              />
                            </label>
                            <label className="ac-field ac-field--wide">
                              <span>Qual ação tomar?</span>
                              <input
                                value={risk.acaoTomar}
                                onChange={(e) => updateRisk(i, { acaoTomar: e.target.value })}
                                disabled={readOnly}
                              />
                            </label>
                          </article>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentStep === 4 && (
                    <div className="action-canvas-section action-canvas-signoff">
                      <p className="action-canvas-section-lead">
                        Encerra este Action Canvas? Os resultados vão para o Intelligence Dashboard.
                      </p>
                      {readOnly ? (
                        <div className="action-canvas-signoff-result-card">
                          <CheckCircle2 size={32} />
                          <p>
                            Sign-off: <strong>{draft.signOff === 'sim' ? 'SIM' : 'NÃO'}</strong>
                          </p>
                        </div>
                      ) : (
                        <div className="action-canvas-signoff-cards">
                          <button
                            type="button"
                            className="action-canvas-signoff-card action-canvas-signoff-card--yes"
                            onClick={() => void setSignOff('sim')}
                            disabled={saving}
                          >
                            <span className="signoff-emoji">✓</span>
                            <strong>SIM</strong>
                            <small>Encerrar e publicar no ID</small>
                          </button>
                          <button
                            type="button"
                            className="action-canvas-signoff-card action-canvas-signoff-card--no"
                            onClick={() => void setSignOff('nao')}
                            disabled={saving}
                          >
                            <span className="signoff-emoji">✕</span>
                            <strong>NÃO</strong>
                            <small>Encerrar sem aprovar mudança</small>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <footer className="action-canvas-editor-footer">
                  {currentStep > 1 && (
                    <button type="button" className="action-canvas-nav-button" onClick={goPrev}>
                      <ArrowLeft size={16} aria-hidden />
                      Voltar
                    </button>
                  )}
                  <div className="action-canvas-footer-spacer" />
                  {!readOnly && (
                    <>
                      <button
                        type="button"
                        className="action-canvas-delete-button"
                        onClick={() => void removeCanvas(draft.id, draft.nomeIniciativa)}
                        disabled={saving}
                      >
                        <Trash2 size={16} />
                        Excluir
                      </button>
                      {currentStep < 4 ? (
                        <button
                          type="button"
                          className="action-canvas-primary-nav"
                          onClick={() => void goNext()}
                          disabled={saving}
                        >
                          Próximo passo
                          <ChevronRight size={18} aria-hidden />
                        </button>
                      ) : null}
                    </>
                  )}
                </footer>
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {aiModalOpen && (
        <div className="action-canvas-ai-overlay" role="dialog" aria-modal="true" aria-labelledby="ac-ai-title">
          <div className="action-canvas-ai-modal">
            <header className="action-canvas-ai-modal-head">
              <div>
                <h3 id="ac-ai-title">Iniciativas sugeridas</h3>
                <p>
                  Com base no diagnóstico, escolha de caminho e memória Sprint Waves. Selecione e importe — você pode editar
                  depois.
                </p>
              </div>
              <button
                type="button"
                className="action-canvas-ai-close"
                onClick={() => setAiModalOpen(false)}
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </header>

            {aiDemoMode && (
              <p className="action-canvas-ai-demo" role="status">
                Modo demonstração (sem OpenRouter). Sugestões genéricas — configure a API para planos personalizados.
              </p>
            )}

            {aiLoading ? (
              <div className="action-canvas-ai-loading">Gerando iniciativas...</div>
            ) : (
              <ul className="action-canvas-ai-list">
                {aiSuggestions.map((s, i) => (
                  <li key={`${s.nomeIniciativa}-${i}`}>
                    <label className="action-canvas-ai-card">
                      <input
                        type="checkbox"
                        checked={aiSelected.has(i)}
                        onChange={() => toggleAiSelection(i)}
                      />
                      <div>
                        <strong>{s.nomeIniciativa}</strong>
                        <p>{s.objetivoEspecifico}</p>
                        <span className="action-canvas-ai-meta">
                          {s.owner} · prazo {s.prazoFinal} · {s.entregas.length} entregas · {s.riscos.length} riscos
                        </span>
                        {s.insightOrigem && (
                          <span className="action-canvas-ai-origin">{s.insightOrigem}</span>
                        )}
                      </div>
                    </label>
                  </li>
                ))}
              </ul>
            )}

            <footer className="action-canvas-ai-footer">
              <button type="button" className="action-canvas-nav-button" onClick={() => setAiModalOpen(false)}>
                Cancelar
              </button>
              <div className="action-canvas-footer-spacer" />
              <button
                type="button"
                className="action-canvas-primary-nav"
                disabled={aiLoading || aiImporting || aiSelected.size === 0}
                onClick={() => void importAiSuggestions()}
              >
                {aiImporting ? 'Importando...' : `Importar ${aiSelected.size} selecionado(s)`}
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}
