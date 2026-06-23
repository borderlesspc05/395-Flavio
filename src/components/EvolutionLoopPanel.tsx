import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  MinusCircle,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Waves,
  XCircle,
} from 'lucide-react';
import { auth } from '../config/firebase';
import { useCycle } from '../context/CycleContext';
import { useViewTransitionNavigate } from '../hooks/useViewTransitionNavigate';
import { aiApi } from '../services/api';
import { buildEvolutionLoopContext } from '../services/evolutionLoopContext';
import {
  cacheEvolutionResult,
  readCachedEvolution,
} from '../services/evolutionLoopStorage';
import { startDesignWaveFromEvolution } from '../services/evolutionLoopWave';
import type { EvolutionLoopResult } from '../types/evolutionLoop';
import { isLlmNotConfiguredApiError, readApiErrorMessage } from '../utils/apiError';

type Props = {
  onWaveCreated?: () => void;
};

function PracticeList({
  items,
  emptyLabel,
}: {
  items: EvolutionLoopResult['continuar'];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="evo-loop-empty">{emptyLabel}</p>;
  }
  return (
    <ul className="evo-loop-practices">
      {items.map((item, index) => (
        <li key={`${item.practice}-${index}`}>
          <strong>{item.practice}</strong>
          {item.rationale ? <span>{item.rationale}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export function EvolutionLoopPanel({ onWaveCreated }: Props) {
  const navigate = useViewTransitionNavigate();
  const { activeCycle, refreshCycles } = useCycle();
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [aiConfigured, setAiConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [creatingWave, setCreatingWave] = useState(false);
  const [result, setResult] = useState<EvolutionLoopResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUserId(u?.uid ?? null));
    return unsub;
  }, []);

  useEffect(() => {
    aiApi
      .status()
      .then((s) => setAiConfigured(s.configured))
      .catch(() => setAiConfigured(false));
  }, []);

  useEffect(() => {
    if (!activeCycle?.id) return;
    const cached = readCachedEvolution(activeCycle.id);
    if (cached) setResult(cached);
  }, [activeCycle?.id]);

  const handleAnalyze = useCallback(async () => {
    if (!userId) return;
    if (!aiConfigured) {
      setNotice(
        'IA indisponível. Configure OPENROUTER_API_KEY ou OPENAI_API_KEY no servidor.'
      );
      return;
    }

    setLoading(true);
    setNotice(null);
    try {
      const context = await buildEvolutionLoopContext(userId);
      const analysis = await aiApi.suggestEvolutionLoop(context);
      const stamped = { ...analysis, generatedAt: new Date().toISOString() };
      setResult(stamped);
      if (activeCycle?.id) cacheEvolutionResult(activeCycle.id, stamped);
    } catch (err) {
      setNotice(
        isLlmNotConfiguredApiError(err)
          ? 'IA não configurada no servidor.'
          : readApiErrorMessage(err, 'Não foi possível gerar o Evolution Loop. Tente novamente.')
      );
    } finally {
      setLoading(false);
    }
  }, [userId, aiConfigured, activeCycle?.id]);

  const handleCreateWave = async () => {
    if (!userId || !result) return;
    const focus = result.nextWave.focus.trim() || 'nova onda';
    const confirmMsg = `Criar nova onda focada em "${focus}"?\n\nO ciclo atual será arquivado. Action Canvas e objetivos serão reiniciados; o diagnóstico será mantido. Você irá direto para Onda 2 · Design.`;
    if (!window.confirm(confirmMsg)) return;

    setCreatingWave(true);
    setNotice(null);
    try {
      const outcome = await startDesignWaveFromEvolution(userId, activeCycle, result);
      if (!outcome.ok) {
        setNotice(outcome.message ?? 'Erro ao criar nova onda.');
        return;
      }
      await refreshCycles();
      onWaveCreated?.();
      navigate('/dashboard/design');
    } catch (err) {
      setNotice(readApiErrorMessage(err, 'Erro ao criar nova onda.'));
    } finally {
      setCreatingWave(false);
    }
  };

  return (
    <section className="evo-loop" aria-labelledby="evo-loop-title">
      <header className="evo-loop__hero">
        <div className="evo-loop__hero-copy">
          <p className="evo-loop__eyebrow">
            <Waves size={14} aria-hidden />
            Onda 4.2 · Evolution Loop
          </p>
          <h2 id="evo-loop-title">Aqui o Magnus Mind fecha o ciclo</h2>
          <p className="evo-loop__lede">
            A IA analisa diagnóstico original, blueprint, difusão e resultados obtidos — e
            recomenda o que continuar, ajustar ou abandonar antes da próxima onda.
          </p>
        </div>
        <div className="evo-loop__hero-actions">
          <button
            type="button"
            className="evo-loop__analyze-btn"
            onClick={() => void handleAnalyze()}
            disabled={loading || !userId}
          >
            {loading ? <Loader2 size={18} className="spinning" /> : <Sparkles size={18} />}
            {result ? 'Reanalisar ciclo' : 'Gerar recomendações'}
          </button>
          {result?.generatedAt && (
            <time className="evo-loop__generated" dateTime={result.generatedAt}>
              Atualizado {new Date(result.generatedAt).toLocaleString('pt-BR')}
            </time>
          )}
        </div>
      </header>

      {notice && (
        <p className="evo-loop__notice" role="status">
          {notice}
        </p>
      )}

      {!result && !loading && (
        <div className="evo-loop__placeholder">
          <TrendingUp size={28} aria-hidden />
          <p>
            Preencha Domínio e gere o relatório MID para enriquecer a análise. Depois clique em{' '}
            <strong>Gerar recomendações</strong>.
          </p>
        </div>
      )}

      {loading && !result && (
        <div className="evo-loop__loading" aria-busy="true">
          <Loader2 size={22} className="spinning" />
          <p>Analisando diagnóstico, blueprint, difusão e resultados…</p>
        </div>
      )}

      {result && (
        <div className="evo-loop__body">
          <p className="evo-loop__summary">{result.summary}</p>

          <div className="evo-loop__grid">
            <article className="evo-loop__card evo-loop__card--keep">
              <header>
                <CheckCircle2 size={18} aria-hidden />
                <h3>Continuar</h3>
                <p>Práticas que deram certo</p>
              </header>
              <PracticeList items={result.continuar} emptyLabel="Nenhuma prática sólida identificada ainda." />
            </article>

            <article className="evo-loop__card evo-loop__card--adjust">
              <header>
                <MinusCircle size={18} aria-hidden />
                <h3>Ajustar</h3>
                <p>Impacto parcial — refine antes de escalar</p>
              </header>
              <PracticeList items={result.ajustar} emptyLabel="Nenhum ajuste prioritário identificado." />
            </article>

            <article className="evo-loop__card evo-loop__card--drop">
              <header>
                <XCircle size={18} aria-hidden />
                <h3>Abandonar</h3>
                <p>Práticas sem resultado</p>
              </header>
              <PracticeList items={result.abandonar} emptyLabel="Nenhuma prática para encerrar." />
            </article>
          </div>

          <article className="evo-loop__next-wave">
            <div className="evo-loop__next-wave-copy">
              <p className="evo-loop__next-label">Próxima onda recomendada</p>
              <h3>{result.nextWave.title}</h3>
              <p className="evo-loop__next-focus">
                Com base nos resultados, recomendamos iniciar uma nova onda focada em{' '}
                <strong>{result.nextWave.focus}</strong>.
              </p>
              <p className="evo-loop__next-rationale">{result.nextWave.rationale}</p>
            </div>
            <button
              type="button"
              className="evo-loop__wave-btn"
              onClick={() => void handleCreateWave()}
              disabled={creatingWave || !userId}
            >
              {creatingWave ? (
                <Loader2 size={18} className="spinning" />
              ) : (
                <Waves size={18} aria-hidden />
              )}
              Criar nova onda a partir dos aprendizados
              <ArrowRight size={16} aria-hidden />
            </button>
          </article>

          <button
            type="button"
            className="evo-loop__refresh-link"
            onClick={() => void handleAnalyze()}
            disabled={loading}
          >
            <RefreshCw size={14} aria-hidden />
            Atualizar análise com dados mais recentes
          </button>
        </div>
      )}
    </section>
  );
}
