import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ViewTransitionLink } from '../components/navigation/ViewTransitionLink';
import { ArrowRight, Shield } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { AuthLayout } from '../components/AuthLayout';
import { isAdminEmail } from '../constants/admin';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!isAdminEmail(cred.user.email)) {
        setError('Esta conta não tem permissão de administrador.');
        return;
      }
      navigate('/admin');
    } catch {
      setError('Email ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Admin Magnus Mind"
      backTo={{ href: '/', label: 'Voltar para a landing' }}
      footer={
        <>
          Acesso de usuário? <ViewTransitionLink to="/login" className="auth-link">Login normal</ViewTransitionLink>
        </>
      }
    >
      <p className="auth-payment-banner" role="status">
        <Shield size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
        Área restrita — apenas administradores.
      </p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="admin-email">Email admin</label>
          <input
            id="admin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </div>
        <div className="form-group">
          <label htmlFor="admin-password">Senha</label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        {error && <span className="error-message">{error}</span>}
        <div className="auth-form-actions">
          <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
            <span className="auth-btn-label">{loading ? 'Entrando…' : 'Entrar no painel'}</span>
            <span className="auth-btn-trail" aria-hidden>
              <ArrowRight size={18} strokeWidth={2.25} />
            </span>
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
