import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Loader2,
  Mail,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { actionCanvasesApi, teamApi } from '../../services/api';
import { syncMagnusMemoryAfterCanvasChange } from '../../services/magnusMemorySync';
import { TeamMemberCombobox } from '../ui/TeamMemberCombobox';
import { ToastStack, type ToastItem } from '../ui/ToastStack';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { DeliveryChecklistEditor } from './DeliveryChecklistEditor';
import type {
  ActionCanvas,
  ActionCanvasDelivery,
  ActionCanvasRisk,
  ActionCanvasSignOff,
  DeliveryChecklistItem,
  RiskImpact,
  RiskProbability,
  RiskStatus,
} from '../../types';
import {
  averageChecklistProgress,
  deriveDeliveryStatusFromChecklist,
  getDeliveryChecklistItems,
  statusLabelPt,
} from '../../utils/deliveryChecklist';

const STEPS = [
  { id: 1, title: 'Mobilização', hint: 'Revise o que veio do Design' },
  { id: 2, title: 'Execução', hint: 'Checklist e responsáveis' },
  { id: 3, title: 'Riscos', hint: 'Antecipe e mitigue' },
  { id: 4, title: 'Sign-off', hint: 'Conclua a iniciativa' },
] as const;

const MAX_RISCOS = 8;

const IMPACTO_OPTIONS: { value: RiskImpact; label: string }[] = [
  { value: 'alto', label: 'Alto' },
  { value: 'medio', label: 'Médio' },
  { value: 'baixo', label: 'Baixo' },
];

const PROB_OPTIONS: { value: RiskProbability; label: string }[] = [
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Média' },
  { value: 'baixa', label: 'Baixa' },
];

const RISK_STATUS_OPTIONS: { value: RiskStatus; label: string }[] = [
  { value: 'nao_iniciado', label: 'Não iniciado' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'mitigado', label: 'Mitigado' },
  { value: 'monitorando', label: 'Monitorando' },
];

type DrawerKind = 'delivery' | 'signoff' | null;

function newRiskId() {
  return `risk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyRisk(): ActionCanvasRisk {
  return {
    id: newRiskId(),
    risco: '',
    acaoTomar: '',
    impacto: 'medio',
    probabilidade: 'media',
    responsavel: '',
    status: 'nao_iniciado',
  };
}

function normalizeRisk(raw: Partial<ActionCanvasRisk> | Record<string, unknown>, index = 0): ActionCanvasRisk {
  const r = raw as Record<string, unknown>;
  const impacto =
    r.impacto === 'alto' || r.impacto === 'medio' || r.impacto === 'baixo' ? r.impacto : 'medio';
  const probabilidade =
    r.probabilidade === 'alta' || r.probabilidade === 'media' || r.probabilidade === 'baixa'
      ? r.probabilidade
      : 'media';
  const status =
    r.status === 'nao_iniciado' ||
    r.status === 'em_andamento' ||
    r.status === 'mitigado' ||
    r.status === 'monitorando'
      ? r.status
      : 'nao_iniciado';
  return {
    id: typeof r.id === 'string' && r.id ? r.id : `risk-${index}-${newRiskId()}`,
    risco: String(r.risco ?? ''),
    acaoTomar: String(r.acaoTomar ?? r.acao ?? r.plano ?? ''),
    impacto,
    probabilidade,
    responsavel: String(r.responsavel ?? ''),
    status,
  };
}

function suggestRisksLocal(canvas: ActionCanvas): ActionCanvasRisk[] {
  const name = canvas.nomeIniciativa.trim() || 'esta iniciativa';
  return [
    {
      id: newRiskId(),
      risco: `Desalinhamento entre áreas em ${name}`,
      acaoTomar: 'Checkpoint semanal com owners e sponsor',
      impacto: 'alto',
      probabilidade: 'media',
      responsavel: canvas.owner || '',
      status: 'em_andamento',
    },
    {
      id: newRiskId(),
      risco: 'Resistência à mudança na equipe impactada',
      acaoTomar: 'Comunicação clara e treinamento prático',
      impacto: 'medio',
      probabilidade: 'alta',
      responsavel: canvas.owner || '',
      status: 'nao_iniciado',
    },
  ];
}

function normalizeCanvas(raw: Record<string, unknown>): ActionCanvas {
  return {
    id: String(raw.id),
    nomeIniciativa: String(raw.nomeIniciativa ?? ''),
    objetivoEspecifico: String(raw.objetivoEspecifico ?? ''),
    owner: String(raw.owner ?? ''),
    sponsor: String(raw.sponsor ?? ''),
    prazoFinal: String(raw.prazoFinal ?? ''),
    successCriteria: Array.isArray(raw.successCriteria)
      ? raw.successCriteria.map(String)
      : undefined,
    inheritedFromCycle: Boolean(raw.inheritedFromCycle),
    mobilizationNotes: raw.mobilizationNotes != null ? String(raw.mobilizationNotes) : undefined,
    entregas: Array.isArray(raw.entregas)
      ? (raw.entregas as ActionCanvasDelivery[]).map((d) => {
          const checklistItems = getDeliveryChecklistItems(d);
          const responsavel = isRolePlaceholder(String(d.responsavel ?? ''))
            ? ''
            : String(d.responsavel ?? '');
          const status = checklistItems.some((i) => i.texto.trim())
            ? deriveDeliveryStatusFromChecklist(checklistItems, d.prazo)
            : d.status === 'verde' || d.status === 'amarelo' || d.status === 'vermelho'
              ? d.status
              : 'amarelo';
          return {
            ...d,
            responsavel,
            checklistItems,
            status,
            evidencia: String(d.evidencia ?? ''),
          };
        })
      : [],
    riscos: Array.isArray(raw.riscos)
      ? raw.riscos.map((r, i) => normalizeRisk(r as Record<string, unknown>, i))
      : [],
    signOff: (raw.signOff as ActionCanvasSignOff) || 'pendente',
    fechado: Boolean(raw.fechado),
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

function isRolePlaceholder(value: string): boolean {
  const n = value.trim().toLowerCase();
  return (
    !n ||
    n === 'owner' ||
    n === 'sponsor' ||
    n === 'equipe núcleo' ||
    n === 'equipe nucleo' ||
    n === 'líder da iniciativa' ||
    n === 'lider da iniciativa'
  );
}

function deliverySponsorValue(delivery: ActionCanvasDelivery, canvasSponsor?: string): string {
  if (!isRolePlaceholder(delivery.responsavel)) return delivery.responsavel;
  if (canvasSponsor && !isRolePlaceholder(canvasSponsor)) return canvasSponsor;
  return '';
}

/** Sempre 3 slots editáveis (como no Design). */
function normalizeCriteria(list?: string[]): string[] {
  const next = (list ?? []).map((c) => String(c ?? '')).slice(0, 3);
  while (next.length < 3) next.push('');
  return next;
}

interface Props {
  onCanvasClosed?: () => void;
}

export function DiffusionWorkspace({ onCanvasClosed }: Props) {
  const [canvases, setCanvases] = useState<ActionCanvas[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [drawer, setDrawer] = useState<DrawerKind>(null);
  const [drawerDeliveryId, setDrawerDeliveryId] = useState<string | null>(null);
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [drawerSaved, setDrawerSaved] = useState(false);
  const [suggestingCriteria, setSuggestingCriteria] = useState(false);
  const [suggestingRisks, setSuggestingRisks] = useState(false);
  const [remindingRiskId, setRemindingRiskId] = useState<string | null>(null);
  const [suggestingActions, setSuggestingActions] = useState(false);
  const [remindingChecklistId, setRemindingChecklistId] = useState<string | null>(null);

  useBodyScrollLock(Boolean(drawer));

  const pushToast = useCallback((tone: ToastItem['tone'], message: string, title?: string) => {
    const id = `diffusion-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, tone, message, title }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawer(null);
    setDrawerDeliveryId(null);
    setDrawerSaved(false);
    setEmailHint(null);
  }, []);

  const active = useMemo(
    () => canvases.find((c) => c.id === activeId) ?? canvases[0] ?? null,
    [canvases, activeId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await actionCanvasesApi.list();
      const normalized = (Array.isArray(list) ? list : []).map((c) =>
        normalizeCanvas(c as unknown as Record<string, unknown>)
      );
      setCanvases(normalized);
      setActiveId((prev) =>
        prev && normalized.some((c) => c.id === prev) ? prev : normalized[0]?.id ?? null
      );
    } catch {
      setNotice('Não foi possível carregar as iniciativas do Design.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) closeDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer, saving, closeDrawer]);

  useEffect(() => {
    setDrawerSaved(false);
  }, [drawer, drawerDeliveryId]);

  useEffect(() => {
    if (step !== 3 || !active || active.fechado || active.riscos.length > 0) return;
    const canvasId = active.id;
    setCanvases((prev) =>
      prev.map((c) => (c.id !== canvasId ? c : { ...c, riscos: [emptyRisk()] }))
    );
  }, [step, active?.id, active?.fechado, active?.riscos.length]);

  const patchActive = async (
    patch: Partial<ActionCanvas>,
    opts?: { deliveryId?: string; riskAssign?: boolean; successMessage?: string },
  ): Promise<boolean> => {
    if (!active) return false;
    setSaving(true);
    setEmailHint(null);
    try {
      const body = { ...active, ...patch };
      const updated = await actionCanvasesApi.update(active.id, body);
      const next = normalizeCanvas(updated as unknown as Record<string, unknown>);
      setCanvases((prev) => prev.map((c) => (c.id === next.id ? next : c)));
      await syncMagnusMemoryAfterCanvasChange();
      if (opts?.deliveryId || opts?.riskAssign) {
        setEmailHint(
          'O Sponsor recebe e-mail ao ser definido e a cada atualização desta execução (se estiver na equipe com e-mail).',
        );
      }
      const successMessage = opts?.successMessage ?? 'Alterações salvas com sucesso.';
      setNotice(successMessage);
      pushToast('success', successMessage, 'Salvo');
      setDrawerSaved(true);
      if (next.fechado) onCanvasClosed?.();
      return true;
    } catch {
      setNotice('Erro ao salvar. Tente novamente.');
      pushToast('error', 'Não foi possível salvar. Tente novamente.', 'Erro ao salvar');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const suggestCriteria = async () => {
    if (!active || suggestingCriteria) return;
    setSuggestingCriteria(true);
    try {
      const result = await actionCanvasesApi.suggestSuccessCriteria({
        nomeIniciativa: active.nomeIniciativa.trim(),
        objetivoEspecifico: active.objetivoEspecifico.trim(),
        prazoFinal: active.prazoFinal,
        entregas: active.entregas.map((item) => item.entrega.trim()).filter(Boolean),
        riscos: active.riscos.map((item) => item.risco.trim()).filter(Boolean),
      });
      if (result.criteria.length !== 3) {
        throw new Error('A IA não retornou os três critérios esperados.');
      }
      await patchActive(
        { successCriteria: result.criteria },
        {
          successMessage: result.demoMode
            ? 'Critérios SMART gerados com o modelo de contingência.'
            : 'Três critérios SMART distintos foram gerados e salvos.',
        },
      );
    } catch {
      setNotice('Não foi possível sugerir os critérios. Tente novamente.');
      pushToast('error', 'Não foi possível gerar novos critérios SMART.', 'Erro na sugestão');
    } finally {
      setSuggestingCriteria(false);
    }
  };

  const openDelivery = (id: string) => {
    setDrawerDeliveryId(id);
    setDrawer('delivery');
  };

  const updateActiveRisk = (riskId: string, patch: Partial<ActionCanvasRisk>) => {
    if (!active) return;
    setCanvases((prev) =>
      prev.map((c) =>
        c.id !== active.id
          ? c
          : {
              ...c,
              riscos: c.riscos.map((r) => (r.id === riskId ? { ...r, ...patch } : r)),
            }
      )
    );
  };

  const addRisk = () => {
    if (!active || active.riscos.length >= MAX_RISCOS) return;
    setCanvases((prev) =>
      prev.map((c) => (c.id !== active.id ? c : { ...c, riscos: [...c.riscos, emptyRisk()] }))
    );
  };

  const removeRisk = (riskId: string) => {
    if (!active) return;
    setCanvases((prev) =>
      prev.map((c) =>
        c.id !== active.id ? c : { ...c, riscos: c.riscos.filter((r) => r.id !== riskId) }
      )
    );
  };

  const suggestRisks = async () => {
    if (!active || suggestingRisks) return;
    setSuggestingRisks(true);
    try {
      const result = await actionCanvasesApi.suggestRisks(active.id);
      const suggested = (result.risks ?? []).map((r, i) => normalizeRisk(r, i));
      const filled = active.riscos.filter((r) => r.risco.trim() || r.acaoTomar.trim());
      const room = Math.max(0, MAX_RISCOS - filled.length);
      const merged = [...filled, ...suggested.slice(0, room)];
      setCanvases((prev) =>
        prev.map((c) => (c.id !== active.id ? c : { ...c, riscos: merged.length ? merged : suggested }))
      );
      pushToast(
        'success',
        result.demoMode
          ? 'Sugestões locais aplicadas — revise e salve.'
          : 'Riscos sugeridos pela IA — revise e salve.',
        'IA'
      );
    } catch {
      const local = suggestRisksLocal(active);
      const filled = active.riscos.filter((r) => r.risco.trim() || r.acaoTomar.trim());
      const room = Math.max(0, MAX_RISCOS - filled.length);
      const merged = [...filled, ...local.slice(0, room)];
      setCanvases((prev) =>
        prev.map((c) => (c.id !== active.id ? c : { ...c, riscos: merged.length ? merged : local }))
      );
      pushToast('success', 'Sugestões locais aplicadas — revise e salve.', 'IA offline');
    } finally {
      setSuggestingRisks(false);
    }
  };

  const sendRiskReminder = async (risk: ActionCanvasRisk) => {
    if (!active || !risk.responsavel?.trim()) {
      pushToast('error', 'Selecione um responsável antes de enviar o reminder.', 'Reminder');
      return;
    }
    // Garante que o risco está salvo no servidor antes do reminder
    const saved = await patchActive(
      { riscos: (canvases.find((c) => c.id === active.id) ?? active).riscos },
      { successMessage: 'Risco atualizado.' },
    );
    if (!saved) return;

    setRemindingRiskId(risk.id);
    try {
      const result = await actionCanvasesApi.remindRisk(active.id, risk.id);
      if (result.demoMode) {
        pushToast(
          'warning',
          'E-mail em modo demonstração (SMTP não configurado). O texto foi gerado.',
          'Reminder'
        );
      } else if (result.sent) {
        pushToast('success', 'Reminder enviado ao responsável.', 'Reminder');
      } else {
        pushToast('error', result.reason || 'Não foi possível enviar o reminder.', 'Reminder');
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? String(
              (err as { response?: { data?: { error?: string } } }).response?.data?.error ||
                'Não foi possível enviar o reminder.'
            )
          : 'Não foi possível enviar o reminder.';
      pushToast('error', msg, 'Reminder');
    } finally {
      setRemindingRiskId(null);
    }
  };

  const updateDeliveryChecklist = (deliveryId: string, checklistItems: DeliveryChecklistItem[]) => {
    if (!active) return;
    const status = deriveDeliveryStatusFromChecklist(
      checklistItems,
      active.entregas.find((d) => d.id === deliveryId)?.prazo
    );
    setCanvases((prev) =>
      prev.map((c) =>
        c.id !== active.id
          ? c
          : {
              ...c,
              entregas: c.entregas.map((d) =>
                d.id === deliveryId
                  ? {
                      ...d,
                      checklistItems,
                      checklist: checklistItems.map((i) => i.texto).filter(Boolean),
                      status,
                    }
                  : d
              ),
            }
      )
    );
  };

  const suggestDeliveryActions = async (deliveryId: string) => {
    if (!active || suggestingActions) return;
    setSuggestingActions(true);
    try {
      const result = await actionCanvasesApi.suggestDeliveryActions(active.id, deliveryId);
      const suggested = result.items ?? [];
      const current = getDeliveryChecklistItems(
        active.entregas.find((d) => d.id === deliveryId) ?? { checklistItems: [] }
      );
      const filled = current.filter((i) => i.texto.trim());
      const merged = [...filled, ...suggested].slice(0, 20);
      updateDeliveryChecklist(deliveryId, merged.length ? merged : suggested);
      pushToast(
        'success',
        result.demoMode
          ? 'Sugestões locais aplicadas — revise e salve o progresso.'
          : 'Ações sugeridas pela IA — revise e salve o progresso.',
        'IA'
      );
    } catch {
      pushToast('error', 'Não foi possível sugerir ações agora.', 'IA');
    } finally {
      setSuggestingActions(false);
    }
  };

  const sendChecklistReminder = async (deliveryId: string, item: DeliveryChecklistItem) => {
    if (!active || !item.responsavel?.trim()) {
      pushToast('error', 'Selecione um responsável antes do lembrete.', 'Lembrete');
      return;
    }
    const latest = canvases.find((c) => c.id === active.id) ?? active;
    const saved = await patchActive(
      { entregas: latest.entregas },
      { successMessage: 'Progresso atualizado.' },
    );
    if (!saved) return;

    setRemindingChecklistId(item.id);
    try {
      const result = await actionCanvasesApi.remindChecklistItem(active.id, deliveryId, item.id);
      if (result.demoMode) {
        pushToast(
          'warning',
          'E-mail em modo demonstração (SMTP não configurado).',
          'Lembrete'
        );
      } else if (result.sent) {
        pushToast('success', 'Lembrete enviado ao responsável da ação.', 'Lembrete');
      } else {
        pushToast('error', result.reason || 'Não foi possível enviar o lembrete.', 'Lembrete');
      }
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? String(
              (err as { response?: { data?: { error?: string } } }).response?.data?.error ||
                'Não foi possível enviar o lembrete.'
            )
          : 'Não foi possível enviar o lembrete.';
      pushToast('error', msg, 'Lembrete');
    } finally {
      setRemindingChecklistId(null);
    }
  };

  const delivery = active?.entregas.find((e) => e.id === drawerDeliveryId) ?? null;
  const deliveryChecklistItems = delivery ? getDeliveryChecklistItems(delivery) : [];
  const deliveryProgressPct = averageChecklistProgress(deliveryChecklistItems) ?? 0;
  const deliveryStatusKey = delivery?.status || 'amarelo';
  const deliveryStatusText = statusLabelPt(deliveryStatusKey);

  const resolveEmailForMember = async (nameOrEmail: string): Promise<string> => {
    if (nameOrEmail.includes('@')) return nameOrEmail;
    try {
      const members = await teamApi.list();
      const list = Array.isArray(members) ? members : [];
      const match = list.find((m: { nome?: string; name?: string; email?: string }) => {
        const n = (m.nome || m.name || '').toLowerCase();
        return n === nameOrEmail.trim().toLowerCase() && m.email;
      });
      return match?.email ? String(match.email) : nameOrEmail;
    } catch {
      return nameOrEmail;
    }
  };

  if (loading) {
    return <p className="form-loading">Carregando Difusão…</p>;
  }

  if (canvases.length === 0) {
    return (
      <div className="diffusion-v2-empty">
        <ClipboardList size={28} aria-hidden />
        <h2>Nenhuma iniciativa do Design</h2>
        <p>Conclua e valide planos na etapa Design para importá-los aqui.</p>
      </div>
    );
  }

  return (
      <div className="diffusion-v2">
      {createPortal(<ToastStack toasts={toasts} onDismiss={dismissToast} />, document.body)}
      {saving || notice ? (
        <div className="diffusion-v2-toolbar">
          {saving ? (
            <span className="diffusion-v2-saving">
              <Loader2 size={14} className="spin" aria-hidden /> Salvando…
            </span>
          ) : null}
          {notice ? <span className="diffusion-v2-notice">{notice}</span> : null}
        </div>
      ) : null}

      <div className="diffusion-v2-initiatives" role="list">
        {canvases.map((c, index) => (
          <button
            key={c.id}
            type="button"
            role="listitem"
            className={`diffusion-v2-initiative ${c.id === active?.id ? 'is-active' : ''} ${
              c.fechado ? 'is-closed' : ''
            }`}
            onClick={() => {
              setActiveId(c.id);
              setStep(1);
              setDrawer(null);
            }}
          >
            <span className="diffusion-v2-initiative-num" aria-hidden>
              {index + 1}
            </span>
            <span className="diffusion-v2-initiative-copy">
              <strong>{c.nomeIniciativa || 'Sem nome'}</strong>
              <span>{c.fechado ? 'Encerrada' : c.owner || 'Sem owner'}</span>
            </span>
          </button>
        ))}
      </div>

      {active ? (
        <>
          <nav className="diffusion-v2-steps" aria-label="Etapas da Difusão">
            {STEPS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`diffusion-v2-step ${step === s.id ? 'is-active' : ''} ${
                  step > s.id ? 'is-done' : ''
                }`}
                onClick={() => setStep(s.id)}
              >
                <span className="diffusion-v2-step-num">{s.id}</span>
                <span>
                  <strong>{s.title}</strong>
                  <em>{s.hint}</em>
                </span>
                {s.id < 4 ? <ChevronRight size={14} aria-hidden /> : null}
              </button>
            ))}
          </nav>

          {step === 1 ? (
            <section className="diffusion-v2-panel">
              <h3>Mobilização</h3>
              <p className="diffusion-v2-lead">
                Confirme o que veio do Design e alinhe a equipe antes de executar.
              </p>
              <label className="diffusion-v2-field">
                <span>Iniciativa</span>
                <input
                  value={active.nomeIniciativa}
                  onChange={(e) =>
                    setCanvases((prev) =>
                      prev.map((c) =>
                        c.id === active.id ? { ...c, nomeIniciativa: e.target.value } : c
                      )
                    )
                  }
                  onBlur={() => void patchActive({ nomeIniciativa: active.nomeIniciativa })}
                />
              </label>
              <label className="diffusion-v2-field">
                <span>O que pretende alcançar</span>
                <textarea
                  rows={5}
                  value={active.objetivoEspecifico}
                  onChange={(e) =>
                    setCanvases((prev) =>
                      prev.map((c) =>
                        c.id === active.id ? { ...c, objetivoEspecifico: e.target.value } : c
                      )
                    )
                  }
                  onBlur={() => void patchActive({ objetivoEspecifico: active.objetivoEspecifico })}
                />
              </label>
              <div className="diffusion-v2-criteria">
                <div className="diffusion-v2-criteria-head">
                  <span>Critérios de sucesso (Design)</span>
                  <button
                    type="button"
                    className="diffusion-v2-criteria-suggest"
                    disabled={saving || suggestingCriteria || active.fechado}
                    onClick={() => void suggestCriteria()}
                  >
                    {suggestingCriteria ? (
                      <Loader2 size={14} className="spin" aria-hidden />
                    ) : (
                      <Sparkles size={14} aria-hidden />
                    )}
                    {suggestingCriteria ? 'Gerando…' : 'Sugerir critérios'}
                  </button>
                </div>
                <p className="diffusion-v2-criteria-hint">
                  Edite aqui se precisar ajustar os indicadores — as alterações salvam com a iniciativa.
                </p>
                <div className="diffusion-v2-criteria-fields">
                  {normalizeCriteria(active.successCriteria).map((criterion, index) => (
                    <label key={`criterion-${index}`} className="diffusion-v2-field">
                      <span className="diffusion-v2-criteria-index">
                        Critério {index + 1} · {['Resultado', 'Adoção', 'Qualidade / sustentação'][index]}
                      </span>
                      <input
                        value={criterion}
                        placeholder={`Indicador observável ${index + 1}`}
                        onChange={(e) => {
                          const value = e.target.value;
                          setCanvases((prev) =>
                            prev.map((c) => {
                              if (c.id !== active.id) return c;
                              const next = normalizeCriteria(c.successCriteria);
                              next[index] = value;
                              return { ...c, successCriteria: next };
                            }),
                          );
                        }}
                        onBlur={(e) => {
                          const next = normalizeCriteria(active.successCriteria);
                          next[index] = e.target.value;
                          void patchActive({ successCriteria: next });
                        }}
                      />
                    </label>
                  ))}
                </div>
              </div>
              <label className="diffusion-v2-field">
                <span>Comentários Gerais</span>
                <textarea
                  rows={4}
                  value={active.mobilizationNotes ?? ''}
                  placeholder="Observações, alinhamentos, dependências…"
                  onChange={(e) =>
                    setCanvases((prev) =>
                      prev.map((c) =>
                        c.id === active.id ? { ...c, mobilizationNotes: e.target.value } : c,
                      ),
                    )
                  }
                  onBlur={() =>
                    void patchActive({ mobilizationNotes: active.mobilizationNotes ?? '' })
                  }
                />
              </label>
              <button type="button" className="diffusion-v2-next" onClick={() => setStep(2)}>
                Ir para Execução <ChevronRight size={16} aria-hidden />
              </button>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="diffusion-v2-panel">
              <h3>Execução</h3>
              <p className="diffusion-v2-lead">Abra cada ação para checklist, prazo e responsável.</p>
              <ul className="diffusion-v2-list">
                {active.entregas.map((e) => (
                  <li key={e.id}>
                    <button type="button" onClick={() => openDelivery(e.id)}>
                      <strong>{e.entrega || 'Entrega sem título'}</strong>
                      <span>
                        {deliverySponsorValue(e, active.sponsor) || 'Sem sponsor'} ·{' '}
                        {e.prazo || 'Sem prazo'} · {e.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <button type="button" className="diffusion-v2-next" onClick={() => setStep(3)}>
                Ir para Riscos <ChevronRight size={16} aria-hidden />
              </button>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="diffusion-v2-panel">
              <div className="diffusion-v2-risks-head">
                <h3>Riscos</h3>
                <button
                  type="button"
                  className="diffusion-v2-ai-btn"
                  disabled={suggestingRisks || active.fechado}
                  onClick={() => void suggestRisks()}
                >
                  {suggestingRisks ? (
                    <Loader2 size={14} className="spin" aria-hidden />
                  ) : (
                    <Sparkles size={14} aria-hidden />
                  )}
                  Sugerir riscos com IA
                </button>
              </div>
              <p className="diffusion-v2-lead">
                Mapeie riscos, defina o plano e atribua um responsável. Ao salvar, o responsável
                recebe um e-mail.
              </p>

              <div className="diffusion-v2-risks">
                {active.riscos.map((risk) => (
                    <article key={risk.id} className="diffusion-v2-risk-card">
                      <div className="diffusion-v2-risk-card-head">
                        <label className="diffusion-v2-field diffusion-v2-field--grow">
                          <span>Risco</span>
                          <input
                            value={risk.risco}
                            disabled={active.fechado}
                            placeholder="Ex.: Desalinhamento entre áreas"
                            onChange={(e) => updateActiveRisk(risk.id, { risco: e.target.value })}
                          />
                        </label>
                        {!active.fechado && active.riscos.length > 1 ? (
                          <button
                            type="button"
                            className="diffusion-v2-risk-remove"
                            aria-label="Remover risco"
                            onClick={() => removeRisk(risk.id)}
                          >
                            <Trash2 size={14} aria-hidden />
                          </button>
                        ) : null}
                      </div>

                      <div className="diffusion-v2-risk-grid">
                        <label className="diffusion-v2-field">
                          <span>Impacto</span>
                          <select
                            value={risk.impacto || 'medio'}
                            disabled={active.fechado}
                            onChange={(e) =>
                              updateActiveRisk(risk.id, {
                                impacto: e.target.value as RiskImpact,
                              })
                            }
                          >
                            {IMPACTO_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="diffusion-v2-field">
                          <span>Probabilidade</span>
                          <select
                            value={risk.probabilidade || 'media'}
                            disabled={active.fechado}
                            onChange={(e) =>
                              updateActiveRisk(risk.id, {
                                probabilidade: e.target.value as RiskProbability,
                              })
                            }
                          >
                            {PROB_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="diffusion-v2-field">
                          <span>Status</span>
                          <select
                            value={risk.status || 'nao_iniciado'}
                            disabled={active.fechado}
                            onChange={(e) =>
                              updateActiveRisk(risk.id, {
                                status: e.target.value as RiskStatus,
                              })
                            }
                          >
                            {RISK_STATUS_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="diffusion-v2-risk-assignee">
                        <TeamMemberCombobox
                          label="Responsável"
                          value={risk.responsavel || ''}
                          disabled={active.fechado}
                          onChange={(responsavel) => updateActiveRisk(risk.id, { responsavel })}
                        />
                        <button
                          type="button"
                          className="diffusion-v2-remind-btn"
                          disabled={
                            active.fechado ||
                            !risk.responsavel?.trim() ||
                            remindingRiskId === risk.id ||
                            saving
                          }
                          onClick={() => void sendRiskReminder(risk)}
                          title="Enviar reminder por e-mail (texto gerado por IA)"
                        >
                          {remindingRiskId === risk.id ? (
                            <Loader2 size={14} className="spin" aria-hidden />
                          ) : (
                            <Mail size={14} aria-hidden />
                          )}
                          Reminder
                        </button>
                      </div>

                      <label className="diffusion-v2-field">
                        <span>Plano / ação a tomar</span>
                        <textarea
                          rows={3}
                          value={risk.acaoTomar}
                          disabled={active.fechado}
                          placeholder="Ex.: Checkpoint semanal"
                          onChange={(e) => updateActiveRisk(risk.id, { acaoTomar: e.target.value })}
                        />
                      </label>
                    </article>
                ))}
              </div>

              {!active.fechado ? (
                <div className="diffusion-v2-risks-actions">
                  {active.riscos.length < MAX_RISCOS ? (
                    <button
                      type="button"
                      className="diffusion-v2-add-link"
                      onClick={() => {
                        if (active.riscos.length === 0) {
                          setCanvases((prev) =>
                            prev.map((c) =>
                              c.id !== active.id ? c : { ...c, riscos: [emptyRisk()] }
                            )
                          );
                          return;
                        }
                        addRisk();
                      }}
                    >
                      <Plus size={14} aria-hidden />
                      Adicionar risco
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="diffusion-v2-next is-ghost"
                    disabled={saving || active.riscos.length === 0}
                    onClick={() => {
                      const latest = canvases.find((c) => c.id === active.id) ?? active;
                      void patchActive(
                        { riscos: latest.riscos },
                        {
                          riskAssign: true,
                          successMessage:
                            'Riscos salvos. Responsáveis novos serão notificados por e-mail.',
                        },
                      );
                    }}
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className="spin" aria-hidden /> Salvando…
                      </>
                    ) : (
                      <>
                        <Save size={16} aria-hidden /> Salvar riscos
                      </>
                    )}
                  </button>
                </div>
              ) : null}

              {emailHint && step === 3 ? (
                <p className="diffusion-v2-email-hint">{emailHint}</p>
              ) : null}

              <button type="button" className="diffusion-v2-next" onClick={() => setStep(4)}>
                Ir para Sign-off <ChevronRight size={16} aria-hidden />
              </button>
            </section>
          ) : null}

          {step === 4 ? (
            <section className="diffusion-v2-panel">
              <h3>Sign-off</h3>
              <p className="diffusion-v2-lead">
                Encerre a iniciativa quando a execução estiver concluída.
              </p>
              <button
                type="button"
                className="diffusion-v2-next"
                onClick={() => setDrawer('signoff')}
              >
                <CheckCircle2 size={16} aria-hidden />
                Abrir conclusão
              </button>
            </section>
          ) : null}
        </>
      ) : null}

      {drawer && active
        ? createPortal(
        <div
          className="diffusion-drawer-overlay"
          role="presentation"
          onClick={() => {
            if (!saving) closeDrawer();
          }}
        >
          <aside
            className={`diffusion-drawer${drawer === 'delivery' ? ' diffusion-drawer--execution' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="diffusion-drawer-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="diffusion-drawer-head">
              <div className="diffusion-drawer-head-copy">
                <p className="diffusion-drawer-eyebrow">
                  {drawer === 'delivery' && 'Execução'}
                  {drawer === 'signoff' && 'Sign-off'}
                </p>
                <h3 id="diffusion-drawer-title">
                  {drawer === 'delivery' && (delivery?.entrega || 'Execução da ação')}
                  {drawer === 'signoff' && 'Concluir iniciativa'}
                </h3>
              </div>
              <button
                type="button"
                className="diffusion-drawer-close"
                onClick={() => {
                  if (!saving) closeDrawer();
                }}
                aria-label="Fechar"
                disabled={saving}
              >
                <X size={18} />
              </button>
            </header>

            {drawer === 'delivery' && !delivery ? (
              <div className="diffusion-drawer-body">
                <p className="diffusion-v2-lead">Entrega não encontrada. Feche e abra novamente.</p>
              </div>
            ) : null}

            {drawer === 'delivery' && delivery ? (
              <>
                <div className="diffusion-drawer-body">
                  <div className="diffusion-v2-criteria diffusion-v2-criteria--drawer">
                    <div className="diffusion-v2-criteria-head">
                      <span>Critérios de sucesso</span>
                      <button
                        type="button"
                        className="diffusion-v2-criteria-suggest"
                        disabled={saving || suggestingCriteria || active.fechado}
                        onClick={() => void suggestCriteria()}
                      >
                        {suggestingCriteria ? (
                          <Loader2 size={14} className="spin" aria-hidden />
                        ) : (
                          <Sparkles size={14} aria-hidden />
                        )}
                        {suggestingCriteria ? 'Gerando…' : 'Sugerir critérios'}
                      </button>
                    </div>
                    <p className="diffusion-v2-criteria-hint">
                      Editáveis — alinhe o indicador desta entrega ao Design.
                    </p>
                    <div className="diffusion-v2-criteria-fields">
                      {normalizeCriteria(active.successCriteria).map((criterion, index) => (
                        <label key={`drawer-criterion-${index}`} className="diffusion-v2-field">
                          <span className="diffusion-v2-criteria-index">
                            Critério {index + 1} ·{' '}
                            {['Resultado', 'Adoção', 'Qualidade / sustentação'][index]}
                          </span>
                          <input
                            value={criterion}
                            placeholder={`Indicador observável ${index + 1}`}
                            onChange={(e) => {
                              const value = e.target.value;
                              setCanvases((prev) =>
                                prev.map((c) => {
                                  if (c.id !== active.id) return c;
                                  const next = normalizeCriteria(c.successCriteria);
                                  next[index] = value;
                                  return { ...c, successCriteria: next };
                                }),
                              );
                            }}
                            onBlur={(e) => {
                              const next = normalizeCriteria(active.successCriteria);
                              next[index] = e.target.value;
                              void patchActive({ successCriteria: next });
                            }}
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <label className="diffusion-v2-field diffusion-v2-delivery-title-field">
                    <span>Entrega</span>
                    <input
                      value={delivery.entrega}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCanvases((prev) =>
                          prev.map((c) =>
                            c.id !== active.id
                              ? c
                              : {
                                  ...c,
                                  entregas: c.entregas.map((d) =>
                                    d.id === delivery.id ? { ...d, entrega: value } : d
                                  ),
                                }
                          )
                        );
                      }}
                    />
                  </label>
                  <div className="diffusion-v2-sponsor-block">
                    <TeamMemberCombobox
                      label="Sponsor"
                      value={deliverySponsorValue(delivery, active.sponsor)}
                      showAddToTeam
                      restrictToMembers
                      compactWhenSelected
                      onChange={(sponsor) => {
                        setCanvases((prev) =>
                          prev.map((c) =>
                            c.id !== active.id
                              ? c
                              : {
                                  ...c,
                                  sponsor,
                                  entregas: c.entregas.map((d) =>
                                    d.id === delivery.id ? { ...d, responsavel: sponsor } : d
                                  ),
                                }
                          )
                        );
                      }}
                    />
                    <p className="diffusion-v2-field-hint">
                      O Sponsor acompanha a execução e recebe e-mail ao ser definido e a cada
                      atualização. Responsáveis das ações ficam no check-list.
                    </p>
                  </div>

                  <div className="diffusion-exec-meter-row">
                    <label className="diffusion-v2-field">
                      <span>Prazo geral da entrega</span>
                      <input
                        type="date"
                        value={delivery.prazo}
                        onChange={(e) => {
                          const prazo = e.target.value;
                          setCanvases((prev) =>
                            prev.map((c) =>
                              c.id !== active.id
                                ? c
                                : {
                                    ...c,
                                    entregas: c.entregas.map((d) => {
                                      if (d.id !== delivery.id) return d;
                                      const items = getDeliveryChecklistItems(d);
                                      return {
                                        ...d,
                                        prazo,
                                        status: items.some((i) => i.texto.trim())
                                          ? deriveDeliveryStatusFromChecklist(items, prazo)
                                          : d.status,
                                      };
                                    }),
                                  }
                            )
                          );
                        }}
                      />
                    </label>

                    <div
                      className={`diffusion-exec-meter is-${deliveryStatusKey}`}
                      role="status"
                      aria-label={`Progresso ${deliveryProgressPct} por cento, status ${deliveryStatusText}`}
                    >
                      <div className="diffusion-exec-meter__lede">
                        <p className="diffusion-exec-meter__title">{deliveryStatusText}</p>
                        <p className="diffusion-exec-meter__metric" aria-hidden="true">
                          <span className="diffusion-exec-meter__pct">{deliveryProgressPct}</span>
                          <span className="diffusion-exec-meter__unit">%</span>
                        </p>
                      </div>
                      <div
                        className="diffusion-exec-meter__track"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={deliveryProgressPct}
                        aria-valuetext={`${deliveryProgressPct} por cento · ${deliveryStatusText}`}
                      >
                        <div
                          className="diffusion-exec-meter__fill"
                          style={{ width: `${deliveryProgressPct}%` }}
                        />
                      </div>
                      <p className="diffusion-exec-meter__hint">
                        Calculado pelo progresso do check-list
                      </p>
                    </div>
                  </div>

                  <DeliveryChecklistEditor
                    items={deliveryChecklistItems}
                    disabled={active.fechado}
                    suggesting={suggestingActions}
                    remindingId={remindingChecklistId}
                    onChange={(items) => updateDeliveryChecklist(delivery.id, items)}
                    onSuggest={() => void suggestDeliveryActions(delivery.id)}
                    onRemind={(item) => void sendChecklistReminder(delivery.id, item)}
                  />

                  {emailHint ? (
                    <p className="diffusion-v2-email-hint">
                      <Mail size={14} aria-hidden /> {emailHint}
                    </p>
                  ) : null}
                </div>

                <footer className="diffusion-drawer-foot">
                  {drawerSaved ? (
                    <p className="diffusion-drawer-saved" role="status">
                      <CheckCircle2 size={16} aria-hidden />
                      Progresso salvo com sucesso
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="diffusion-v2-next"
                    disabled={saving}
                    onClick={async () => {
                      const latest = canvases.find((c) => c.id === active.id) ?? active;
                      const current =
                        latest.entregas.find((d) => d.id === delivery.id) ?? delivery;
                      let sponsor = deliverySponsorValue(current, latest.sponsor).trim();
                      if (sponsor.includes('@')) {
                        sponsor = await resolveEmailForMember(sponsor);
                      } else if (sponsor) {
                        await resolveEmailForMember(sponsor);
                      }
                      const entregas = latest.entregas.map((d) => {
                        if (d.id !== delivery.id) return d;
                        const items = getDeliveryChecklistItems(d);
                        return {
                          ...d,
                          responsavel: sponsor,
                          checklistItems: items,
                          status: items.some((i) => i.texto.trim())
                            ? deriveDeliveryStatusFromChecklist(items, d.prazo)
                            : d.status,
                        };
                      });
                      const ok = await patchActive(
                        { entregas, sponsor: sponsor || latest.sponsor },
                        {
                          deliveryId: delivery.id,
                          successMessage: 'Progresso salvo com sucesso.',
                        },
                      );
                      if (ok) {
                        window.setTimeout(() => closeDrawer(), 700);
                      }
                    }}
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className="spin" aria-hidden /> Salvando…
                      </>
                    ) : (
                      <>
                        <Save size={16} aria-hidden /> Salvar progresso
                      </>
                    )}
                  </button>
                </footer>
              </>
            ) : null}

            {drawer === 'signoff' ? (
              <>
                <div className="diffusion-drawer-body diffusion-drawer-body--signoff">
                  <div className="diffusion-signoff-card">
                    <p className="diffusion-signoff-label">Iniciativa</p>
                    <strong className="diffusion-signoff-name">
                      {active.nomeIniciativa || 'Sem nome'}
                    </strong>
                    <p className="diffusion-signoff-copy">
                      Revise rapidamente os principais itens antes de concluir. Após a conclusão,
                      esta iniciativa será encerrada e ficará disponível no Domínio para
                      acompanhamento dos resultados.
                    </p>
                    <ul className="diffusion-signoff-meta" aria-label="Resumo">
                      <li>
                        <span>Entregas</span>
                        <strong>{active.entregas?.length ?? 0}</strong>
                      </li>
                      <li>
                        <span>Riscos</span>
                        <strong>{active.riscos?.length ?? 0}</strong>
                      </li>
                      <li>
                        <span>Owner</span>
                        <strong>{active.owner || '—'}</strong>
                      </li>
                    </ul>
                  </div>
                  <p className="diffusion-signoff-hint">
                    <Sparkles size={14} aria-hidden />
                    Você pode reabrir depois se precisar ajustar.
                  </p>
                </div>
                <footer className="diffusion-drawer-foot diffusion-drawer-foot--signoff">
                  <button
                    type="button"
                    className="diffusion-v2-next"
                    disabled={saving}
                    onClick={async () => {
                      const ok = await patchActive(
                        { signOff: 'sim', fechado: true },
                        { successMessage: 'Iniciativa concluída com sucesso.' },
                      );
                      if (ok) closeDrawer();
                    }}
                  >
                    {saving ? (
                      <>
                        <Loader2 size={16} className="spin" aria-hidden /> Salvando…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} aria-hidden /> Concluir com sucesso
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="diffusion-v2-next is-ghost"
                    disabled={saving}
                    onClick={async () => {
                      const ok = await patchActive(
                        { signOff: 'nao', fechado: true },
                        { successMessage: 'Iniciativa encerrada.' },
                      );
                      if (ok) closeDrawer();
                    }}
                  >
                    Encerrar sem sucesso
                  </button>
                </footer>
              </>
            ) : null}
          </aside>
        </div>,
            document.body,
          )
        : null}
    </div>
  );
}
