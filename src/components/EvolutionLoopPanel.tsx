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
import { useAiStatus } from '../hooks/useAiStatus';
import { aiApi } from '../services/api';
import { buildEvolutionLoopContext } from '../services/evolutionLoopContext';
import {
  cacheEvolutionResult,
  MAX_INHERITED_INITIATIVES,
  readCachedEvolution,
  readSelectedInheritedPractices,
  toggleInheritedPractice,
  type StashedInheritedPractice,
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
  selectedKeys,
  onToggle,
}: {
  items: EvolutionLoopResult['continuar'];
  emptyLabel: string;
  selectedKeys: Set<string>;
  onToggle?: (practice: string, rationale?: string) => void;
}) {
  if (items.length === 0) {
    return <p className="evo-loop-empty">{emptyLabel}</p>;
  }
  return (
    <ul className="evo-loop-practices">
      {items.map((item, index) => {
        const key = item.practice.trim().toLowerCase();
        const selected = selectedKeys.has(key);
        return (
          <li key={`${item.practice}-${index}`} className={selected ? 'is-selected' : undefined}>
            <strong>{item.practice}</strong>
            {item.rationale ? <span>{item.rationale}</span> : null}
            {onToggle ? (
              <button
                type="button"
                className={`evo-loop-include-btn${selected ? ' is-selected' : ''}`}
                onClick={() => onToggle(item.practice, item.rationale)}
              >
                {selected ? 'Remover da fila' : 'Incluir no próximo ciclo'}
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function EvolutionLoopPanel({ onWaveCreated }: Props) {
  const navigate = useViewTransitionNavigate();
  const { activeCycle, refreshCycles } = useCycle();
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid ?? null);
  const { configured: aiConfigured, unreachable: apiUnreachable } = useAiStatus();
  const [loading, setLoading] = useState(false);
  const [creatingWave, setCreatingWave] = useState(false);
  const [result, setResult] = useState<EvolutionLoopResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<StashedInheritedPractice[]>(() =>
    readSelectedInheritedPractices()
  );

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUserId(u?.uid ?? null));
    return unsub;
  }, []);

  useEffect(() => {
    if (!activeCycle?.id) return;
    const cached = readCachedEvolution(activeCycle.id);
    if (cached) setResult(cached);
  }, [activeCycle?.id]);

  const selectedKeys = new Set(selected.map((p) => p.practice.trim().toLowerCase()));

  const handleAnalyze = useCallback(async () => {
    if (!userId) return;
    if (apiUnreachable) {
      setNotice('API inacessível. Verifique o servidor local ou CORS_ORIGIN no Render.');
      return;
    }
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
  }, [userId, aiConfigured, apiUnreachable, activeCycle?.id]);

  const handleCreateWave = async () => {
    if (!userId || !result) return;
    const focus = result.nextWave.focus.trim() || 'nova onda';
    const queued = readSelectedInheritedPractices();
    const confirmMsg = [
      `Criar nova onda focada em "${focus}"?`,
      '',
      queued.length
        ? `${queued.length} iniciativa(s) selecionada(s) vão para o Design do próximo ciclo (até ${MAX_INHERITED_INITIATIVES}).`
        : `Nenhuma iniciativa na fila — você ainda pode criar planos no Design (até ${MAX_INHERITED_INITIATIVES} herdadas por ciclo).`,
      '',
      'O ciclo atual será arquivado. Action Canvas e objetivos serão reiniciados; o diagnóstico será mantido.',
    ].join('\n');
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
      navigate('/dashboard/scans', { state: { fromEvolutionLoop: true } });
    } catch (err) {
      setNotice(readApiErrorMessage(err, 'Erro ao criar nova onda.'));
    } finally {
      setCreatingWave(false);
    }
  };

  const handleTogglePractice = (
    practice: string,
    rationale: string | undefined,
    source: 'continuar' | 'ajustar'
  ) => {
    const outcome = toggleInheritedPractice({ practice, rationale, source });
    setSelected(outcome.selected);
    setNotice(outcome.message ?? null);
  };

  return (
    <section className="evo-loop" aria-labelledby="evo-loop-title">
      <header className="evo-loop__hero">
        <div className="evo-loop__hero-copy">
          <p className="evo-loop__eyebrow">
            <Waves size={14} aria-hidden />
            Onda 4.2 · Evolution Loop
          </p>
          <h2 id="evo-loop-title">Aqui o Sprint fecha o ciclo</h2>
          <p className="evo-loop__lede">
            A plataforma analisa diagnóstico, difusão e resultados — e recomenda o que continuar,
            ajustar ou abandonar antes da próxima onda. Você pode levar até{' '}
            <strong>{MAX_INHERITED_INITIATIVES} iniciativas</strong> para o próximo ciclo; no Design,
            decide o que fazer com cada uma.
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

      {selected.length > 0 && (
        <p className="evo-loop__queue" role="status">
          Fila para o próximo ciclo:{' '}
          <strong>
            {selected.length}/{MAX_INHERITED_INITIATIVES}
          </strong>{' '}
          — {selected.map((s) => s.practice).join(' · ')}
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
              <PracticeList
                items={result.continuar}
                emptyLabel="Nenhuma prática sólida identificada ainda."
                selectedKeys={selectedKeys}
                onToggle={(practice, rationale) =>
                  handleTogglePractice(practice, rationale, 'continuar')
                }
              />
            </article>

            <article className="evo-loop__card evo-loop__card--adjust">
              <header>
                <MinusCircle size={18} aria-hidden />
                <h3>Ajustar</h3>
                <p>Impacto parcial — refine antes de escalar</p>
              </header>
              <PracticeList
                items={result.ajustar}
                emptyLabel="Nenhum ajuste prioritário identificado."
                selectedKeys={selectedKeys}
                onToggle={(practice, rationale) =>
                  handleTogglePractice(practice, rationale, 'ajustar')
                }
              />
            </article>

            <article className="evo-loop__card evo-loop__card--drop">
              <header>
                <XCircle size={18} aria-hidden />
                <h3>Abandonar</h3>
                <p>Práticas sem resultado</p>
              </header>
              <PracticeList
                items={result.abandonar}
                emptyLabel="Nenhuma prática para encerrar."
                selectedKeys={selectedKeys}
              />
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
              <p className="evo-loop__next-hint">
                Até {MAX_INHERITED_INITIATIVES} iniciativas selecionadas entram no Design do próximo
                ciclo como cards herdados — lá você decide se valida, edita ou descarta.
              </p>
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
