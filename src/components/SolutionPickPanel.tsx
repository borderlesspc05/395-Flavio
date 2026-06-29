import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type MouseEvent, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, ChevronDown, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { buildDiagnosticLaudo } from '../utils/diagnosticLaudo';
import { computeEvolutionIndex } from '../utils/evolutionIndex';
import {
  buildSolutionPickContext,
  isSolutionPickReady,
} from '../constants/diagnosticFlow';
import { DiagnosticLaudoModal } from './DiagnosticLaudoModal';
import { aiApi } from '../services/api';
import {
  parseSelectedSolutionActions,
  readCachedSolutionPick,
  reconcileSelectedWithSuggestions,
  stashSelectedSolutionActions,
  clearCachedSolutionPick,
  withSelectedSolutionActions,
  writeCachedSolutionPick,
} from '../services/solutionPick';
import { isApiUnreachableError, localSolutionPickFallback } from '../services/solutionPickLocal';
import { isLlmNotConfiguredApiError, readApiErrorMessage } from '../utils/apiError';
import { getSolutionActionDetails } from '../utils/solutionActionDetails';
import type { InitialFormData } from '../types';
import type { SuggestedSolutionAction } from '../types/solutionPick';

const MAX_SELECT = 5;
const SUMMARY_COLLAPSED_LINES = 5;

const LOADING_STEPS = [
  'Lendo seu diagnóstico…',
  'Identificando gaps e oportunidades…',
  'Montando 10 planos de ação priorizados…',
  'Quase pronto — finalizando scores e resumo…',
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  pessoas: 'Pessoas',
  processo: 'Processo',
  tecnologia: 'Tecnologia',
  estrutura: 'Estrutura',
  comunicacao: 'Comunicação',
  outro: 'Outro',
};

function scoreClass(score: number) {
  if (score >= 75) return 'high';
  if (score >= 50) return 'mid';
  return 'low';
}

type Props = {
  data: InitialFormData;
  userId: string | null;
  onDataChange: Dispatch<SetStateAction<InitialFormData>>;
  onSaveDraft: (payload: InitialFormData) => Promise<void>;
};

export function SolutionPickPanel({
  data,
  userId,
  onDataChange,
  onSaveDraft,
}: Props) {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<SuggestedSolutionAction[]>([]);
  const [companySummary, setCompanySummary] = useState<string | null>(null);
  const [companySituation, setCompanySituation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [demoMode, setDemoMode] = useState(false);
  const [ragUsed, setRagUsed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goingDesign, setGoingDesign] = useState(false);
  const [laudoOpen, setLaudoOpen] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [summaryOverflows, setSummaryOverflows] = useState(false);
  const [expandedActionIds, setExpandedActionIds] = useState<Set<string>>(new Set());
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const loadRequestRef = useRef(0);
  const autoLoadAttemptedRef = useRef(false);

  const evolution = useMemo(() => computeEvolutionIndex(data), [data]);
  const laudoText = useMemo(
    () => (laudoOpen ? buildDiagnosticLaudo(data) : ''),
    [data, laudoOpen]
  );

  const selected = useMemo(
    () => reconcileSelectedWithSuggestions(parseSelectedSolutionActions(data), suggestions),
    [data, suggestions]
  );
  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);
  const phasesReady = isSolutionPickReady(data);
  const canExpandSummary = Boolean(companySituation) || summaryOverflows;

  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      return;
    }
    const interval = window.setInterval(() => {
      setLoadingStep((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 2800);
    return () => window.clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    setSummaryExpanded(false);
  }, [companySummary, companySituation]);

  useLayoutEffect(() => {
    const el = summaryRef.current;
    if (!el || summaryExpanded || !companySummary) {
      setSummaryOverflows(false);
      return;
    }

    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 22;
    const maxCollapsedHeight = lineHeight * SUMMARY_COLLAPSED_LINES;
    const clone = el.cloneNode(true) as HTMLParagraphElement;
    clone.style.position = 'absolute';
    clone.style.visibility = 'hidden';
    clone.style.pointerEvents = 'none';
    clone.style.width = `${el.clientWidth}px`;
    clone.style.display = 'block';
    clone.style.overflow = 'visible';
    clone.style.maxHeight = 'none';
    clone.style.webkitLineClamp = 'unset';
    el.parentElement?.appendChild(clone);
    const fullHeight = clone.scrollHeight;
    clone.remove();
    setSummaryOverflows(fullHeight > maxCollapsedHeight + 1);
  }, [companySummary, companySituation, summaryExpanded]);

  const applyResult = useCallback(
    (result: {
      suggestions: SuggestedSolutionAction[];
      companySummary?: string | null;
      companySituation?: string | null;
      demoMode?: boolean;
      demoReason?: string;
      usedRag?: boolean;
    }) => {
      setSuggestions(result.suggestions);
      setCompanySummary(result.companySummary ?? null);
      setCompanySituation(result.companySituation ?? null);
      setDemoMode(Boolean(result.demoMode));
      setRagUsed(Boolean(result.usedRag));
      setExpandedActionIds(new Set());
    },
    []
  );

  const loadSuggestions = useCallback(
    async (options?: { force?: boolean }) => {
      if (!phasesReady) {
        setError('Preencha o diagnóstico da empresa (canvas ou scan focado) antes de gerar sugestões.');
        return;
      }

      const context = buildSolutionPickContext(data);
      if (options?.force) {
        clearCachedSolutionPick(context);
      }
      if (!options?.force) {
        const cached = readCachedSolutionPick(context);
        if (cached) {
          applyResult(cached);
          return;
        }
      }

      const requestId = ++loadRequestRef.current;
      setLoading(true);
      setError(null);
      try {
        const result = await aiApi.suggestSolutionPick(context);
        if (requestId !== loadRequestRef.current) return;
        applyResult(result);
        if (result.demoMode) {
          setError(
            result.demoReason ??
              'A IA no servidor não gerou sugestões personalizadas. Verifique OPENROUTER_API_KEY ou OPENAI_API_KEY no Render e clique em Atualizar sugestões.',
          );
        } else {
          writeCachedSolutionPick(context, result);
        }
      } catch (err) {
        if (requestId !== loadRequestRef.current) return;
        const fallback = localSolutionPickFallback();
        applyResult(fallback);
        if (isApiUnreachableError(err)) {
          setError(
            'API indisponível. Verifique se o backend está rodando (npm run dev na pasta server). Exibindo sugestões de demonstração.'
          );
        } else if (isLlmNotConfiguredApiError(err)) {
          setError(
            'IA não configurada no servidor (OPENAI_API_KEY ou OPENROUTER_API_KEY). Exibindo sugestões de demonstração.'
          );
        } else {
          const detail = readApiErrorMessage(err, '');
          setError(
            detail
              ? `Não foi possível personalizar agora: ${detail} Exibindo modo demonstração.`
              : 'Não foi possível gerar sugestões personalizadas. Exibindo modo demonstração.'
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [applyResult, data, phasesReady]
  );

  useEffect(() => {
    if (!phasesReady || suggestions.length > 0 || loading || autoLoadAttemptedRef.current) return;
    autoLoadAttemptedRef.current = true;
    void loadSuggestions();
  }, [phasesReady, suggestions.length, loading, loadSuggestions]);

  useEffect(() => {
    if (suggestions.length === 0) return;
    onDataChange((prev) => {
      const raw = parseSelectedSolutionActions(prev);
      const reconciled = reconcileSelectedWithSuggestions(raw, suggestions);
      if (
        reconciled.length === raw.length &&
        reconciled.every((item, index) => item.id === raw[index]?.id)
      ) {
        return prev;
      }
      return withSelectedSolutionActions(prev, reconciled);
    });
  }, [suggestions, onDataChange]);

  const toggle = (action: SuggestedSolutionAction) => {
    let limitReached = false;
    onDataChange((prev) => {
      const raw = parseSelectedSolutionActions(prev);
      const current = reconcileSelectedWithSuggestions(raw, suggestions);
      const exists = current.some((s) => s.id === action.id);
      if (exists) {
        return withSelectedSolutionActions(
          prev,
          current.filter((s) => s.id !== action.id)
        );
      }
      if (current.length >= MAX_SELECT) {
        limitReached = true;
        if (raw.length !== current.length) {
          return withSelectedSolutionActions(prev, current);
        }
        return prev;
      }
      return withSelectedSolutionActions(prev, [...current, action]);
    });
    setError(limitReached ? `Selecione no máximo ${MAX_SELECT} ações para o Design.` : null);
  };

  const toggleActionDetails = (actionId: string, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setExpandedActionIds((prev) => {
      const next = new Set(prev);
      if (next.has(actionId)) next.delete(actionId);
      else next.add(actionId);
      return next;
    });
  };

  const goToDesign = async () => {
    const currentSelected = reconcileSelectedWithSuggestions(
      parseSelectedSolutionActions(data),
      suggestions
    );
    if (currentSelected.length === 0) {
      setError('Selecione ao menos uma ação para seguir ao Design.');
      return;
    }
    if (!userId) return;
    setGoingDesign(true);
    try {
      const payload = withSelectedSolutionActions(data, currentSelected);
      onDataChange(payload);
      stashSelectedSolutionActions(currentSelected);
      await onSaveDraft(payload);
      navigate('/dashboard/design', { state: { selectedActions: currentSelected } });
    } catch {
      setError('Não foi possível salvar suas escolhas. Tente novamente.');
    } finally {
      setGoingDesign(false);
    }
  };

  return (
    <section className="solution-pick-panel" aria-label="Solution Pick — sugestões de ação">
      <header className="solution-pick-header">
        <div>
          <span className="solution-pick-kicker">
            <Sparkles size={16} aria-hidden />
            Sugestões com base no seu diagnóstico
          </span>
          <h2>Escolha as ações para o Design</h2>
          <p>
            A IA pesquisou planos de ação com base no diagnóstico. Selecione as que fazem sentido — quanto
            maior o score, maior a probabilidade de impacto segundo o que você reportou.
          </p>
        </div>
        <div className="solution-pick-header-actions">
          {evolution && (
            <div className={`solution-pick-evolution is-${evolution.band}`} title="Evolution Index">
              <span className="solution-pick-evolution-score">{evolution.score}</span>
              <span className="solution-pick-evolution-label">{evolution.label}</span>
            </div>
          )}
          <button
            type="button"
            className="solution-pick-read"
            onClick={() => setLaudoOpen(true)}
            disabled={!phasesReady}
          >
            <BookOpen size={16} aria-hidden />
            Ler Diagnóstico
          </button>
          <button
            type="button"
            className="solution-pick-refresh"
            onClick={() => {
              autoLoadAttemptedRef.current = true;
              void loadSuggestions({ force: true });
            }}
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="spin" aria-hidden /> : <RefreshCw size={16} aria-hidden />}
            Atualizar sugestões
          </button>
        </div>
      </header>

      <DiagnosticLaudoModal open={laudoOpen} content={laudoText} onClose={() => setLaudoOpen(false)} />

      {(companySummary || companySituation) && (
        <div
          className={`solution-pick-company-summary ${summaryExpanded || !canExpandSummary ? 'is-expanded' : 'is-collapsed'}`}
          role="region"
          aria-label="Resumo do diagnóstico da empresa"
        >
          <h3>Resumo após o diagnóstico</h3>
          <div className="solution-pick-summary-body">
            {companySummary ? (
              <p ref={summaryRef} className="solution-pick-summary-lead">
                {companySummary}
              </p>
            ) : null}
            {(summaryExpanded || !canExpandSummary) && companySituation ? (
              <>
                <p className="situation-label">O que a empresa está vivendo</p>
                <p>{companySituation}</p>
              </>
            ) : null}
            {!summaryExpanded && canExpandSummary ? (
              <button
                type="button"
                className="solution-pick-summary-expand"
                onClick={() => setSummaryExpanded(true)}
                aria-expanded={false}
                aria-label="Ver resumo completo do diagnóstico"
              >
                <ChevronDown size={22} aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      )}

      {!phasesReady && (
        <p className="solution-pick-notice is-warn">
          Preencha as etapas 1.1 a 1.4 (ou conclua um scan focado) para liberar as sugestões inteligentes.
        </p>
      )}

      {demoMode && (
        <p className="solution-pick-notice is-demo" role="status">
          Modo demonstração: {error ?? 'resumo e sugestões de exemplo.'} Configure uma chave válida de IA
          no Render (<code>OPENROUTER_API_KEY</code> ou <code>OPENAI_API_KEY</code>) e use{' '}
          <strong>Atualizar sugestões</strong>.
        </p>
      )}

      {!demoMode && ragUsed && (
        <p className="solution-pick-notice is-rag" role="status">
          Sugestões enriquecidas com (RAG).
        </p>
      )}

      {error && (
        <p className="solution-pick-notice is-error" role="alert">
          {error}
        </p>
      )}

      {loading && suggestions.length === 0 ? (
        <div className="solution-pick-loading" role="status" aria-live="polite">
          <Loader2 size={28} className="spin" aria-hidden />
          <span className="solution-pick-loading-title">{LOADING_STEPS[loadingStep]}</span>
          <span className="solution-pick-loading-sub">
            Isso costuma levar de 15 a 40 segundos na primeira vez.
          </span>
        </div>
      ) : (
        <ol className="solution-pick-list">
          {suggestions.map((action, index) => {
            const isSelected = selectedIds.has(action.id);
            const isDetailsOpen = expandedActionIds.has(action.id);
            const details = getSolutionActionDetails(action);
            const letter = String.fromCharCode(97 + (index % 26));
            return (
              <li key={action.id}>
                <article
                  className={`solution-pick-card ${isSelected ? 'is-selected' : ''} ${
                    isDetailsOpen ? 'is-details-open' : ''
                  }`}
                >
                  <div className="solution-pick-card-top">
                    <button
                      type="button"
                      className="solution-pick-card-select"
                      onClick={() => toggle(action)}
                      aria-pressed={isSelected}
                    >
                      <span className="solution-pick-letter">{letter})</span>
                      <div className="solution-pick-card-main">
                        <strong>{action.titulo}</strong>
                        <p>{action.descricao}</p>
                        <span className="solution-pick-card-category">
                          {CATEGORY_LABELS[action.categoria] ?? action.categoria}
                        </span>
                      </div>
                    </button>
                    <div className="solution-pick-score-wrap">
                      <span className={`solution-pick-score is-${scoreClass(action.score)}`}>
                        {action.score}%
                      </span>
                      <button
                        type="button"
                        className="solution-pick-score-expand"
                        onClick={(event) => toggleActionDetails(action.id, event)}
                        aria-expanded={isDetailsOpen}
                        aria-controls={`solution-pick-details-${action.id}`}
                        aria-label={
                          isDetailsOpen
                            ? `Ocultar detalhes: ${action.titulo}`
                            : `Ver detalhes: ${action.titulo}`
                        }
                      >
                        <ChevronDown size={18} aria-hidden />
                      </button>
                    </div>
                  </div>

                  {isDetailsOpen ? (
                    <div className="solution-pick-card-details" id={`solution-pick-details-${action.id}`}>
                      <p className="solution-pick-detail-text">{details.detalhes}</p>
                      <div className="solution-pick-detail-grid">
                        <div className="solution-pick-detail-block">
                          <h4>Por que este score</h4>
                          <p>{details.rationale}</p>
                        </div>
                        <div className="solution-pick-detail-block">
                          <h4>Objetivo no Design</h4>
                          <p>{details.objetivo}</p>
                        </div>
                      </div>
                      {details.entregas.length > 0 ? (
                        <div className="solution-pick-detail-block">
                          <h4>Entregas sugeridas</h4>
                          <ul className="solution-pick-detail-list">
                            {details.entregas.map((entrega, entregaIndex) => (
                              <li key={entregaIndex}>
                                <strong>{entrega.label}</strong>
                                <span>{entrega.meta}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {details.riscos.length > 0 ? (
                        <div className="solution-pick-detail-block">
                          <h4>Riscos e mitigação</h4>
                          <ul className="solution-pick-detail-list">
                            {details.riscos.map((risco, riscoIndex) => (
                              <li key={riscoIndex}>
                                <strong>{risco.risco}</strong>
                                <span>{risco.acao}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      <p className="solution-pick-detail-deadline">
                        Prazo final sugerido: <strong>{details.prazoFinal}</strong>
                      </p>
                    </div>
                  ) : null}

                  {isSelected ? (
                    <span className="solution-pick-selected-badge">
                      <Check size={14} aria-hidden />
                      Selecionada
                    </span>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ol>
      )}

      <footer className="solution-pick-footer">
        <p>
          {selected.length > 0
            ? `${selected.length} ação(ões) selecionada(s) — até ${MAX_SELECT}.`
            : 'Nenhuma ação selecionada ainda.'}
        </p>
        <button
          type="button"
          className="solution-pick-cta"
          onClick={() => void goToDesign()}
          disabled={selected.length === 0 || goingDesign}
        >
          {goingDesign ? <Loader2 size={18} className="spin" aria-hidden /> : <ArrowRight size={18} aria-hidden />}
          Ir para Design
        </button>
      </footer>
    </section>
  );
}
