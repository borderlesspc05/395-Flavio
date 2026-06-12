import { Navigate } from 'react-router-dom';
import { hasEnteredWorkspace } from '../services/projectWorkspace';

export function ProjectGate({ children }: { children: React.ReactNode }) {
  if (!hasEnteredWorkspace()) {
    return <Navigate to="/escolher-projeto" replace />;
  }
  return <>{children}</>;
}
