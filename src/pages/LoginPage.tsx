import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { AuthLayout } from '../components/AuthLayout';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch {
      setError('Email ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Login"
      backTo={{ href: '/', label: 'Voltar para a landing' }}
      footer={
        <>
          Não tem uma conta? <Link to="/register" className="auth-link">Registre-se</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={error ? 'input-error' : ''}
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={error ? 'input-error' : ''}
          />
        </div>
        {error && <span className="error-message">{error}</span>}
        <div className="auth-form-actions">
          <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
            <span className="auth-btn-label">{loading ? 'Entrando...' : 'Entrar'}</span>
            <span className="auth-btn-trail" aria-hidden>
              <ArrowRight size={18} strokeWidth={2.25} />
            </span>
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
