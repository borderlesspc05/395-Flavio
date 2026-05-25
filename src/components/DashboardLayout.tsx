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
  Settings2,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

const navItems = [
  { id: 'dashboard', label: 'Hub (MID)', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'formulario', label: '1 · Diagnóstico', icon: FileText, path: '/dashboard/initial-form' },
  { id: 'consultoria', label: '2 · Design (Blueprint)', icon: Bot, path: '/dashboard/consultoria-ia' },
  { id: 'blueprint-config', label: '2.0 · Config Agente', icon: Settings2, path: '/dashboard/blueprint/config' },
  { id: 'objetivos', label: '3 · Difusão', icon: Target, path: '/dashboard/objetivos' },
  { id: 'equipe', label: 'Equipe', icon: Users, path: '/dashboard/minha-equipe' },
  { id: 'relatorios', label: '4 · Domínio (MID)', icon: BarChart3, path: '/dashboard/relatorios' },
  { id: 'historico', label: 'Loop contínuo', icon: History, path: '/dashboard/historico' },
];

const SIDEBAR_COLLAPSE_STORAGE_KEY = 'mm.sidebar.collapsed';

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSE_STORAGE_KEY) === '1';
  });
  const isConsultoria = location.pathname === '/dashboard/consultoria-ia';

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
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <a href="#main-content" className="mm-skip-link">
        Ir para o conteúdo principal
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
                (item.path === '/dashboard' &&
                  (location.pathname === '/dashboard' || location.pathname === '/dashboard/'));
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
              aria-label="Sair"
              title={sidebarCollapsed ? 'Sair' : undefined}
            >
              <LogOut className="nav-icon" size={20} aria-hidden />
              <span className="nav-label">Sair</span>
            </button>
          </nav>
        </aside>
        <div className={`dashboard-main-wrapper ${isConsultoria ? 'consultoria-ia-active' : ''}`}>
          <header className="dashboard-header">
            <button
              type="button"
              className="menu-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menu de navegação"
              aria-expanded={sidebarOpen}
            >
              <Menu size={40} aria-hidden />
            </button>
          </header>
          <main
            ref={mainRef}
            id="main-content"
            tabIndex={-1}
            className={`dashboard-main ${isConsultoria ? 'consultoria-ia-active' : ''}`}
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
