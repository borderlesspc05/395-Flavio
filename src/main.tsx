import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { initFirebaseAnalytics } from './config/firebase';
import App from './App';
import './index.css';
import './styles/theme-refined.css';
import './styles/magnus-design.css';
import './styles/consultoria-responsive.css';
import './styles/brand-overrides.css';
import './styles/magnus-waves.css';

void initFirebaseAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
