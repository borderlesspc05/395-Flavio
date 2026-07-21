import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Loader2,
  Mail,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import { actionCanvasesApi, teamApi } from '../../services/api';
import { syncMagnusMemoryAfterCanvasChange } from '../../services/magnusMemorySync';
import { TeamMemberCombobox } from '../ui/TeamMemberCombobox';
import { ToastStack, type ToastItem } from '../ui/ToastStack';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import type {
  ActionCanvas,
  ActionCanvasDelivery,
  ActionCanvasRisk,
  ActionCanvasSignOff,
  DeliveryStatus,
} from '../../types';

const STEPS = [
  { id: 1, title: 'Mobilização', hint: 'Revise o que veio do Design' },
  { id: 2, title: 'Execução', hint: 'Checklist e responsáveis' },
  { id: 3, title: 'Riscos', hint: 'Antecipe e mitigue' },
  { id: 4, title: 'Sign-off', hint: 'Conclua a iniciativa' },
] as const;

type DrawerKind = 'delivery' | 'risk' | 'signoff' | null;

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
    entregas: Array.isArray(raw.entregas) ? (raw.entregas as ActionCanvasDelivery[]) : [],
    riscos: Array.isArray(raw.riscos) ? (raw.riscos as ActionCanvasRisk[]) : [],
    signOff: (raw.signOff as ActionCanvasSignOff) || 'pendente',
    fechado: Boolean(raw.fechado),
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}

function checklistText(delivery: ActionCanvasDelivery): string {
  return (delivery.checklist ?? []).join('\n');
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
  const [drawerRiskId, setDrawerRiskId] = useState<string | null>(null);
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const [drawerSaved, setDrawerSaved] = useState(false);

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
    setDrawerRiskId(null);
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
  }, [drawer, drawerDeliveryId, drawerRiskId]);

  const patchActive = async (
    patch: Partial<ActionCanvas>,
    opts?: { deliveryId?: string; successMessage?: string },
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
      if (opts?.deliveryId) {
        setEmailHint('Se o responsável for um e-mail da equipe, a plataforma enviará um aviso.');
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

  const openDelivery = (id: string) => {
    setDrawerDeliveryId(id);
    setDrawer('delivery');
  };

  const openRisk = (id: string) => {
    setDrawerRiskId(id);
    setDrawer('risk');
  };

  const delivery = active?.entregas.find((e) => e.id === drawerDeliveryId) ?? null;
  const risk = active?.riscos.find((r) => r.id === drawerRiskId) ?? null;

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
      <div className="diffusion-v2-toolbar">
        {saving ? (
          <span className="diffusion-v2-saving">
            <Loader2 size={14} className="spin" aria-hidden /> Salvando…
          </span>
        ) : null}
        {notice ? <span className="diffusion-v2-notice">{notice}</span> : null}
      </div>

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
                <span>Critérios de sucesso (Design)</span>
                {active.successCriteria?.filter(Boolean).length ? (
                  <ul>
                    {active.successCriteria.filter(Boolean).map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="diffusion-v2-criteria-empty">
                    Nenhum critério definido no Design para esta iniciativa.
                  </p>
                )}
              </div>
              <label className="diffusion-v2-field">
                <span>Notas de mobilização</span>
                <textarea
                  rows={4}
                  value={active.mobilizationNotes ?? ''}
                  placeholder="Kick-off, alinhamentos, dependências…"
                  onChange={(e) =>
                    setCanvases((prev) =>
                      prev.map((c) =>
                        c.id === active.id ? { ...c, mobilizationNotes: e.target.value } : c
                      )
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
                        {e.responsavel || 'Sem responsável'} · {e.prazo || 'Sem prazo'} · {e.status}
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
              <h3>Riscos</h3>
              <ul className="diffusion-v2-list">
                {active.riscos.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => openRisk(r.id)}>
                      <strong>{r.risco || 'Risco sem descrição'}</strong>
                      <span>{r.acaoTomar || 'Sem ação definida'}</span>
                    </button>
                  </li>
                ))}
              </ul>
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
            className="diffusion-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="diffusion-drawer-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="diffusion-drawer-head">
              <div className="diffusion-drawer-head-copy">
                <p className="diffusion-drawer-eyebrow">
                  {drawer === 'delivery' && 'Execução'}
                  {drawer === 'risk' && 'Riscos'}
                  {drawer === 'signoff' && 'Sign-off'}
                </p>
                <h3 id="diffusion-drawer-title">
                  {drawer === 'delivery' && (delivery?.entrega || 'Execução da ação')}
                  {drawer === 'risk' && (risk?.risco || 'Risco')}
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
                    <span>Critérios de sucesso</span>
                    {active.successCriteria?.filter(Boolean).length ? (
                      <ul>
                        {active.successCriteria.filter(Boolean).map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="diffusion-v2-criteria-empty">
                        Nenhum critério definido no Design para esta iniciativa.
                      </p>
                    )}
                  </div>

                  <label className="diffusion-v2-field">
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
                  <TeamMemberCombobox
                    label="Responsável"
                    value={delivery.responsavel}
                    onChange={(responsavel) => {
                      setCanvases((prev) =>
                        prev.map((c) =>
                          c.id !== active.id
                            ? c
                            : {
                                ...c,
                                entregas: c.entregas.map((d) =>
                                  d.id === delivery.id ? { ...d, responsavel } : d
                                ),
                              }
                        )
                      );
                    }}
                  />
                  <label className="diffusion-v2-field">
                    <span>Prazo</span>
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
                                  entregas: c.entregas.map((d) =>
                                    d.id === delivery.id ? { ...d, prazo } : d
                                  ),
                                }
                          )
                        );
                      }}
                    />
                  </label>
                  <label className="diffusion-v2-field">
                    <span>Status</span>
                    <select
                      value={delivery.status}
                      onChange={(e) => {
                        const status = e.target.value as DeliveryStatus;
                        setCanvases((prev) =>
                          prev.map((c) =>
                            c.id !== active.id
                              ? c
                              : {
                                  ...c,
                                  entregas: c.entregas.map((d) =>
                                    d.id === delivery.id ? { ...d, status } : d
                                  ),
                                }
                          )
                        );
                      }}
                    >
                      <option value="verde">No prazo</option>
                      <option value="amarelo">Atenção</option>
                      <option value="vermelho">Atrasado</option>
                    </select>
                  </label>
                  <label className="diffusion-v2-field">
                    <span>Checklist (uma linha por item)</span>
                    <textarea
                      rows={5}
                      value={checklistText(delivery)}
                      onChange={(e) => {
                        const checklist = e.target.value
                          .split('\n')
                          .map((l) => l.trim())
                          .filter(Boolean);
                        setCanvases((prev) =>
                          prev.map((c) =>
                            c.id !== active.id
                              ? c
                              : {
                                  ...c,
                                  entregas: c.entregas.map((d) =>
                                    d.id === delivery.id ? { ...d, checklist } : d
                                  ),
                                }
                          )
                        );
                      }}
                    />
                  </label>
                  <label className="diffusion-v2-field">
                    <span>Evidência</span>
                    <textarea
                      rows={3}
                      value={delivery.evidencia}
                      onChange={(e) => {
                        const evidencia = e.target.value;
                        setCanvases((prev) =>
                          prev.map((c) =>
                            c.id !== active.id
                              ? c
                              : {
                                  ...c,
                                  entregas: c.entregas.map((d) =>
                                    d.id === delivery.id ? { ...d, evidencia } : d
                                  ),
                                }
                          )
                        );
                      }}
                    />
                  </label>
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
                      Ação salva com sucesso
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="diffusion-v2-next"
                    disabled={saving}
                    onClick={async () => {
                      const resolved = await resolveEmailForMember(delivery.responsavel);
                      const latest = canvases.find((c) => c.id === active.id) ?? active;
                      const entregas = latest.entregas.map((d) =>
                        d.id === delivery.id
                          ? {
                              ...d,
                              responsavel: resolved.includes('@') ? resolved : d.responsavel,
                            }
                          : d
                      );
                      const ok = await patchActive(
                        { entregas },
                        {
                          deliveryId: delivery.id,
                          successMessage: 'Ação salva com sucesso.',
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
                        <Save size={16} aria-hidden /> Salvar ação
                      </>
                    )}
                  </button>
                </footer>
              </>
            ) : null}

            {drawer === 'risk' && risk ? (
              <>
                <div className="diffusion-drawer-body">
                  <label className="diffusion-v2-field">
                    <span>Risco</span>
                    <textarea
                      rows={3}
                      value={risk.risco}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCanvases((prev) =>
                          prev.map((c) =>
                            c.id !== active.id
                              ? c
                              : {
                                  ...c,
                                  riscos: c.riscos.map((r) =>
                                    r.id === risk.id ? { ...r, risco: value } : r
                                  ),
                                }
                          )
                        );
                      }}
                    />
                  </label>
                  <label className="diffusion-v2-field">
                    <span>Ação a tomar</span>
                    <textarea
                      rows={4}
                      value={risk.acaoTomar}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCanvases((prev) =>
                          prev.map((c) =>
                            c.id !== active.id
                              ? c
                              : {
                                  ...c,
                                  riscos: c.riscos.map((r) =>
                                    r.id === risk.id ? { ...r, acaoTomar: value } : r
                                  ),
                                }
                          )
                        );
                      }}
                    />
                  </label>
                </div>
                <footer className="diffusion-drawer-foot">
                  {drawerSaved ? (
                    <p className="diffusion-drawer-saved" role="status">
                      <CheckCircle2 size={16} aria-hidden />
                      Risco salvo com sucesso
                    </p>
                  ) : null}
                  <button
                    type="button"
                    className="diffusion-v2-next"
                    disabled={saving}
                    onClick={async () => {
                      const latest = canvases.find((c) => c.id === active.id) ?? active;
                      const ok = await patchActive(
                        { riscos: latest.riscos },
                        { successMessage: 'Risco salvo com sucesso.' },
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
                        <Save size={16} aria-hidden /> Salvar risco
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
                      Ao confirmar, a iniciativa é encerrada e enviada ao Domínio / Intelligence
                      Dashboard.
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
