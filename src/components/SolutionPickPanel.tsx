import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import {
  buildDiagnosticContextThroughTeamScan,
  isPhasesThroughTeamScanComplete,
} from '../constants/diagnosticFlow';
import { aiApi } from '../services/api';
import {
  parseSelectedSolutionActions,
  stashSelectedSolutionActions,
  withSelectedSolutionActions,
} from '../services/solutionPick';
import type { InitialFormData } from '../types';
import type { SuggestedSolutionAction } from '../types/solutionPick';

const MAX_SELECT = 5;

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

export function SolutionPickPanel({ data, userId, onDataChange, onSaveDraft }: Props) {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<SuggestedSolutionAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [goingDesign, setGoingDesign] = useState(false);

  const selected = useMemo(() => parseSelectedSolutionActions(data), [data]);
  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);
  const phasesReady = isPhasesThroughTeamScanComplete(data);

  const loadSuggestions = useCallback(async () => {
    if (!phasesReady) {
      setError('Complete as etapas 1.1 a 1.4 antes de gerar sugestões.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const context = buildDiagnosticContextThroughTeamScan(data);
      const result = await aiApi.suggestSolutionPick(context);
      setSuggestions(result.suggestions);
      setDemoMode(Boolean(result.demoMode));
    } catch {
      setError('Não foi possível gerar sugestões. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [data, phasesReady]);

  useEffect(() => {
    if (phasesReady && suggestions.length === 0 && !loading) {
      void loadSuggestions();
    }
  }, [phasesReady, suggestions.length, loading, loadSuggestions]);

  const toggle = (action: SuggestedSolutionAction) => {
    onDataChange((prev) => {
      const current = parseSelectedSolutionActions(prev);
      const exists = current.some((s) => s.id === action.id);
      if (exists) {
        setError(null);
        return withSelectedSolutionActions(
          prev,
          current.filter((s) => s.id !== action.id)
        );
      }
      if (current.length >= MAX_SELECT) {
        setError(`Selecione no máximo ${MAX_SELECT} ações para o Design.`);
        return prev;
      }
      setError(null);
      return withSelectedSolutionActions(prev, [...current, action]);
    });
  };

  const goToDesign = async () => {
    const currentSelected = parseSelectedSolutionActions(data);
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
            IA analisou 1.1–1.4 em segundo plano
          </span>
          <h2>Escolha as ações para o Design</h2>
          <p>
            A IA pesquisou planos de ação com base no diagnóstico. Selecione as que fazem sentido — quanto maior o
            score, maior a probabilidade de impacto segundo o que você reportou.
          </p>
        </div>
        <button type="button" className="solution-pick-refresh" onClick={() => void loadSuggestions()} disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" aria-hidden /> : <RefreshCw size={16} aria-hidden />}
          Atualizar sugestões
        </button>
      </header>

      {!phasesReady && (
        <p className="solution-pick-notice is-warn">
          Preencha as etapas 1.1 a 1.4 para liberar as sugestões inteligentes.
        </p>
      )}

      {demoMode && (
        <p className="solution-pick-notice is-demo" role="status">
          Modo demonstração: sugestões de exemplo. Com IA configurada, a lista será personalizada ao seu diagnóstico.
        </p>
      )}

      {error && (
        <p className="solution-pick-notice is-error" role="alert">
          {error}
        </p>
      )}

      {loading && suggestions.length === 0 ? (
        <div className="solution-pick-loading">
          <Loader2 size={28} className="spin" aria-hidden />
          <span>Gerando 10 opções de plano de ação…</span>
        </div>
      ) : (
        <ol className="solution-pick-list">
          {suggestions.map((action, index) => {
            const isSelected = selectedIds.has(action.id);
            const letter = String.fromCharCode(97 + (index % 26));
            return (
              <li key={action.id}>
                <button
                  type="button"
                  className={`solution-pick-card ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => toggle(action)}
                  aria-pressed={isSelected}
                >
                  <div className="solution-pick-card-top">
                    <span className="solution-pick-letter">{letter})</span>
                    <div className="solution-pick-card-main">
                      <strong>{action.titulo}</strong>
                      <p>{action.descricao}</p>
                    </div>
                    <span className={`solution-pick-score is-${scoreClass(action.score)}`}>
                      {action.score}%
                    </span>
                  </div>
                  <div className="solution-pick-card-meta">
                    <span>{CATEGORY_LABELS[action.categoria] ?? action.categoria}</span>
                    <span>{action.rationale}</span>
                  </div>
                  {isSelected && (
                    <span className="solution-pick-selected-badge">
                      <Check size={14} aria-hidden />
                      Selecionada
                    </span>
                  )}
                </button>
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
