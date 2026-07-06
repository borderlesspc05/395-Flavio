import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../config/firebase';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const location = useLocation();

  useEffect(() => {
    let active = true;
    void auth.authStateReady().then(() => {
      if (active) setUser(auth.currentUser);
    });
    const unsub = onAuthStateChanged(auth, (next) => {
      if (active) setUser(next);
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  if (user === undefined) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-blue) 100%)',
        }}
      >
        <span style={{ color: 'var(--text-primary)' }}>Carregando...</span>
      </div>
    );
  }

  if (user === null) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
