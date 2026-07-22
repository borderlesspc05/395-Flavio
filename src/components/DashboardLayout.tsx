import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Bot,
  Target,
  Users,
  BarChart3,
  History,
  LogOut,
  Menu,
  UserCircle,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  Lock,
  CheckCircle2,
  RotateCcw,
  Circle,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useLocale } from '../context/LocaleContext';
import { useCycle } from '../context/CycleContext';
import { CycleSelector } from './CycleSelector';
import { SupportChatWidget } from './SupportChatWidget';
import { UserAvatar } from './UserAvatar';
import { useAuthProfile } from '../hooks/useAuthProfile';
import { clearWorkspaceEntered } from '../services/projectWorkspace';
import { AnimatedOutlet } from './navigation/AnimatedOutlet';
import { useViewTransitionNavigate } from '../hooks/useViewTransitionNavigate';
import {
  createInitialSprintProgress,
  getPhaseAccess,
  getSprintProgressFromCycle,
  isPathAllowedForProgress,
  PHASE_LABELS,
  PHASE_PATHS,
  type NavSprintPhase,
  type PhaseAccess,
  type SprintPhase,
  type SprintProgressState,
} from '../services/phaseLock';

const SIDEBAR_COLLAPSE_STORAGE_KEY = 'mm.sidebar.collapsed';

const NAV_PHASE_BY_ID: Partial<Record<string, SprintPhase>> = {
  formulario: 'diagnostic',
  consultoria: 'design',
  objetivos: 'diffusion',
  relatorios: 'domain',
  historico: 'loopClosed',
};

function accessTitle(label: string, access: PhaseAccess | null): string {
  if (!access) return label;
  if (access === 'completed') return `${label} · concluída (somente leitura)`;
  if (access === 'locked') return `${label} · bloqueada — conclua a fase atual primeiro`;
  if (access === 'reopened') return `${label} · reaberta`;
  return `${label} · fase atual`;
}

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useViewTransitionNavigate();
  const { t } = useLocale();
  const { activeCycle, refreshCycles } = useCycle();
  const { photoURL, initials } = useAuthProfile();
  const mainRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [progress, setProgress] = useState<SprintProgressState>(() =>
    getSprintProgressFromCycle(activeCycle),
  );
  const [navNotice, setNavNotice] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === '1';
  });
  const isDesignPage = location.pathname === '/dashboard/design';

  const isDiagnosticRoute =
    location.pathname.startsWith('/dashboard/scans') ||
    location.pathname === '/dashboard/initial-form' ||
    location.pathname === '/dashboard/solution-pick';

  const navItems = useMemo(
    () => [
      { id: 'dashboard', label: t.nav.hub, icon: LayoutDashboard, path: '/dashboard/inicio' },
      { id: 'formulario', label: t.nav.diagnostic, icon: FileText, path: '/dashboard/scans' },
      { id: 'consultoria', label: t.nav.design, icon: Bot, path: '/dashboard/design' },
      { id: 'objetivos', label: t.nav.diffusion, icon: Target, path: '/dashboard/objetivos' },
      { id: 'relatorios', label: t.nav.domain, icon: BarChart3, path: '/dashboard/relatorios' },
      { id: 'historico', label: t.nav.loop, icon: History, path: '/dashboard/historico' },
      { id: 'equipe', label: t.nav.team, icon: Users, path: '/dashboard/minha-equipe' },
      { id: 'conta', label: t.nav.account, icon: UserCircle, path: '/dashboard/conta' },
    ],
    [t.nav],
  );

  useEffect(() => {
    if (!activeCycle?.id) {
      setProgress(createInitialSprintProgress());
      return;
    }
    setProgress(getSprintProgressFromCycle(activeCycle));
  }, [
    activeCycle?.id,
    activeCycle?.sprintProgress,
    activeCycle?.phaseLocks,
    activeCycle?.reopenedPhase,
    activeCycle?.phaseEvents?.length,
    location.pathname,
  ]);

  useEffect(() => {
    const onLocksChanged = (event: Event) => {
      const detail = (
        event as CustomEvent<{ cycleId?: string; progress?: SprintProgressState }>
      ).detail;
      if (detail?.cycleId && activeCycle?.id && detail.cycleId !== activeCycle.id) return;
      if (detail?.progress) {
        setProgress(detail.progress);
      } else {
        setProgress(getSprintProgressFromCycle(activeCycle));
      }
      void refreshCycles?.();
    };
    window.addEventListener('mm:phase-locks-changed', onLocksChanged);
    return () => window.removeEventListener('mm:phase-locks-changed', onLocksChanged);
  }, [activeCycle, refreshCycles]);

  // Guarda de rota: fases futuras por URL → redirect
  useEffect(() => {
    if (!activeCycle?.id) return;
    const state = getSprintProgressFromCycle(activeCycle);
    if (isPathAllowedForProgress(location.pathname, state.sprintProgress, state.reopenedPhase)) {
      return;
    }
    const target = PHASE_PATHS[state.sprintProgress];
    const label = PHASE_LABELS[state.sprintProgress];
    setNavNotice(`Conclua ${label} para liberar esta etapa.`);
    navigate(target, { replace: true });
  }, [activeCycle, location.pathname, navigate]);

  useEffect(() => {
    if (!navNotice) return;
    const timer = window.setTimeout(() => setNavNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [navNotice]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncForViewport = () => {
      if (window.innerWidth < 769) {
        setSidebarCollapsed(false);
      }
    };
    syncForViewport();
    window.addEventListener('resize', syncForViewport);
    return () => window.removeEventListener('resize', syncForViewport);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const lockScroll = sidebarOpen && window.innerWidth < 769;
    if (!lockScroll) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  const isScansRoute =
    location.pathname.startsWith('/dashboard/scans') ||
    location.pathname === '/dashboard/solution-pick';

  const pageTitle =
    navItems.find(
      (item) =>
        location.pathname === item.path ||
        (item.id === 'dashboard' && location.pathname === '/dashboard/inicio') ||
        (item.id === 'formulario' && isDiagnosticRoute) ||
        (item.id === 'equipe' && location.pathname === '/dashboard/minha-equipe'),
    )?.label ?? 'Sprint';

  const handleNav = (id: string, path: string, label: string) => {
    const phase = NAV_PHASE_BY_ID[id];
    if (phase) {
      const access = getPhaseAccess(progress, phase);
      if (access === 'locked') {
        const currentLabel = PHASE_LABELS[progress.sprintProgress as NavSprintPhase];
        setNavNotice(`Conclua ${currentLabel} para liberar ${label}.`);
        setSidebarOpen(false);
        return;
      }
      if (access === 'completed') {
        setNavNotice(`${label} já foi finalizada. Você pode visualizar ou reabrir a etapa.`);
      }
    }
    navigate(path);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    clearWorkspaceEntered();
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <a href="#main-content" className="mm-skip-link">
        {t.nav.skipToContent}
      </a>
      <div className="dashboard-body">
        {sidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
            onKeyDown={(e) => e.key === 'Escape' && setSidebarOpen(false)}
            role="presentation"
          />
        )}
        <aside
          ref={sidebarRef}
          className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}
          aria-label="Navegação principal"
          onClick={(event) => {
            const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 769;
            if (!isDesktop || !sidebarCollapsed) return;
            const target = event.target as HTMLElement;
            if (target.closest('button')) return;
            setSidebarCollapsed(false);
          }}
        >
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <img src="/icone-magnusmind.svg" alt="" className="sidebar-logo" aria-hidden />
              <p className="logo-text">Sprint</p>
            </div>
            <button
              type="button"
              className="sidebar-collapse-toggle"
              onClick={() => setSidebarCollapsed((value) => !value)}
              aria-label={sidebarCollapsed ? t.nav.expandSidebar : t.nav.collapseSidebar}
              aria-expanded={!sidebarCollapsed}
              title={sidebarCollapsed ? t.nav.expandSidebar : t.nav.collapseSidebar}
            >
              {sidebarCollapsed ? (
                <ChevronRight size={16} aria-hidden />
              ) : (
                <ChevronLeft size={16} aria-hidden />
              )}
            </button>
          </div>
          <nav className="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                location.pathname === item.path ||
                (item.id === 'dashboard' && location.pathname === '/dashboard/inicio') ||
                (item.id === 'formulario' && isDiagnosticRoute) ||
                (item.id === 'equipe' && location.pathname === '/dashboard/minha-equipe');
              const phase = NAV_PHASE_BY_ID[item.id];
              const access = phase ? getPhaseAccess(progress, phase) : null;
              const title = accessTitle(item.label, access);
              const stateClass =
                access === 'completed'
                  ? 'is-phase-completed'
                  : access === 'locked'
                    ? 'is-phase-future-locked'
                    : access === 'reopened'
                      ? 'is-phase-reopened'
                      : access === 'current'
                        ? 'is-phase-current'
                        : '';
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-item ${active ? 'active' : ''} ${stateClass}`}
                  onClick={() => handleNav(item.id, item.path, item.label)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={title}
                  aria-disabled={access === 'locked' ? true : undefined}
                  title={sidebarCollapsed || access ? title : undefined}
                >
                  {item.id === 'conta' && photoURL ? (
                    <UserAvatar
                      photoURL={photoURL}
                      initials={initials}
                      size="sm"
                      className="nav-avatar"
                      alt={item.label}
                    />
                  ) : (
                    <Icon className="nav-icon" size={20} aria-hidden />
                  )}
                  <span className="nav-label">{item.label}</span>
                  {access === 'completed' ? (
                    <CheckCircle2 className="nav-phase-icon" size={14} aria-hidden />
                  ) : access === 'locked' ? (
                    <Lock className="nav-phase-icon" size={14} aria-hidden />
                  ) : access === 'reopened' ? (
                    <RotateCcw className="nav-phase-icon" size={14} aria-hidden />
                  ) : access === 'current' ? (
                    <Circle className="nav-phase-icon is-current-dot" size={10} aria-hidden />
                  ) : null}
                </button>
              );
            })}
            <button
              type="button"
              className="nav-item"
              onClick={() => {
                navigate('/escolher-projeto', { state: { fromDashboard: true } });
                setSidebarOpen(false);
              }}
              aria-label={t.nav.projects}
              title={sidebarCollapsed ? t.nav.projects : undefined}
            >
              <FolderKanban className="nav-icon" size={20} aria-hidden />
              <span className="nav-label">{t.nav.projects}</span>
            </button>
            <button
              type="button"
              className="nav-item nav-item-logout"
              onClick={handleLogout}
              aria-label={t.nav.logout}
              title={sidebarCollapsed ? t.nav.logout : undefined}
            >
              <LogOut className="nav-icon" size={20} aria-hidden />
              <span className="nav-label">{t.nav.logout}</span>
            </button>
          </nav>
        </aside>
        <div
          className={`dashboard-main-wrapper ${isDesignPage ? 'design-page-active' : ''}`}
        >
          <header className="dashboard-header">
            <div className="dashboard-header__row dashboard-header__row--primary">
              <button
                type="button"
                className="menu-toggle"
                onClick={() => {
                  setSidebarOpen(true);
                  setSidebarCollapsed(false);
                }}
                aria-label={t.nav.openMenu}
                aria-expanded={sidebarOpen}
              >
                <Menu size={22} aria-hidden />
              </button>
              <p className="dashboard-header__title">{pageTitle}</p>
            </div>
            <div className="dashboard-header__row dashboard-header__row--secondary">
              <CycleSelector />
            </div>
            {navNotice ? (
              <p className="dashboard-phase-notice" role="status">
                {navNotice}
              </p>
            ) : null}
          </header>
          <main
            ref={mainRef}
            id="main-content"
            tabIndex={-1}
            className={`dashboard-main ${isDesignPage ? 'design-page-active' : ''}`}
          >
            {isScansRoute ? (
              <div className="scans-premium-shell">
                <div className="premium-stage">
                  <div className="premium-stage__pattern" aria-hidden />
                  <div className="premium-stage__accent" aria-hidden />
                  <div className="premium-stage__body">
                    <AnimatedOutlet scope="full" variant="page" />
                  </div>
                </div>
              </div>
            ) : (
              <AnimatedOutlet scope="full" variant="page" />
            )}
          </main>
        </div>
      </div>
      <SupportChatWidget />
    </div>
  );
}
