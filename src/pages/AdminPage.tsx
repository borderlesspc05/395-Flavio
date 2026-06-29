import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import {
  Activity,
  ExternalLink,
  Globe,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Save,
  Settings,
  Users,
  MessageCircle,
  ClipboardList,
} from 'lucide-react';
import { AdminNotificationsBell } from '../components/admin/AdminNotificationsBell';
import { AdminSupportPanel } from '../components/admin/AdminSupportPanel';
import { AdminUsersPanel } from '../components/admin/AdminUsersPanel';
import { AdminInsightsPanel } from '../components/admin/AdminInsightsPanel';
import { AdminUserDetailDrawer } from '../components/admin/AdminUserDetailDrawer';
import { AdminRequestsPanel } from '../components/admin/AdminRequestsPanel';
import { AdminKpiStrip } from '../components/admin/AdminKpiStrip';
import { auth } from '../config/firebase';
import {
  adminApi,
  type AdminDashboard,
  type PlanSettingsMap,
} from '../services/adminApi';
import {
  readAdminSessionCache,
  writeAdminSessionCache,
} from '../services/adminSessionCache';
import type { PlanId } from '../constants/plans';
import type { AdminNotification } from '../types/adminNotifications';

type TabId = 'users' | 'requests' | 'insights' | 'settings' | 'support';

const PLAN_IDS: PlanId[] = ['starter', 'advanced', 'premium'];
const NOTIF_POLL_MS = 20000;
const DASHBOARD_CACHE_KEY = 'dashboard';

export function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabId>('requests');
  const [data, setData] = useState<AdminDashboard | null>(
    () => readAdminSessionCache<AdminDashboard>(DASHBOARD_CACHE_KEY)
  );
  const [planDraft, setPlanDraft] = useState<PlanSettingsMap | null>(
    () => readAdminSessionCache<AdminDashboard>(DASHBOARD_CACHE_KEY)?.planSettings ?? null
  );
  const [loading, setLoading] = useState(!data);
  const [refreshing, setRefreshing] = useState(false);
  const [logsRefreshToken, setLogsRefreshToken] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadSupportCount, setUnreadSupportCount] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string | undefined>();

  const loadNotifications = useCallback(async () => {
    try {
      const payload = await adminApi.getNotifications();
      setNotifications(payload.notifications);
      setUnreadSupportCount(payload.unreadSupportCount);
    } catch {
      /* polling silencioso */
    }
  }, []);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    if (opts?.silent) setRefreshing(true);
    setError('');
    try {
      const dashboard = await adminApi.getDashboard();
      setData(dashboard);
      setPlanDraft(dashboard.planSettings);
      writeAdminSessionCache(DASHBOARD_CACHE_KEY, dashboard);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? String((err as { response?: { data?: { error?: string; message?: string } } }).response?.data?.error ||
              (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
              '')
          : '';
      if (msg.toLowerCase().includes('admin') || msg.toLowerCase().includes('unauthorized')) {
        setError('Acesso negado. Verifique se seu e-mail está em ADMIN_EMAILS.');
      } else if (msg) {
        setError(`Não foi possível carregar o painel: ${msg}`);
      } else {
        setError('Não foi possível carregar dados do painel. Verifique se a API está no ar.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const hadCache = Boolean(readAdminSessionCache<AdminDashboard>(DASHBOARD_CACHE_KEY));
    void load({ silent: hadCache });
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

  const openUserDetail = (userId: string, userName?: string) => {
    if (!userId || userId === 'demo-user') return;
    setSelectedUserId(userId);
    setSelectedUserName(userName);
  };

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
            className={tab === 'insights' ? 'is-active' : ''}
            onClick={() => setTab('insights')}
          >
            <ClipboardList size={18} />
            Diagnósticos
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
          <p className="admin-sidebar-foot-label">Atalhos</p>
          <div className="admin-sidebar-shortcuts">
            <Link to="/" className="admin-sidebar-shortcut" title="Abrir landing pública">
              <span className="admin-sidebar-shortcut-icon" aria-hidden>
                <Globe size={16} strokeWidth={2} />
              </span>
              <span className="admin-sidebar-shortcut-text">
                <strong>Landing</strong>
                <small>Página pública</small>
              </span>
              <ExternalLink size={13} className="admin-sidebar-shortcut-arrow" aria-hidden />
            </Link>
            <Link to="/escolher-projeto" className="admin-sidebar-shortcut" title="Abrir aplicativo">
              <span className="admin-sidebar-shortcut-icon" aria-hidden>
                <LayoutDashboard size={16} strokeWidth={2} />
              </span>
              <span className="admin-sidebar-shortcut-text">
                <strong>App</strong>
                <small>Área logada</small>
              </span>
              <ExternalLink size={13} className="admin-sidebar-shortcut-arrow" aria-hidden />
            </Link>
          </div>
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
              {tab === 'insights' && 'Diagnósticos & clientes'}
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
                setLogsRefreshToken((n) => n + 1);
                void load({ silent: Boolean(data) });
                void loadNotifications();
              }}
              disabled={loading && !data}
            >
              <RefreshCw size={16} className={loading || refreshing ? 'admin-spin' : ''} />
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
          <div className={`admin-content ${refreshing ? 'is-refreshing' : ''}`}>
            <div className={`admin-tab-panel ${tab === 'requests' ? 'is-active' : ''}`}>
              <AdminKpiStrip tab="requests" summary={data.summary} />
              <AdminRequestsPanel
                charts={{
                  requestsByDay: data.requestsByDay,
                  requestsByType: data.requestsByType,
                  requestsBySubject: data.requestsBySubject,
                  requestHealth: data.requestHealth,
                }}
                onSelectUser={openUserDetail}
                refreshToken={logsRefreshToken}
              />
            </div>

            <div className={`admin-tab-panel ${tab === 'insights' ? 'is-active' : ''}`}>
              <AdminKpiStrip tab="insights" summary={data.summary} />
              <AdminInsightsPanel
                analytics={data.clientAnalytics}
                onSelectUser={openUserDetail}
              />
            </div>

            <div className={`admin-tab-panel ${tab === 'users' ? 'is-active' : ''}`}>
              <AdminKpiStrip tab="users" summary={data.summary} />
              <AdminUsersPanel
                users={data.users}
                onRefresh={() => void load({ silent: true })}
                onSelectUser={openUserDetail}
              />
            </div>

            <div className={`admin-tab-panel ${tab === 'support' ? 'is-active' : ''}`}>
              <AdminSupportPanel />
            </div>

            <div className={`admin-tab-panel ${tab === 'settings' ? 'is-active' : ''}`}>
              {planDraft ? (
                <section className="admin-card admin-card--settings">
                  <header className="admin-card-head">
                    <h2>Alterar valores dos planos</h2>
                    <p>Preços na landing, projetos ativos e operações de IA por plano</p>
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
                            Projetos ativos (vazio = ilimitado)
                            <input
                              type="text"
                              placeholder="1, 3 ou deixe vazio"
                              value={
                                planDraft[planId].maxOpenCycles === null
                                  ? ''
                                  : String(planDraft[planId].maxOpenCycles)
                              }
                              onChange={(e) => {
                                const raw = e.target.value.trim();
                                updatePlanField(
                                  planId,
                                  'maxOpenCycles',
                                  raw === '' ? null : Number(raw)
                                );
                              }}
                            />
                          </label>
                          <label>
                            Operações IA em paralelo (vazio = ilimitado)
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
              ) : null}
            </div>
          </div>
        ) : null}
      </main>

      <AdminUserDetailDrawer
        userId={selectedUserId}
        userName={selectedUserName}
        onClose={() => {
          setSelectedUserId(null);
          setSelectedUserName(undefined);
        }}
      />
    </div>
  );
}
