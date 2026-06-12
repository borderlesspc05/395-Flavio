import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { isAdminEmail } from '../constants/admin';

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const location = useLocation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return unsub;
  }, []);

  if (user === undefined) {
    return (
      <div className="admin-loading">
        <span>Carregando painel admin…</span>
      </div>
    );
  }

  if (user === null) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!isAdminEmail(user.email)) {
    return <Navigate to="/escolher-projeto" replace />;
  }

  return <>{children}</>;
}
