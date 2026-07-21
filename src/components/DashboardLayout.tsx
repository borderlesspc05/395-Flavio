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
  createEmptyPhaseLocks,
  getPhaseLocksFromCycle,
  isPhaseLocked,
  type PhaseLocks,
  type SprintPhase,
} from '../services/phaseLock';

const SIDEBAR_COLLAPSE_STORAGE_KEY = 'mm.sidebar.collapsed';

const NAV_PHASE_BY_ID: Partial<Record<string, SprintPhase | SprintPhase[]>> = {
  formulario: 'diagnostic',
  consultoria: 'design',
  objetivos: 'diffusion',
  relatorios: 'domain',
  historico: 'loopClosed',
};

function navItemIsLocked(itemId: string, locks: PhaseLocks): boolean {
  const phase = NAV_PHASE_BY_ID[itemId];
  if (!phase) return false;
  if (Array.isArray(phase)) return phase.some((p) => isPhaseLocked(locks, p));
  return isPhaseLocked(locks, phase);
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
  const [phaseLocks, setPhaseLocks] = useState<PhaseLocks>(() =>
    getPhaseLocksFromCycle(activeCycle),
  );
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
      setPhaseLocks(createEmptyPhaseLocks());
      return;
    }
    const next = getPhaseLocksFromCycle(activeCycle);
    setPhaseLocks(next);
  }, [activeCycle?.id, activeCycle?.phaseLocks, location.pathname]);

  useEffect(() => {
    const onLocksChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ cycleId?: string; locks?: PhaseLocks }>).detail;
      if (detail?.cycleId && activeCycle?.id && detail.cycleId !== activeCycle.id) return;
      if (detail?.locks) {
        setPhaseLocks(detail.locks);
      } else {
        setPhaseLocks(getPhaseLocksFromCycle(activeCycle));
      }
      void refreshCycles?.();
    };
    window.addEventListener('mm:phase-locks-changed', onLocksChanged);
    return () => window.removeEventListener('mm:phase-locks-changed', onLocksChanged);
  }, [activeCycle, refreshCycles]);

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
        (item.id === 'equipe' && location.pathname === '/dashboard/minha-equipe')
    )?.label ?? 'Sprint';

  const handleNav = (_id: string, path: string) => {
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
              const locked = navItemIsLocked(item.id, phaseLocks);
              const lockTitle = locked
                ? `${item.label} · concluído (somente visualização)`
                : item.label;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-item ${active ? 'active' : ''} ${locked ? 'is-phase-locked' : ''}`}
                  onClick={() => handleNav(item.id, item.path)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={lockTitle}
                  title={sidebarCollapsed || locked ? lockTitle : undefined}
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
                  {locked ? (
                    <Lock className="nav-lock-icon" size={14} aria-hidden />
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
