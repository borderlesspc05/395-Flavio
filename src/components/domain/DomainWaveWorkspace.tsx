import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useViewTransitionNavigate } from '../../hooks/useViewTransitionNavigate';
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  CircleAlert,
  Gauge,
  ListChecks,
  Loader2,
  Save,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { actionCanvasesApi, aiApi, objectivesApi } from '../../services/api';
import { getInitialForm, saveInitialFormDraft } from '../../services/initialForm';
import { mergeDomainWaveData, parseDomainWaveData } from '../../services/domainWaveStorage';
import type { ActionCanvas, InitialFormData, Objective } from '../../types';
import {
  IMPACT_RATING_OPTIONS,
  SUSTAINABILITY_QUESTIONS,
  type DomainPlanImpact,
  type DomainWaveData,
  type ImpactRating,
} from '../../types/domainWave';
import {
  buildDomainLearningsContext,
  computePlanMetrics,
  computeSustainabilityScore,
  derivePlansFromWave3,
  planDeadlineLabel,
  planStatusLabel,
} from '../../utils/domainWave';
import { AiStatusAlert } from '../AiStatusAlert';
import { useAiStatus } from '../../hooks/useAiStatus';
import { isLlmNotConfiguredApiError, readApiErrorMessage } from '../../utils/apiError';

const AUTO_SAVE_MS = 2500;

const BLOCK_NAV = [
  { id: 'domain-plans', label: 'Planos' },
  { id: 'domain-impact', label: 'Impacto' },
  { id: 'domain-learning', label: 'Aprendizados' },
  { id: 'domain-sustain', label: 'Sustentação' },
] as const;

const LEARNING_FIELDS = [
  ['workedWell', 'O que funcionou bem?'],
  ['didNotWork', 'O que não funcionou?'],
  ['wouldDoDifferently', 'O que faríamos diferente?'],
  ['biggestSurprise', 'Qual foi a maior surpresa?'],
  ['practiceToReplicate', 'Qual prática merece ser replicada?'],
] as const;

function DomainWaveSkeleton() {
  return (
    <div className="domain-wave-loading" aria-busy="true" aria-label="Carregando Onda 4">
      <div className="domain-wave-skeleton domain-wave-skeleton--hero" />
      <div className="domain-wave-skeleton domain-wave-skeleton--block" />
      <div className="domain-wave-skeleton domain-wave-skeleton--block" />
    </div>
  );
}

function SustainBandIcon({ band }: { band: 'green' | 'yellow' | 'red' }) {
  if (band === 'green') return <ShieldCheck size={18} aria-hidden />;
  if (band === 'yellow') return <CircleAlert size={18} aria-hidden />;
  return <AlertTriangle size={18} aria-hidden />;
}

interface Props {
  onSustainabilityChange?: (score: ReturnType<typeof computeSustainabilityScore>) => void;
}

export function DomainWaveWorkspace({ onSustainabilityChange }: Props) {
  const navigate = useViewTransitionNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formData, setFormData] = useState<InitialFormData | null>(null);
  const [canvases, setCanvases] = useState<ActionCanvas[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [domainData, setDomainData] = useState<DomainWaveData | null>(null);
  const { configured: aiConfigured, unreachable: apiUnreachable } = useAiStatus();
  const [hasEntered, setHasEntered] = useState(false);
  const skipAutoSaveRef = useRef(true);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formDataRef = useRef<InitialFormData | null>(null);
  const persistInFlightRef = useRef(false);

  const load = useCallback(async (uid: string) => {
    skipAutoSaveRef.current = true;
    setLoading(true);
    try {
      const [{ data }, canvasList, objRes] = await Promise.all([
        getInitialForm(uid),
        actionCanvasesApi.list().catch(() => [] as ActionCanvas[]),
        objectivesApi.list().catch(() => [] as Objective[]),
      ]);
      const objs = Array.isArray(objRes) ? objRes : objRes?.items ?? [];
      setFormData(data);
      formDataRef.current = data;
      setCanvases(canvasList);
      setObjectives(objs);
      setDomainData(parseDomainWaveData(data.domainWaveData));
    } finally {
      setLoading(false);
      window.setTimeout(() => {
        skipAutoSaveRef.current = false;
      }, 0);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
      if (user?.uid) void load(user.uid);
      else setLoading(false);
    });
    return unsub;
  }, [load]);

  const plans = useMemo(() => derivePlansFromWave3(canvases, objectives), [canvases, objectives]);
  const metrics = useMemo(() => computePlanMetrics(plans), [plans]);
  const sustainabilityScore = useMemo(
    () => (domainData ? computeSustainabilityScore(domainData.sustainability) : null),
    [domainData],
  );

  useEffect(() => {
    onSustainabilityChange?.(sustainabilityScore);
  }, [sustainabilityScore, onSustainabilityChange]);

  useEffect(() => {
    if (!loading && domainData) {
      setHasEntered(true);
    }
  }, [loading, domainData]);

  const persist = useCallback(
    async (next: DomainWaveData, options?: { silent?: boolean }) => {
      const baseForm = formDataRef.current;
      if (!userId || !baseForm) return false;

      const merged = mergeDomainWaveData(baseForm, next);
      const unchanged = merged === baseForm;

      if (unchanged) {
        return true;
      }

      if (options?.silent && persistInFlightRef.current) {
        return true;
      }

      if (!options?.silent) {
        setSaving(true);
        setNotice(null);
      } else {
        persistInFlightRef.current = true;
      }

      try {
        await saveInitialFormDraft(userId, merged);
        formDataRef.current = merged;
        if (!options?.silent) {
          setFormData(merged);
          setNotice('Progresso salvo.');
        }
        return true;
      } catch {
        if (!options?.silent) {
          setNotice('Não foi possível salvar. Tente novamente.');
        }
        return false;
      } finally {
        if (!options?.silent) setSaving(false);
        else persistInFlightRef.current = false;
      }
    },
    [userId],
  );

  const persistRef = useRef(persist);
  persistRef.current = persist;

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    if (!domainData || skipAutoSaveRef.current || !userId || !formDataRef.current) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      void persistRef.current(domainData, { silent: true });
    }, AUTO_SAVE_MS);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [domainData, userId]);

  const updateLearning = (patch: Partial<DomainWaveData['learning']>) => {
    if (!domainData) return;
    setDomainData({ ...domainData, learning: { ...domainData.learning, ...patch } });
  };

  const updateSustainability = (id: (typeof SUSTAINABILITY_QUESTIONS)[number]['id'], value: number) => {
    if (!domainData) return;
    setDomainData({
      ...domainData,
      sustainability: { ...domainData.sustainability, [id]: value },
    });
  };

  const updateImpact = (planId: string, patch: Partial<DomainPlanImpact>) => {
    if (!domainData) return;
    const current = domainData.impactByPlanId[planId] ?? { impactRating: null, evidence: '' };
    setDomainData({
      ...domainData,
      impactByPlanId: {
        ...domainData.impactByPlanId,
        [planId]: { ...current, ...patch },
      },
    });
  };

  const handleGenerateLearnings = async () => {
    if (!domainData) return;
    if (apiUnreachable) {
      setNotice('API inacessível. Verifique o servidor local ou CORS_ORIGIN no Render.');
      return;
    }
    if (!aiConfigured) {
      setNotice(
        'IA indisponível. Configure OPENROUTER_API_KEY ou OPENAI_API_KEY no servidor para gerar aprendizados.',
      );
      return;
    }
    setGeneratingAi(true);
    setNotice(null);
    try {
      const context = buildDomainLearningsContext(plans, metrics, domainData);
      const result = await aiApi.suggestDomainLearnings(context);
      const next = {
        ...domainData,
        learning: {
          ...domainData.learning,
          aiTopLearnings: result.learnings,
          aiGeneratedAt: new Date().toISOString(),
        },
      };
      setDomainData(next);
      const ok = await persist(next);
      if (ok) setNotice('Top 5 aprendizados gerado e salvo.');
    } catch (err) {
      setNotice(
        isLlmNotConfiguredApiError(err)
          ? 'IA não configurada no servidor. Defina OPENROUTER_API_KEY ou OPENAI_API_KEY.'
          : readApiErrorMessage(err, 'Erro ao gerar aprendizados. Tente novamente.'),
      );
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSaveAndClose = useCallback(async () => {
    if (!domainData) return;
    const ok = await persist(domainData);
    if (ok) {
      navigate('/dashboard/historico', { state: { cycleClosed: true } });
    }
  }, [domainData, persist, navigate]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (loading || !domainData) {
    return <DomainWaveSkeleton />;
  }

  const completedPlans = plans.filter((p) => p.status === 'concluido');

  return (
    <div className={`domain-wave${hasEntered ? ' is-entered' : ''}`}>
      <div className="domain-wave-bg" aria-hidden>
        <div className="domain-wave-glow domain-wave-glow--1" />
        <div className="domain-wave-glow domain-wave-glow--2" />
        <div className="domain-wave-grain" />
      </div>

      <header className="domain-wave-hero domain-reveal sprint-wave-header">
        <div className="domain-wave-hero-copy sprint-wave-title-group">
          <div className="sprint-wave-icon-wrapper" aria-hidden>
            <Brain size={26} />
          </div>
          <div className="sprint-wave-title-copy">
            <p className="domain-wave-eyebrow sprint-wave-eyebrow">
              SPRINT WAVES™ · Onda 4
            </p>
            <h1 className="domain-wave-question sprint-wave-title">Domínio</h1>
            <p className="domain-wave-lead sprint-wave-subtitle">
              Transforme execução em inteligência organizacional. Registre impacto, aprendizados e
              sustentação para alimentar o Intelligence Dashboard e o próximo ciclo.
            </p>
          </div>
        </div>
        <aside className="domain-wave-hero-aside sprint-wave-side" aria-label="Resumo do ciclo">
          <dl>
            <dt>Planos mapeados</dt>
            <dd>
              <strong>{metrics.totalPlans}</strong> da Difusão ·{' '}
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                {metrics.completedPercent}% concluídos
              </span>
            </dd>
          </dl>
        </aside>
      </header>

      <nav className="domain-wave-nav domain-reveal domain-reveal--1" aria-label="Navegação dos blocos">
        {BLOCK_NAV.map((item) => (
          <a key={item.id} href={`#${item.id}`}>
            {item.label}
          </a>
        ))}
      </nav>

      {notice ? (
        <p className="domain-wave-notice" role="status" aria-live="polite">
          {notice}
        </p>
      ) : null}

      <AiStatusAlert
        configured={aiConfigured}
        unreachable={apiUnreachable}
        notConfiguredDetail="O Top 5 de aprendizados e o dossiê consolidado exigem OPENROUTER_API_KEY ou OPENAI_API_KEY no backend. Os demais blocos (planos, impacto, sustentação) funcionam normalmente e salvam no Firebase."
      />

      <section
        id="domain-plans"
        className="domain-block domain-reveal domain-reveal--2"
        aria-labelledby="domain-plans-title"
      >
        <div className="domain-block-head">
          <span className="domain-block-num" aria-hidden>
            1
          </span>
          <div>
            <h2 id="domain-plans-title">Resultado dos Planos</h2>
            <p>O que foi executado? Dados trazidos automaticamente da Onda 3 (Difusão).</p>
          </div>
        </div>

        {plans.length === 0 ? (
          <div className="domain-empty">
            <p>Nenhum plano encontrado ainda.</p>
            <Link to="/dashboard/objetivos" className="domain-link-button">
              Ir para a Difusão
              <ArrowRight size={16} aria-hidden />
            </Link>
          </div>
        ) : (
          <>
            <div className="domain-metrics" role="group" aria-label="Indicadores de execução">
              <div className="domain-metric">
                <span className="domain-metric-icon" aria-hidden>
                  <TrendingUp size={16} />
                </span>
                <span className="domain-metric-value">{metrics.executionPercent}%</span>
                <span className="domain-metric-label">de execução</span>
              </div>
              <div className="domain-metric">
                <span className="domain-metric-icon" aria-hidden>
                  <CheckCircle2 size={16} />
                </span>
                <span className="domain-metric-value">{metrics.completedPercent}%</span>
                <span className="domain-metric-label">planos concluídos</span>
              </div>
              <div className="domain-metric">
                <span className="domain-metric-icon" aria-hidden>
                  <ListChecks size={16} />
                </span>
                <span className="domain-metric-value">{metrics.latePercent}%</span>
                <span className="domain-metric-label">planos atrasados</span>
              </div>
              <div className="domain-metric domain-metric--accent">
                <span className="domain-metric-icon" aria-hidden>
                  <Zap size={16} />
                </span>
                <span className="domain-metric-value">{metrics.actionVelocity}</span>
                <span className="domain-metric-label">Action Velocity</span>
              </div>
            </div>

            <div className="domain-table-wrap">
              <table className="domain-table">
                <caption className="sr-only">Planos da Difusão com status, prazo e responsável</caption>
                <thead>
                  <tr>
                    <th scope="col">Plano</th>
                    <th scope="col">Status</th>
                    <th scope="col">Prazo</th>
                    <th scope="col">Responsável</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.id}>
                      <td>{plan.name}</td>
                      <td>
                        <span className={`domain-pill domain-pill--${plan.status}`}>
                          {planStatusLabel(plan.status)}
                        </span>
                      </td>
                      <td>{planDeadlineLabel(plan.prazo)}</td>
                      <td>{plan.responsavel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="domain-block-objective">
              <Target size={14} aria-hidden />
              Entender se a organização executa ou apenas planeja.
            </p>
          </>
        )}
      </section>

      <section
        id="domain-impact"
        className="domain-block domain-reveal domain-reveal--3"
        aria-labelledby="domain-impact-title"
      >
        <div className="domain-block-head">
          <span className="domain-block-num" aria-hidden>
            2
          </span>
          <div>
            <h2 id="domain-impact-title">Impacto Gerado</h2>
            <p>Valeu a pena? Avalie cada plano concluído.</p>
          </div>
        </div>

        {completedPlans.length === 0 ? (
          <p className="domain-empty-text">
            Conclua ao menos um plano na Difusão para avaliar impacto.
          </p>
        ) : (
          <div className="domain-impact-list">
            {completedPlans.map((plan) => {
              const impact = domainData.impactByPlanId[plan.id] ?? {
                impactRating: null,
                evidence: '',
              };
              const evidenceId = `impact-evidence-${plan.id}`;
              return (
                <article key={plan.id} className="domain-impact-card">
                  <h3>{plan.name}</h3>
                  <p className="domain-impact-question">O impacto esperado foi alcançado?</p>
                  <div
                    className="domain-impact-scale"
                    role="radiogroup"
                    aria-label={`Impacto de ${plan.name}`}
                  >
                    {IMPACT_RATING_OPTIONS.map((opt) => (
                      <label key={opt.value} className="domain-impact-option">
                        <input
                          type="radio"
                          name={`impact-${plan.id}`}
                          checked={impact.impactRating === opt.value}
                          onChange={() =>
                            updateImpact(plan.id, { impactRating: opt.value as ImpactRating })
                          }
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="domain-field">
                    <label className="domain-field-label" htmlFor={evidenceId}>
                      Evidências
                    </label>
                    <textarea
                      id={evidenceId}
                      name={evidenceId}
                      rows={3}
                      autoComplete="off"
                      value={impact.evidence}
                      onChange={(e) => updateImpact(plan.id, { evidence: e.target.value })}
                      placeholder="Ex.: redução de turnover, melhoria NPS, produtividade, GPTW, Stay Score…"
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section
        id="domain-learning"
        className="domain-block domain-block--learning domain-reveal domain-reveal--4"
        aria-labelledby="domain-learning-title"
      >
        <div className="domain-block-head">
          <span className="domain-block-num" aria-hidden>
            3
          </span>
          <div>
            <h2 id="domain-learning-title">Learning &amp; Insights</h2>
            <p>A área mais importante: capture o que o ciclo ensinou.</p>
          </div>
        </div>

        <div className="domain-fields-grid">
          {LEARNING_FIELDS.map(([key, label]) => {
            const fieldId = `learning-${key}`;
            return (
              <div key={key} className="domain-field">
                <label className="domain-field-label" htmlFor={fieldId}>
                  {label}
                </label>
                <textarea
                  id={fieldId}
                  name={fieldId}
                  rows={3}
                  autoComplete="off"
                  value={domainData.learning[key]}
                  onChange={(e) => updateLearning({ [key]: e.target.value })}
                  placeholder="Descreva com exemplos concretos do ciclo…"
                />
              </div>
            );
          })}
        </div>

        <div className="domain-ai-block">
          <button
            type="button"
            className="domain-primary-button"
            onClick={() => void handleGenerateLearnings()}
            disabled={generatingAi || apiUnreachable || aiConfigured === false}
            title={
              apiUnreachable
                ? 'API inacessível — verifique servidor ou CORS'
                : aiConfigured === false
                ? 'Configure a IA no servidor para habilitar esta ação'
                : undefined
            }
          >
            {generatingAi ? <Loader2 size={16} className="spinning" /> : <Sparkles size={16} />}
            {generatingAi ? 'Gerando…' : 'Gerar Top 5'}
          </button>

          {domainData.learning.aiTopLearnings.length > 0 ? (
            <ol className="domain-learnings-list" aria-label="Top 5 aprendizados">
              {domainData.learning.aiTopLearnings.map((item, index) => (
                <li key={`${index}-${item.slice(0, 24)}`} data-rank={index + 1}>
                  {item}
                </li>
              ))}
            </ol>
          ) : (
            <p className="domain-empty-text" style={{ marginTop: '0.85rem' }}>
              Preencha os campos acima e gere o Top 5.
            </p>
          )}
        </div>
      </section>

      <section
        id="domain-sustain"
        className="domain-block domain-reveal domain-reveal--5"
        aria-labelledby="domain-sustain-title"
      >
        <div className="domain-block-head">
          <span className="domain-block-num" aria-hidden>
            4
          </span>
          <div>
            <h2 id="domain-sustain-title">Radar de Sustentação</h2>
            <p>A transformação vai continuar viva?</p>
          </div>
        </div>

        <div className="domain-sustain-grid">
          {SUSTAINABILITY_QUESTIONS.map((q) => (
            <div key={q.id} className="domain-sustain-row">
              <span id={`${q.id}-label`}>{q.label}</span>
              <div
                className="domain-scale"
                role="radiogroup"
                aria-labelledby={`${q.id}-label`}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="domain-scale-btn">
                    <input
                      type="radio"
                      name={q.id}
                      value={n}
                      checked={domainData.sustainability[q.id] === n}
                      onChange={() => updateSustainability(q.id, n)}
                      aria-label={`${n} de 5`}
                    />
                    <span>{n}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {sustainabilityScore ? (
          <div
            className={`domain-sustain-result domain-sustain-result--${sustainabilityScore.band}`}
            role="status"
          >
            <span className="domain-sustain-result-icon" aria-hidden>
              <Gauge size={20} />
            </span>
            <div>
              <strong>Sustainability Score · {sustainabilityScore.label}</strong>
              <span className="domain-sustain-result-meta">
                Média {sustainabilityScore.average}/5 · {sustainabilityScore.score} pts no ID
              </span>
            </div>
            <span className={`domain-sustain-badge domain-sustain-badge--${sustainabilityScore.band}`}>
              <SustainBandIcon band={sustainabilityScore.band} />
              {sustainabilityScore.label}
            </span>
          </div>
        ) : (
          <p className="domain-empty-text" style={{ marginTop: '1rem' }}>
            <AlertTriangle size={14} aria-hidden style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Avalie os 5 critérios para calcular o Sustainability Score.
          </p>
        )}
      </section>

      <footer className="domain-wave-footer domain-reveal domain-reveal--5">
        <button
          type="button"
          className="domain-primary-button"
          disabled={saving}
          onClick={() => void handleSaveAndClose()}
        >
          {saving ? <Loader2 size={16} className="spinning" /> : <Save size={16} />}
          {saving ? 'Salvando…' : 'Salvar Domínio e fechar o ciclo'}
        </button>
        <p className="domain-wave-footer-note">
          <CheckCircle2 size={14} aria-hidden />
          Ao salvar, o ciclo se fecha no <Link to="/dashboard/historico">Loop contínuo</Link> — onde
          você avalia o ciclo e decide o próximo movimento.
        </p>
      </footer>
    </div>
  );
}
