import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { initFirebaseAnalytics } from './config/firebase';
import App from './App';
import { PlanProvider } from './context/PlanContext';
import './index.css';
import './styles/theme-refined.css';
import './styles/magnus-design.css';
import './styles/consultoria-responsive.css';
import './styles/gate-zero-design.css';
import './styles/brand-overrides.css';
import './styles/magnus-waves.css';
import './styles/action-canvas.css';
import './styles/plans-landing.css';

void initFirebaseAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <PlanProvider>
        <App />
      </PlanProvider>
    </BrowserRouter>
  </StrictMode>
);
