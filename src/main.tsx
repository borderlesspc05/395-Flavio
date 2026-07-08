import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { initFirebaseAnalytics } from './config/firebase';
import App from './App';
import { PlanProvider } from './context/PlanContext';
import { LocaleProvider } from './context/LocaleContext';
import { CycleProvider } from './context/CycleContext';
import './index.css';
import './styles/theme-refined.css';
import './styles/magnus-design.css';
import './styles/consultoria-responsive.css';
import './styles/consultoria-refined.css';
import './styles/gate-zero-design.css';
import './styles/brand-overrides.css';
import './styles/layout-system.css';
import './styles/magnus-waves.css';
import './styles/action-canvas.css';
import './styles/plans-landing.css';
import './styles/admin-panel.css';
import './styles/mid-dashboard.css';
import './styles/account-page.css';
import './styles/user-avatar.css';
import './styles/loop-workspace.css';
import './styles/cycle-selector.css';
import './styles/project-select.css';
import './styles/equipe-diffusao.css';
import './styles/historico-loop.css';
import './styles/evolution-loop.css';
import './styles/cycle-closeout.css';
import './styles/employee-profile.css';
import './styles/solution-pick.css';
import './styles/design-plans.css';
import './styles/diagnostic-laudo.css';
import './styles/support-chat.css';
import './styles/auth-refined.css';
import './styles/view-transitions.css';
import './styles/premium-shell.css';
import './styles/domain-wave.css';

void initFirebaseAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LocaleProvider>
        <PlanProvider>
          <CycleProvider>
            <App />
          </CycleProvider>
        </PlanProvider>
      </LocaleProvider>
    </BrowserRouter>
  </StrictMode>
);
