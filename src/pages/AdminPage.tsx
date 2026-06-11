import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import {
  Activity,
  LogOut,
  RefreshCw,
  Save,
  Settings,
  Users,
  BarChart3,
  Sparkles,
  Layers,
  MessageCircle,
} from 'lucide-react';
import { AdminNotificationsBell } from '../components/admin/AdminNotificationsBell';
import { AdminSupportPanel } from '../components/admin/AdminSupportPanel';
import { AdminUsersPanel } from '../components/admin/AdminUsersPanel';
import { auth } from '../config/firebase';
import {
  adminApi,
  type AdminDashboard,
  type PlanSettingsMap,
} from '../services/adminApi';
import type { PlanId } from '../constants/plans';
import type { AdminNotification } from '../types/adminNotifications';
import { AdminBarChart } from '../components/admin/AdminBarChart';
import { AdminDonutChart } from '../components/admin/AdminDonutChart';

type TabId = 'users' | 'requests' | 'settings' | 'support';

const PLAN_IDS: PlanId[] = ['starter', 'advanced', 'premium'];
const NOTIF_POLL_MS = 20000;

export function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>('requests');
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [planDraft, setPlanDraft] = useState<PlanSettingsMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadSupportCount, setUnreadSupportCount] = useState(0);

  const loadNotifications = useCallback(async () => {
    try {
      const payload = await adminApi.getNotifications();
      setNotifications(payload.notifications);
      setUnreadSupportCount(payload.unreadSupportCount);
    } catch {
      /* polling silencioso */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const dashboard = await adminApi.getDashboard();
      setData(dashboard);
      setPlanDraft(dashboard.planSettings);
    } catch {
      setError('Não foi possível carregar dados do painel. Verifique se a API está no ar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadNotifications();
    const id = window.setInterval(() => void loadNotifications(), NOTIF_POLL_MS);
    return () => window.clearInterval(id);
  }, [loadNotifications]);

  useEffect(() => {
    if (tab !== 'support') return;
    setUnreadSupportCount(0);
    void adminApi.markAllSupportRead();
  }, [tab]);

  const goToTab = (next: TabId) => setTab(next);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/admin/login');
  };

  const handleSavePlans = async (e: FormEvent) => {
    e.preventDefault();
    if (!planDraft) return;
    setSaving(true);
    setError('');
    try {
      const saved = await adminApi.updatePlanSettings(planDraft);
      setPlanDraft(saved);
      setData((prev) => (prev ? { ...prev, planSettings: saved } : prev));
    } catch {
      setError('Falha ao salvar configurações dos planos.');
    } finally {
      setSaving(false);
    }
  };

  const updatePlanField = (
    planId: PlanId,
    field: keyof PlanSettingsMap[PlanId],
    value: string | number | null
  ) => {
    setPlanDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [planId]: { ...prev[planId], [field]: value },
      };
    });
  };

  const typeChartItems =
    data?.requestsByType.map((t) => ({ label: t.label, count: t.count })) ?? [];
  const subjectChartItems =
    data?.requestsBySubject.map((s) => ({ label: s.subject, count: s.count })) ?? [];

  return (
    <div className="admin-shell">
      <div className="admin-shell-bg" aria-hidden>
        <div className="admin-shell-glow admin-shell-glow--1" />
        <div className="admin-shell-glow admin-shell-glow--2" />
        <div className="admin-shell-grain" />
      </div>

      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark">MM</span>
          <div>
            <strong>Magnus Mind</strong>
            <span>Console admin</span>
          </div>
        </div>

        <nav className="admin-nav" aria-label="Seções">
          <button
            type="button"
            className={tab === 'requests' ? 'is-active' : ''}
            onClick={() => setTab('requests')}
          >
            <Activity size={18} />
            Requisições
          </button>
          <button
            type="button"
            className={tab === 'users' ? 'is-active' : ''}
            onClick={() => setTab('users')}
          >
            <Users size={18} />
            Usuários
          </button>
          <button
            type="button"
            className={tab === 'settings' ? 'is-active' : ''}
            onClick={() => setTab('settings')}
          >
            <Settings size={18} />
            Planos
          </button>
          <button
            type="button"
            className={`admin-nav-item ${tab === 'support' ? 'is-active' : ''}`}
            onClick={() => setTab('support')}
          >
            <MessageCircle size={18} />
            <span>Suporte</span>
            {unreadSupportCount > 0 && tab !== 'support' && (
              <span className="admin-nav-dot" aria-label="Mensagens não lidas" />
            )}
          </button>
        </nav>

        <div className="admin-sidebar-foot">
          <Link to="/">Landing</Link>
          <Link to="/dashboard">App</Link>
          <button type="button" className="admin-sidebar-logout" onClick={() => void handleLogout()}>
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="admin-eyebrow">Operações</p>
            <h1>
              {tab === 'requests' && 'Requisições & uso'}
              {tab === 'users' && 'Cadastros'}
              {tab === 'settings' && 'Valores dos planos'}
              {tab === 'support' && 'Suporte ao usuário'}
            </h1>
          </div>
          <div className="admin-topbar-actions">
            <AdminNotificationsBell notifications={notifications} onNavigate={goToTab} />
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={() => {
                void load();
                void loadNotifications();
              }}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'admin-spin' : ''} />
              Atualizar
            </button>
          </div>
        </header>

        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}

        {loading && !data ? (
          <div className="admin-skeleton-grid" aria-busy="true">
            <div className="admin-skeleton admin-skeleton--wide" />
            <div className="admin-skeleton" />
            <div className="admin-skeleton" />
          </div>
        ) : data ? (
          <>
            <section className="admin-kpi-row admin-reveal">
              <article className="admin-kpi">
                <Users size={18} />
                <div>
                  <strong>{data.summary.totalUsers}</strong>
                  <span>Usuários</span>
                </div>
              </article>
              <article className="admin-kpi">
                <Activity size={18} />
                <div>
                  <strong>{data.summary.totalRequests}</strong>
                  <span>Requisições</span>
                </div>
              </article>
              <article className="admin-kpi admin-kpi--highlight">
                <Sparkles size={18} />
                <div>
                  <strong className="admin-kpi-text">{data.summary.topRequestTypeLabel}</strong>
                  <span>Tipo mais usado</span>
                </div>
              </article>
              <article className="admin-kpi admin-kpi--highlight">
                <Layers size={18} />
                <div>
                  <strong className="admin-kpi-text">{data.summary.topSubjectLabel}</strong>
                  <span>Assunto principal</span>
                </div>
              </article>
              <article className="admin-kpi">
                <BarChart3 size={18} />
                <div>
                  <strong>{data.summary.activeSubscriptions}</strong>
                  <span>Assinaturas ativas</span>
                </div>
              </article>
            </section>

            {tab === 'requests' && (
              <div className="admin-reveal admin-reveal--delay">
                <section className="admin-charts-grid">
                  <AdminBarChart
                    title="Tipos de requisição"
                    subtitle="O que os usuários mais chamam na API"
                    items={typeChartItems}
                    accent="bronze"
                  />
                  <AdminBarChart
                    title="Assuntos (módulos Magnus)"
                    subtitle="Área do produto mais utilizada"
                    items={subjectChartItems}
                    accent="warm"
                  />
                  <AdminDonutChart
                    title="Mix de assuntos"
                    segments={subjectChartItems}
                  />
                </section>

                <section className="admin-card admin-card--table">
                  <header className="admin-card-head">
                    <h2>Últimas requisições</h2>
                    <p>Data, usuário e tipo — somente o essencial</p>
                  </header>
                  <div className="admin-table-wrap">
                    <table className="admin-table admin-table--requests">
                      <thead>
                        <tr>
                          <th>Data</th>
                          <th>Usuário</th>
                          <th>Tipo de requisição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentRequests.length === 0 ? (
                          <tr>
                            <td colSpan={3}>Nenhuma requisição registrada ainda.</td>
                          </tr>
                        ) : (
                          data.recentRequests.map((r) => (
                            <tr key={r.id}>
                              <td className="admin-cell-date">
                                {new Date(r.createdAt).toLocaleString('pt-BR', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td>
                                <span className="admin-user-name">{r.userName}</span>
                              </td>
                              <td>
                                <span className="admin-type-pill">{r.typeLabel}</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            {tab === 'users' && (
              <AdminUsersPanel users={data.users} onRefresh={() => void load()} />
            )}

            {tab === 'support' && <AdminSupportPanel />}

            {tab === 'settings' && planDraft && (
              <section className="admin-card admin-reveal">
                <header className="admin-card-head">
                  <h2>Alterar valores dos planos</h2>
                  <p>Preços na landing e limites de requisições simultâneas na API</p>
                </header>
                <form className="admin-settings-form" onSubmit={(e) => void handleSavePlans(e)}>
                  <div className="admin-plan-grid">
                    {PLAN_IDS.map((planId) => (
                      <fieldset key={planId} className="admin-plan-fieldset">
                        <legend>{planDraft[planId].name}</legend>
                        <label>
                          Nome exibido
                          <input
                            type="text"
                            value={planDraft[planId].name}
                            onChange={(e) => updatePlanField(planId, 'name', e.target.value)}
                          />
                        </label>
                        <label>
                          Preço (texto)
                          <input
                            type="text"
                            value={planDraft[planId].priceLabel}
                            onChange={(e) => updatePlanField(planId, 'priceLabel', e.target.value)}
                          />
                        </label>
                        <label>
                          Preço (centavos)
                          <input
                            type="number"
                            min={0}
                            value={planDraft[planId].priceCents}
                            onChange={(e) =>
                              updatePlanField(planId, 'priceCents', Number(e.target.value))
                            }
                          />
                        </label>
                        <label>
                          Requisições simultâneas (vazio = ilimitado)
                          <input
                            type="text"
                            placeholder="1, 3 ou deixe vazio"
                            value={
                              planDraft[planId].concurrencyLimit === null
                                ? ''
                                : String(planDraft[planId].concurrencyLimit)
                            }
                            onChange={(e) => {
                              const raw = e.target.value.trim();
                              updatePlanField(
                                planId,
                                'concurrencyLimit',
                                raw === '' ? null : Number(raw)
                              );
                            }}
                          />
                        </label>
                      </fieldset>
                    ))}
                  </div>
                  <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
                    <Save size={16} />
                    {saving ? 'Salvando…' : 'Salvar alterações'}
                  </button>
                </form>
              </section>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
}
