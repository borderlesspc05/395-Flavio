import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardLayout } from './components/DashboardLayout';
import { DashboardHome } from './pages/DashboardHome';
import { InitialFormPage } from './pages/InitialFormPage';
import { ConsultoriaIAPage } from './pages/ConsultoriaIAPage';
import { ObjetivosPage } from './pages/ObjetivosPage';
import { MinhaEquipePage } from './pages/MinhaEquipePage';
import { RelatoriosPage } from './pages/RelatoriosPage';
import { HistoricoPage } from './pages/HistoricoPage';
import { PlansLandingPage } from './pages/PlansLandingPage';
import { MockCheckoutPage } from './pages/MockCheckoutPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminPage } from './pages/AdminPage';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PlansLandingPage />} />
      <Route path="/planos" element={<PlansLandingPage />} />
      <Route path="/mock-checkout" element={<MockCheckoutPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            <AdminPage />
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="initial-form" element={<InitialFormPage />} />
        <Route path="consultoria-ia" element={<ConsultoriaIAPage />} />
        <Route path="objetivos" element={<ObjetivosPage />} />
        <Route path="minha-equipe" element={<MinhaEquipePage />} />
        <Route path="relatorios" element={<RelatoriosPage />} />
        <Route path="historico" element={<HistoricoPage />} />
      </Route>
      <Route path="/initial-form" element={<Navigate to="/dashboard/initial-form" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
