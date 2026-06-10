import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Plus,
  Sparkles,
  Trash2,
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
import type { SuggestedActionCanvasDraft } from '../types';

type EditablePlan = SuggestedActionCanvasDraft & {
  localId: string;
  validated: boolean;
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

function fromDraft(draft: SuggestedActionCanvasDraft): EditablePlan {
  return {
    localId: newId(),
    validated: false,
    ...draft,
  };
}

function toCreateBody(plan: EditablePlan) {
  return {
    nomeIniciativa: plan.nomeIniciativa.trim(),
    objetivoEspecifico: plan.objetivoEspecifico.trim(),
    owner: plan.owner.trim() || 'A definir',
    sponsor: plan.sponsor.trim() || 'A definir',
    prazoFinal: plan.prazoFinal || defaultPrazo(90),
    signOff: 'pendente',
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

export function DesignPlansPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userId, setUserId] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<EditablePlan[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const validatedCount = useMemo(() => plans.filter((p) => p.validated).length, [plans]);
  const allValidated = plans.length > 0 && validatedCount === plans.length;

  const load = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getInitialForm(uid);
      const selected = resolveSelectedActions(location.state, data);
      if (selected.length === 0) {
        setPlans([]);
        return;
      }
      setPlans(selected.map((s) => fromDraft(s.draft)));
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

  const updatePlan = (localId: string, patch: Partial<EditablePlan>) => {
    setPlans((prev) => prev.map((p) => (p.localId === localId ? { ...p, ...patch, validated: false } : p)));
  };

  const removePlan = (localId: string) => {
    setPlans((prev) => prev.filter((p) => p.localId !== localId));
  };

  const addPlan = () => {
    setPlans((prev) => [...prev, blankPlan()]);
  };

  const validatePlan = (localId: string) => {
    const plan = plans.find((p) => p.localId === localId);
    if (!plan?.nomeIniciativa.trim()) {
      setError('Informe o nome da iniciativa antes de validar.');
      return;
    }
    setError(null);
    setPlans((prev) => prev.map((p) => (p.localId === localId ? { ...p, validated: true } : p)));
    setNotice(`Plano "${plan.nomeIniciativa}" validado.`);
  };

  const openEnrichmentChat = (plan: EditablePlan) => {
    const message = `Quero enriquecer o plano de ação "${plan.nomeIniciativa}". Objetivo: ${plan.objetivoEspecifico}. Me ajude a detalhar entregas, riscos e como executar. Isso é só consulta, não altera meu fluxo.`;
    navigate('/dashboard/consultoria-ia', {
      state: { enrichAction: plan.nomeIniciativa, prefillMessage: message },
    });
  };

  const concludeDesign = async () => {
    if (!userId || !allValidated) return;
    setSaving(true);
    setError(null);
    try {
      for (const plan of plans) {
        await actionCanvasesApi.create(toCreateBody(plan));
      }
      await syncMagnusMemoryAfterCanvasChange();
      navigate('/dashboard/objetivos', {
        state: {
          postDesignNotice: {
            title: 'Design concluído',
            message: `${plans.length} plano(s) de ação enviados para a Difusão.`,
          },
        },
      });
    } catch {
      setError('Erro ao publicar planos na Difusão. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="form-loading">Carregando planos de Design…</p>;
  }

  if (plans.length === 0) {
    return (
      <div className="design-plans-empty">
        <Sparkles size={32} aria-hidden />
        <h1>Design — planos de ação</h1>
        <p>Selecione ações no Solution Pick (etapa 1.5) para preencher os templates aqui.</p>
        <Link to="/dashboard/initial-form" className="design-plans-link">
          Ir para o diagnóstico
        </Link>
      </div>
    );
  }

  return (
    <div className="design-plans-page">
      <header className="design-plans-header">
        <div>
          <span className="design-plans-kicker">Onda 2 · Design</span>
          <h1>Valide seus planos de ação</h1>
          <p>
            Templates pré-preenchidos a partir do Solution Pick. Revise cada plano, valide e conclua — todos irão para
            a Difusão (Action Canvas).
          </p>
        </div>
        <div className="design-plans-progress" aria-label={`${validatedCount} de ${plans.length} planos validados`}>
          <strong>
            {validatedCount}/{plans.length}
          </strong>
          <span>validados</span>
        </div>
      </header>

      {notice && (
        <p className="design-plans-notice is-success" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="design-plans-notice is-error" role="alert">
          {error}
        </p>
      )}

      <div className="design-plans-grid">
        {plans.map((plan) => (
          <article key={plan.localId} className={`design-plan-card ${plan.validated ? 'is-validated' : ''}`}>
            <div className="design-plan-card-head">
              <h2>Plano de ação</h2>
              {plan.validated && (
                <span className="design-plan-validated">
                  <CheckCircle2 size={15} aria-hidden />
                  Validado
                </span>
              )}
            </div>

            <label className="design-plan-field">
              <span>Iniciativa</span>
              <input
                value={plan.nomeIniciativa}
                onChange={(e) => updatePlan(plan.localId, { nomeIniciativa: e.target.value })}
              />
            </label>
            <label className="design-plan-field">
              <span>Objetivo específico</span>
              <textarea
                rows={3}
                value={plan.objetivoEspecifico}
                onChange={(e) => updatePlan(plan.localId, { objetivoEspecifico: e.target.value })}
              />
            </label>
            <div className="design-plan-row">
              <label className="design-plan-field">
                <span>Owner</span>
                <input value={plan.owner} onChange={(e) => updatePlan(plan.localId, { owner: e.target.value })} />
              </label>
              <label className="design-plan-field">
                <span>Sponsor</span>
                <input value={plan.sponsor} onChange={(e) => updatePlan(plan.localId, { sponsor: e.target.value })} />
              </label>
            </div>
            <label className="design-plan-field">
              <span>Prazo final</span>
              <input
                type="date"
                value={plan.prazoFinal}
                onChange={(e) => updatePlan(plan.localId, { prazoFinal: e.target.value })}
              />
            </label>

            <div className="design-plan-deliveries">
              <h3>Entregas sugeridas</h3>
              <ul>
                {plan.entregas.map((e, i) => (
                  <li key={i}>
                    {e.entrega} - {e.responsavel}, {e.prazo}
                  </li>
                ))}
              </ul>
            </div>

            <div className="design-plan-actions">
              <button type="button" className="design-plan-btn is-ghost" onClick={() => openEnrichmentChat(plan)}>
                <MessageCircle size={16} aria-hidden />
                Conversar com IA
              </button>
              {!plan.validated && (
                <button type="button" className="design-plan-btn is-primary" onClick={() => validatePlan(plan.localId)}>
                  Validar plano
                </button>
              )}
              <button
                type="button"
                className="design-plan-btn is-danger"
                onClick={() => removePlan(plan.localId)}
                aria-label="Remover plano"
              >
                <Trash2 size={16} aria-hidden />
              </button>
            </div>
          </article>
        ))}
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
          Concluir Design e enviar para Difusão
        </button>
      </footer>
    </div>
  );
}
