import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  RotateCcw,
  Sparkles,
  Star,
  TrendingUp,
} from 'lucide-react';
import { auth } from '../config/firebase';
import { useCycle } from '../context/CycleContext';
import { usePlan } from '../context/PlanContext';
import { useViewTransitionNavigate } from '../hooks/useViewTransitionNavigate';
import { canCreateMoreCycles } from '../utils/cycleLimits';
import { loadCycleFeedback, saveCycleFeedback } from '../services/cycleFeedback';
import type { CycleNextStep } from '../types/domainWave';

const RATING_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'Fraco' },
  { value: 2, label: 'Regular' },
  { value: 3, label: 'Bom' },
  { value: 4, label: 'Ótimo' },
  { value: 5, label: 'Excelente' },
];

const UPGRADE_BENEFITS = [
  'Rode vários ciclos em paralelo, sem arquivar o anterior',
  'Compare a evolução de maturidade entre ondas',
  'Mantenha times e frentes distintas em processos próprios',
];

type Props = {
  /** Destaca o bloco quando o usuário acaba de fechar o Domínio. */
  highlight?: boolean;
};

export function CycleCloseOut({ highlight = false }: Props) {
  const navigate = useViewTransitionNavigate();
  const { cycles, startNewCycle, activeCycle, refreshCycles } = useCycle();
  const { plan, maxOpenCycles } = usePlan();

  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [nextStep, setNextStep] = useState<CycleNextStep | null>(null);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUserId(u?.uid ?? null));
    return unsub;
  }, []);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    void loadCycleFeedback(userId).then((fb) => {
      if (!alive || !fb) return;
      setRating(fb.rating);
      setComment(fb.comment ?? '');
      setNextStep(fb.nextStep);
      if (fb.submittedAt) setFeedbackSaved(true);
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  const canCreate = canCreateMoreCycles(cycles, maxOpenCycles);
  const planName = plan?.planName ?? 'Starter';
  const limit = maxOpenCycles ?? 1;

  const persistFeedback = useCallback(
    async (patch?: { nextStep?: CycleNextStep }) => {
      if (!userId) return;
      setSavingFeedback(true);
      setMessage(null);
      const step = patch?.nextStep ?? nextStep;
      try {
        await saveCycleFeedback(userId, { rating, comment: comment.trim(), nextStep: step });
        setFeedbackSaved(true);
        if (patch?.nextStep) setNextStep(patch.nextStep);
      } catch {
        setMessage('Não foi possível salvar seu feedback. Tente novamente.');
      } finally {
        setSavingFeedback(false);
      }
    },
    [userId, rating, comment, nextStep],
  );

  const handleStartNewCycle = useCallback(async () => {
    if (!userId) return;
    const confirmMsg = `Iniciar um novo ciclo?\n\n"${
      activeCycle?.label ?? 'Ciclo atual'
    }" será arquivado e um novo diagnóstico será solicitado. O histórico e os aprendizados permanecem na memória do projeto.`;
    if (!window.confirm(confirmMsg)) return;

    setCreating(true);
    setMessage(null);
    try {
      await saveCycleFeedback(userId, {
        rating,
        comment: comment.trim(),
        nextStep: 'new_cycle',
      }).catch(() => undefined);
      const result = await startNewCycle();
      if (!result.ok) {
        setMessage(result.message ?? 'Não foi possível iniciar um novo ciclo.');
        return;
      }
      await refreshCycles();
      navigate('/dashboard/scans', { state: { fromNewCycle: true } });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Não foi possível iniciar um novo ciclo.');
    } finally {
      setCreating(false);
    }
  }, [userId, activeCycle?.label, rating, comment, startNewCycle, refreshCycles, navigate]);

  return (
    <section
      className={`cycle-closeout${highlight ? ' cycle-closeout--highlight' : ''}`}
      aria-labelledby="cycle-closeout-title"
    >
      <header className="cycle-closeout__head">
        <p className="cycle-closeout__eyebrow">
          <Sparkles size={14} aria-hidden />
          Loop contínuo · Próximo movimento
        </p>
        <h2 id="cycle-closeout-title">
          {highlight ? 'Domínio salvo. O ciclo se fecha aqui.' : 'Feche o ciclo e evolua'}
        </h2>
        <p className="cycle-closeout__lede">
          Cada ciclo diagnostica, difunde e mede. O próximo começa mais maduro — este é o momento de
          decidir o próximo movimento.
        </p>
        <p className="cycle-closeout__mantra">
          “What gets diffused gets measured. What gets measured evolves.”
        </p>
      </header>

      <div className="cycle-closeout__grid">
        <article className="cycle-closeout__card cycle-closeout__feedback">
          <div className="cycle-closeout__card-head">
            <span className="cycle-closeout__step" aria-hidden>
              01
            </span>
            <div>
              <h3>O que você achou deste ciclo?</h3>
              <p>Sua leitura calibra as recomendações do próximo movimento.</p>
            </div>
          </div>

          <fieldset className="cycle-closeout__rating" aria-label="Nota do ciclo">
            {RATING_OPTIONS.map((opt) => {
              const active = rating !== null && rating >= opt.value;
              return (
                <label
                  key={opt.value}
                  className={`cycle-closeout__rating-item${
                    rating === opt.value ? ' is-selected' : ''
                  }`}
                  title={opt.label}
                >
                  <input
                    type="radio"
                    name="cycle-rating"
                    value={opt.value}
                    checked={rating === opt.value}
                    onChange={() => {
                      setRating(opt.value);
                      setFeedbackSaved(false);
                    }}
                  />
                  <Star size={20} aria-hidden fill={active ? 'currentColor' : 'none'} />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </fieldset>

          <label className="cycle-closeout__field-label" htmlFor="cycle-feedback-comment">
            O que funcionou e o que faltou?
          </label>
          <textarea
            id="cycle-feedback-comment"
            className="cycle-closeout__textarea"
            rows={4}
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              setFeedbackSaved(false);
            }}
            placeholder="Ex.: a difusão engajou a liderança, mas faltou ritmo semanal nas frentes operacionais…"
          />

          <div className="cycle-closeout__feedback-actions">
            <button
              type="button"
              className="cycle-closeout__btn cycle-closeout__btn--ghost"
              onClick={() => void persistFeedback()}
              disabled={savingFeedback || !userId}
            >
              {savingFeedback ? (
                <Loader2 size={16} className="spinning" />
              ) : feedbackSaved ? (
                <CheckCircle2 size={16} />
              ) : (
                <Star size={16} />
              )}
              {feedbackSaved ? 'Feedback salvo' : 'Salvar feedback'}
            </button>
          </div>
        </article>

        <article
          className={`cycle-closeout__card cycle-closeout__next${
            canCreate ? '' : ' cycle-closeout__next--locked'
          }`}
        >
          <div className="cycle-closeout__card-head">
            <span className="cycle-closeout__step" aria-hidden>
              02
            </span>
            <div>
              <h3>Pronto para o próximo ciclo?</h3>
              <p>
                {canCreate
                  ? 'Arquive o ciclo atual e recomece o diagnóstico com tudo que você aprendeu.'
                  : `Seu plano ${planName} contempla ${limit === 1 ? '1 ciclo' : `${limit} ciclos`}.`}
              </p>
            </div>
          </div>

          {canCreate ? (
            <>
              <ul className="cycle-closeout__next-points">
                <li>
                  <TrendingUp size={15} aria-hidden />O diagnóstico recomeça com o contexto
                  amadurecido.
                </li>
                <li>
                  <CheckCircle2 size={15} aria-hidden />
                  Aprendizados e histórico ficam salvos na memória do projeto.
                </li>
              </ul>
              <button
                type="button"
                className="cycle-closeout__btn cycle-closeout__btn--primary"
                onClick={() => void handleStartNewCycle()}
                disabled={creating || !userId}
              >
                {creating ? <Loader2 size={18} className="spinning" /> : <RotateCcw size={18} />}
                Iniciar novo ciclo
                <ArrowRight size={16} aria-hidden />
              </button>
              <button
                type="button"
                className="cycle-closeout__btn cycle-closeout__btn--text"
                onClick={() => void persistFeedback({ nextStep: 'paused' })}
                disabled={savingFeedback}
              >
                Ainda não — só registrar por enquanto
              </button>
            </>
          ) : (
            <div className="cycle-closeout__upgrade">
              <p className="cycle-closeout__upgrade-lead">
                <Lock size={15} aria-hidden />A evolução contínua vive de novos ciclos. Faça upgrade
                para não parar aqui.
              </p>
              <ul className="cycle-closeout__upgrade-benefits">
                {UPGRADE_BENEFITS.map((benefit) => (
                  <li key={benefit}>
                    <CheckCircle2 size={15} aria-hidden />
                    {benefit}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="cycle-closeout__btn cycle-closeout__btn--primary"
                onClick={() => navigate('/planos')}
              >
                <Sparkles size={18} aria-hidden />
                Ver planos e evoluir
                <ArrowRight size={16} aria-hidden />
              </button>
            </div>
          )}
        </article>
      </div>

      {message && (
        <p className="cycle-closeout__message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
