import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { onAuthStateChanged } from 'firebase/auth';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { auth } from '../config/firebase';
import { actionCanvasesApi } from '../services/api';
import { getInitialForm } from '../services/initialForm';
import {
  parseSelectedSolutionActions,
  readStashedSelectedSolutionActions,
} from '../services/solutionPick';
import type { SuggestedSolutionAction } from '../types/solutionPick';
import { syncMagnusMemoryAfterCanvasChange } from '../services/magnusMemorySync';
import { readStashedEvolution } from '../services/evolutionLoopStorage';
import { enrichDraftObjetivo } from '../utils/enrichObjetivoEspecifico';
import type { ActionCanvas, SuggestedActionCanvasDraft } from '../types';

type EditablePlan = SuggestedActionCanvasDraft & {
  localId: string;
  validated: boolean;
  canvasId?: string;
};

function newId() {
  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function defaultPrazo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function blankPlan(): EditablePlan {
  return {
    localId: newId(),
    validated: false,
    nomeIniciativa: '',
    objetivoEspecifico: '',
    owner: 'Líder da iniciativa',
    sponsor: 'Sponsor executivo',
    prazoFinal: defaultPrazo(90),
    entregas: [
      {
        entrega: '',
        responsavel: 'Owner',
        prazo: defaultPrazo(30),
        status: 'amarelo',
      },
    ],
    riscos: [{ risco: '', acaoTomar: '' }],
  };
}

function fromDraft(
  draft: SuggestedActionCanvasDraft,
  canvasId?: string,
  meta?: { descricao?: string; rationale?: string; categoria?: string }
): EditablePlan {
  const enriched = enrichDraftObjetivo(draft, meta);
  return {
    localId: newId(),
    validated: Boolean(canvasId),
    canvasId,
    ...enriched,
  };
}

function normalizeTitle(value: string) {
  return value.trim().toLowerCase();
}

function extractApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string; message?: string } | undefined;
    const serverMessage = data?.error || data?.message;
    if (serverMessage) return serverMessage;
  }
  return fallback;
}

function toCreateBody(plan: EditablePlan) {
  return {
    nomeIniciativa: plan.nomeIniciativa.trim(),
    objetivoEspecifico: plan.objetivoEspecifico.trim(),
    owner: plan.owner.trim() || 'A definir',
    sponsor: plan.sponsor.trim() || 'A definir',
    prazoFinal: plan.prazoFinal || defaultPrazo(90),
    signOff: 'pendente' as const,
    fechado: false,
    entregas: plan.entregas.map((e, i) => ({
      id: `del-${i}-${Date.now()}`,
      entrega: e.entrega,
      responsavel: e.responsavel,
      prazo: e.prazo,
      status: e.status ?? 'amarelo',
      evidencia: e.evidencia ?? '',
    })),
    riscos: plan.riscos.map((r, i) => ({
      id: `risk-${i}-${Date.now()}`,
      risco: r.risco,
      acaoTomar: r.acaoTomar,
    })),
  };
}

function resolveSelectedActions(
  navState: unknown,
  formData: Awaited<ReturnType<typeof getInitialForm>>['data']
): SuggestedSolutionAction[] {
  const fromNav = (navState as { selectedActions?: SuggestedSolutionAction[] } | null)?.selectedActions;
  if (fromNav?.length) return fromNav;

  const fromForm = parseSelectedSolutionActions(formData);
  if (fromForm.length) return fromForm;

  return readStashedSelectedSolutionActions();
}

function linkPlansToCanvases(
  selected: SuggestedSolutionAction[],
  canvases: ActionCanvas[]
): EditablePlan[] {
  const byTitle = new Map<string, ActionCanvas>();
  for (const canvas of canvases) {
    byTitle.set(normalizeTitle(canvas.nomeIniciativa), canvas);
  }
  const used = new Set<string>();

  return selected.map((item) => {
    const key = normalizeTitle(item.draft.nomeIniciativa);
    const match = byTitle.get(key);
    if (match && !used.has(match.id)) {
      used.add(match.id);
      return fromDraft(item.draft, match.id, {
        descricao: item.descricao,
        rationale: item.rationale,
        categoria: item.categoria,
      });
    }
    return fromDraft(item.draft, undefined, {
      descricao: item.descricao,
      rationale: item.rationale,
      categoria: item.categoria,
    });
  });
}

export function DesignPlansPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<EditablePlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const syncTimers = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(null), 6000);
    return () => window.clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const validatedCount = useMemo(() => plans.filter((p) => p.validated).length, [plans]);
  const allValidated = plans.length > 0 && validatedCount === plans.length;
  const activePlan = useMemo(
    () => plans.find((p) => p.localId === activePlanId) ?? plans[0] ?? null,
    [plans, activePlanId]
  );

  const persistCanvas = useCallback(async (plan: EditablePlan): Promise<string | undefined> => {
    if (!plan.nomeIniciativa.trim()) return plan.canvasId;
    const body = toCreateBody(plan);
    if (plan.canvasId) {
      await actionCanvasesApi.update(plan.canvasId, body);
      return plan.canvasId;
    }
    const created = await actionCanvasesApi.create(body);
    return created.id;
  }, []);

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const [{ data }, canvases] = await Promise.all([
        getInitialForm(uid),
        actionCanvasesApi.list().catch(() => [] as ActionCanvas[]),
      ]);
      const selected = resolveSelectedActions(location.state, data);
      if (selected.length === 0) {
        setPlans([]);
        setActivePlanId(null);
        return;
      }
      const next = linkPlansToCanvases(selected, canvases);
      setPlans(next);
      setActivePlanId((prev) => (prev && next.some((p) => p.localId === prev) ? prev : next[0]?.localId ?? null));
    } catch {
      setError('Não foi possível carregar os planos do Solution Pick.');
    } finally {
      setLoading(false);
    }
  }, [location.state]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUserId(user?.uid ?? null);
      if (user?.uid) void load(user.uid);
      else setLoading(false);
    });
    return unsub;
  }, [load]);

  useEffect(() => {
    return () => {
      Object.values(syncTimers.current).forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const scheduleCanvasSync = useCallback(
    (plan: EditablePlan) => {
      if (!plan.canvasId) return;
      const existing = syncTimers.current[plan.localId];
      if (existing) window.clearTimeout(existing);
      syncTimers.current[plan.localId] = window.setTimeout(() => {
        setSyncingId(plan.localId);
        void persistCanvas(plan)
          .catch(() => setError('Não foi possível sincronizar o plano.'))
          .finally(() => setSyncingId(null));
      }, 450);
    },
    [persistCanvas]
  );

  const updatePlan = (localId: string, patch: Partial<EditablePlan>) => {
    setPlans((prev) => {
      const current = prev.find((p) => p.localId === localId);
      if (!current) return prev;
      const updated = {
        ...current,
        ...patch,
        validated: current.canvasId ? current.validated : false,
      };
      if (updated.canvasId) scheduleCanvasSync(updated);
      return prev.map((p) => (p.localId === localId ? updated : p));
    });
  };

  const removePlan = async (localId: string) => {
    const plan = plans.find((p) => p.localId === localId);
    if (plan?.canvasId) {
      try {
        await actionCanvasesApi.remove(plan.canvasId);
      } catch {
        setError('Não foi possível remover o plano vinculado.');
        return;
      }
    }
    setPlans((prev) => {
      const next = prev.filter((p) => p.localId !== localId);
      if (activePlanId === localId) setActivePlanId(next[0]?.localId ?? null);
      return next;
    });
  };

  const addPlan = () => {
    const plan = blankPlan();
    setPlans((prev) => [...prev, plan]);
    setActivePlanId(plan.localId);
  };

  const validatePlan = async (localId: string) => {
    const plan = plans.find((p) => p.localId === localId);
    if (!plan?.nomeIniciativa.trim()) {
      setError('Informe o nome da iniciativa antes de validar.');
      return;
    }
    setError(null);
    setSyncingId(localId);
    try {
      const canvasId = await persistCanvas(plan);
      setPlans((prev) =>
        prev.map((p) =>
          p.localId === localId ? { ...p, validated: true, canvasId: canvasId ?? p.canvasId } : p
        )
      );
      setNotice(`Plano "${plan.nomeIniciativa}" validado e sincronizado na Difusão.`);
      await syncMagnusMemoryAfterCanvasChange();
    } catch (err) {
      setError(extractApiError(err, 'Erro ao publicar o plano. Tente novamente.'));
    } finally {
      setSyncingId(null);
    }
  };


  const concludeDesign = async () => {
    if (!userId || !allValidated) return;
    setSaving(true);
    setError(null);
    try {
      for (const plan of plans) {
        if (!plan.canvasId) {
          const canvasId = await persistCanvas(plan);
          if (canvasId) {
            setPlans((prev) =>
              prev.map((p) => (p.localId === plan.localId ? { ...p, canvasId, validated: true } : p))
            );
          }
        }
      }
      await syncMagnusMemoryAfterCanvasChange();
      navigate('/dashboard/objetivos', {
        state: {
          postDesignNotice: {
            title: 'Design concluído',
            message: `${plans.length} plano(s) de ação sincronizados na Difusão.`,
          },
        },
      });
    } catch (err) {
      setError(extractApiError(err, 'Erro ao concluir o Design. Tente novamente.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="form-loading">Carregando planos de Design...</p>;
  }

  if (plans.length === 0) {
    const evolution = readStashedEvolution();
    return (
      <div className="design-plans-empty">
        {evolution && (
          <div className="design-evolution-banner">
            <p className="design-evolution-banner__eyebrow">Nova onda · Evolution Loop</p>
            <h2>Foco: {evolution.nextWave.focus}</h2>
            <p>{evolution.nextWave.rationale}</p>
          </div>
        )}
        <Sparkles size={32} aria-hidden />
        <h1>Design — planos de ação</h1>
        <p>
          {evolution
            ? 'Crie os planos desta nova onda com base nos aprendizados do ciclo anterior.'
            : 'Conclua o diagnóstico e escolha ações no Solution Pick (1.5) para chegar aqui.'}
        </p>
        <div className="design-plans-empty-actions">
          {evolution ? (
            <button type="button" className="design-plans-link" onClick={addPlan}>
              Criar primeiro plano da nova onda
            </button>
          ) : null}
          <Link to="/dashboard/initial-form" className="design-plans-link">
            Ir para o diagnóstico
          </Link>
        </div>
      </div>
    );
  }

  const evolutionCarryOver = readStashedEvolution();

  return (
    <div className="design-plans-page">
      {evolutionCarryOver && (
        <div className="design-evolution-banner">
          <p className="design-evolution-banner__eyebrow">Nova onda · Evolution Loop</p>
          <h2>Foco: {evolutionCarryOver.nextWave.focus}</h2>
          <p>{evolutionCarryOver.nextWave.rationale}</p>
        </div>
      )}
      <header className="design-plans-header sprint-wave-header">
        <div className="sprint-wave-title-group">
          <div className="sprint-wave-icon-wrapper" aria-hidden>
            <Sparkles size={26} />
          </div>
          <div className="sprint-wave-title-copy">
            <span className="design-plans-kicker sprint-wave-eyebrow">SPRINT WAVES™ · Onda 2</span>
            <h1 className="sprint-wave-title">Design</h1>
            <p className="sprint-wave-subtitle">
              Valide seus planos de ação e confirme apenas o que estiver pronto para ser publicado na Difusão.
            </p>
          </div>
        </div>
        <div className="design-plans-progress sprint-wave-side" aria-label={`${validatedCount} de ${plans.length} planos validados`}>
          <strong>
            {validatedCount}/{plans.length}
          </strong>
          <span>validados</span>
        </div>
      </header>

      {(error || notice) && (
        <div className="design-plans-toast-stack">
          {error && (
            <div className="design-plans-toast design-plans-toast--error" role="alert">
              <span className="design-plans-toast-icon" aria-hidden>
                <AlertCircle size={18} />
              </span>
              <span className="design-plans-toast-text">{error}</span>
              <button
                type="button"
                className="design-plans-toast-close"
                onClick={() => setError(null)}
                aria-label="Fechar aviso"
              >
                <X size={15} aria-hidden />
              </button>
            </div>
          )}
          {notice && (
            <div className="design-plans-toast design-plans-toast--success" role="status">
              <span className="design-plans-toast-icon" aria-hidden>
                <CheckCircle2 size={18} />
              </span>
              <span className="design-plans-toast-text">{notice}</span>
              <button
                type="button"
                className="design-plans-toast-close"
                onClick={() => setNotice(null)}
                aria-label="Fechar aviso"
              >
                <X size={15} aria-hidden />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="design-plans-workspace design-plans-workspace--single">
        <div className="design-plans-editor">
          <div
            className="design-plans-grid"
            data-plan-count={Math.min(plans.length, 4)}
          >
            {plans.map((plan, index) => (
              <article
                key={plan.localId}
                className={`design-plan-card ${plan.validated ? 'is-validated' : ''} ${
                  activePlan?.localId === plan.localId ? 'is-active' : ''
                }`}
                onClick={() => setActivePlanId(plan.localId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setActivePlanId(plan.localId);
                }}
                role="button"
                tabIndex={0}
              >
                <div className="design-plan-card-head">
                  <div className="design-plan-card-title">
                    <span className="design-plan-index" aria-hidden>
                      {index + 1}
                    </span>
                    <h2>Plano de ação</h2>
                  </div>
                  {plan.validated && (
                    <span className="design-plan-validated">
                      <CheckCircle2 size={15} aria-hidden />
                      Validado
                    </span>
                  )}
                  {syncingId === plan.localId && (
                    <Loader2 size={14} className="spin design-plan-sync" aria-label="Sincronizando" />
                  )}
                </div>

                <label className="design-plan-field" onClick={(e) => e.stopPropagation()}>
                  <span>Iniciativa</span>
                  <input
                    value={plan.nomeIniciativa}
                    onChange={(e) => updatePlan(plan.localId, { nomeIniciativa: e.target.value })}
                  />
                </label>
                <label className="design-plan-field design-plan-field--objective" onClick={(e) => e.stopPropagation()}>
                  <span>Objetivo específico</span>
                  <small className="design-plan-field-hint">
                    Resultado mensurável, contexto do diagnóstico, critério de sucesso e escopo
                  </small>
                  <textarea
                    rows={5}
                    value={plan.objetivoEspecifico}
                    onChange={(e) => updatePlan(plan.localId, { objetivoEspecifico: e.target.value })}
                    placeholder="Ex.: Até 30/09, reduzir em 20% o retrabalho no processo X, com piloto em 2 squads, métrica semanal validada pelo sponsor e evidências nas entregas."
                  />
                </label>
                <div className="design-plan-row">
                  <label className="design-plan-field" onClick={(e) => e.stopPropagation()}>
                    <span>Owner</span>
                    <input value={plan.owner} onChange={(e) => updatePlan(plan.localId, { owner: e.target.value })} />
                  </label>
                  <label className="design-plan-field" onClick={(e) => e.stopPropagation()}>
                    <span>Sponsor</span>
                    <input value={plan.sponsor} onChange={(e) => updatePlan(plan.localId, { sponsor: e.target.value })} />
                  </label>
                </div>
                <label className="design-plan-field" onClick={(e) => e.stopPropagation()}>
                  <span>Prazo final</span>
                  <input
                    type="date"
                    value={plan.prazoFinal}
                    onChange={(e) => updatePlan(plan.localId, { prazoFinal: e.target.value })}
                  />
                </label>

                <div className="design-plan-deliveries">
                  <h3>Sugestões personalizadas para você</h3>
                  <ul>
                    {plan.entregas.map((e, i) => (
                      <li key={i}>
                        {e.entrega} - {e.responsavel}, {e.prazo}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="design-plan-actions" onClick={(e) => e.stopPropagation()}>
                  {!plan.validated && (
                    <button
                      type="button"
                      className="design-plan-btn is-primary"
                      onClick={() => void validatePlan(plan.localId)}
                      disabled={syncingId === plan.localId}
                    >
                      Validar plano
                    </button>
                  )}
                  <button
                    type="button"
                    className="design-plan-btn is-danger"
                    onClick={() => void removePlan(plan.localId)}
                    aria-label="Remover plano"
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <footer className="design-plans-footer">
        <button type="button" className="design-plan-btn is-ghost" onClick={addPlan}>
          <Plus size={16} aria-hidden />
          Adicionar plano
        </button>
        <button
          type="button"
          className="design-plans-conclude"
          disabled={!allValidated || saving}
          onClick={() => void concludeDesign()}
        >
          {saving ? <Loader2 size={18} className="spin" aria-hidden /> : <ArrowRight size={18} aria-hidden />}
          Concluir Design e ir para Difusão
        </button>
      </footer>
    </div>
  );
}
