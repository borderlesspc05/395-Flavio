import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicAnimatedLayout } from './components/PublicAnimatedLayout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardLayout } from './components/DashboardLayout';
import { DashboardHome } from './pages/DashboardHome';
import { ProjectSelectPage } from './pages/ProjectSelectPage';
import { ProjectGate } from './components/ProjectGate';
import { InitialFormPage } from './pages/InitialFormPage';
import { DesignPlansPage } from './pages/DesignPlansPage';
import { ObjetivosPage } from './pages/ObjetivosPage';
import { MinhaEquipePage } from './pages/MinhaEquipePage';
import { RelatoriosPage } from './pages/RelatoriosPage';
import { HistoricoPage } from './pages/HistoricoPage';
import { AccountPage } from './pages/AccountPage';
import { PlansLandingPage } from './pages/PlansLandingPage';
import { MockCheckoutPage } from './pages/MockCheckoutPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminPage } from './pages/AdminPage';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import { EmployeeProfilePage } from './pages/EmployeeProfilePage';
import { OrganizationalScansHubPage } from './pages/OrganizationalScansHubPage';
import { OrganizationalScanRunnerPage } from './pages/OrganizationalScanRunnerPage';
import { SolutionPickPage } from './pages/SolutionPickPage';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicAnimatedLayout />}>
        <Route path="/" element={<PlansLandingPage />} />
        <Route path="/planos" element={<PlansLandingPage />} />
        <Route path="/mock-checkout" element={<MockCheckoutPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/colaborador/:memberId" element={<EmployeeProfilePage />} />
        <Route path="/colaborador" element={<EmployeeProfilePage />} />
        <Route
          path="/escolher-projeto"
          element={
            <ProtectedRoute>
              <ProjectSelectPage />
            </ProtectedRoute>
          }
        />
      </Route>
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
            <ProjectGate>
              <DashboardLayout />
            </ProjectGate>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard/inicio" replace />} />
        <Route path="ciclos" element={<Navigate to="/escolher-projeto" replace />} />
        <Route path="inicio" element={<DashboardHome />} />
        <Route path="initial-form" element={<InitialFormPage />} />
        <Route path="scans" element={<OrganizationalScansHubPage />} />
        <Route path="scans/:scanId" element={<OrganizationalScanRunnerPage />} />
        <Route path="solution-pick" element={<SolutionPickPage />} />
        <Route path="design" element={<DesignPlansPage />} />
        <Route path="consultoria-ia" element={<Navigate to="/dashboard/inicio" replace />} />
        <Route path="objetivos" element={<ObjetivosPage />} />
        <Route path="minha-equipe" element={<MinhaEquipePage />} />
        <Route path="relatorios" element={<RelatoriosPage />} />
        <Route path="historico" element={<HistoricoPage />} />
        <Route path="conta" element={<AccountPage />} />
      </Route>
      <Route path="/initial-form" element={<Navigate to="/dashboard/initial-form" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
