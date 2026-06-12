import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  Layers,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useLocale } from '../context/LocaleContext';
import { CycleSelector } from './CycleSelector';
import { SupportChatWidget } from './SupportChatWidget';
import { clearWorkspaceEntered } from '../services/projectWorkspace';

const SIDEBAR_COLLAPSE_STORAGE_KEY = 'mm.sidebar.collapsed';

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLocale();
  const mainRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === '1';
  });
  const isEquipeConsultoria =
    location.pathname === '/dashboard/minha-equipe' &&
    new URLSearchParams(location.search).get('tab') === 'consultoria';
  const isConsultoriaChat = isEquipeConsultoria || location.pathname === '/dashboard/consultoria-ia';
  const isDesignPage = location.pathname === '/dashboard/design';

  const navItems = [
    { id: 'dashboard', label: t.nav.hub, icon: LayoutDashboard, path: '/dashboard/inicio' },
    { id: 'ciclos', label: 'Projetos', icon: Layers, path: '/escolher-projeto' },
    { id: 'formulario', label: t.nav.diagnostic, icon: FileText, path: '/dashboard/initial-form' },
    { id: 'consultoria', label: t.nav.design, icon: Bot, path: '/dashboard/design' },
    { id: 'objetivos', label: t.nav.diffusion, icon: Target, path: '/dashboard/objetivos' },
    { id: 'relatorios', label: t.nav.domain, icon: BarChart3, path: '/dashboard/relatorios' },
    { id: 'equipe', label: t.nav.team, icon: Users, path: '/dashboard/minha-equipe' },
    { id: 'historico', label: t.nav.loop, icon: History, path: '/dashboard/historico' },
    { id: 'conta', label: t.nav.account, icon: UserCircle, path: '/dashboard/conta' },
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SIDEBAR_COLLAPSE_STORAGE_KEY, sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  useEffect(() => {
    const isDesktop = () => window.innerWidth >= 769;
    const onPointerDown = (event: MouseEvent) => {
      if (!isDesktop() || sidebarCollapsed) return;
      const sidebar = sidebarRef.current;
      if (!sidebar) return;
      if (!sidebar.contains(event.target as Node)) {
        setSidebarCollapsed(true);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [sidebarCollapsed]);

  useEffect(() => {
    setSidebarOpen(false);
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

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
            if (target.closest('button.nav-item')) return;
            setSidebarCollapsed(false);
          }}
        >
          <div className="sidebar-header">
            <img src="/icone-magnusmind.svg" alt="" className="sidebar-logo" aria-hidden />
            <p className="logo-text">magnus mind</p>
          </div>
          <nav className="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                location.pathname === item.path ||
                (item.id === 'ciclos' && location.pathname === '/escolher-projeto') ||
                (item.id === 'dashboard' && location.pathname === '/dashboard/inicio') ||
                (item.id === 'equipe' && location.pathname === '/dashboard/minha-equipe');
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-item ${active ? 'active' : ''}`}
                  onClick={() => handleNav(item.id, item.path)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={item.label}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="nav-icon" size={20} aria-hidden />
                  <span className="nav-label">{item.label}</span>
                </button>
              );
            })}
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
          className={`dashboard-main-wrapper ${isConsultoriaChat ? 'consultoria-ia-active' : ''} ${isDesignPage ? 'design-page-active' : ''}`}
        >
          <header className="dashboard-header">
            <button
              type="button"
              className="menu-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label={t.nav.openMenu}
              aria-expanded={sidebarOpen}
            >
              <Menu size={40} aria-hidden />
            </button>
            <CycleSelector />
          </header>
          <main
            ref={mainRef}
            id="main-content"
            tabIndex={-1}
            className={`dashboard-main ${isConsultoriaChat ? 'consultoria-ia-active' : ''} ${isDesignPage ? 'design-page-active' : ''}`}
          >
            <Outlet />
          </main>
        </div>
      </div>
      <SupportChatWidget />
    </div>
  );
}
