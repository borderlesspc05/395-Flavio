import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../config/firebase';
import { AuthLayout } from '../components/AuthLayout';

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      navigate('/dashboard');
    } catch {
      setError('Não foi possível criar a conta. Verifique os dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Registro"
      backTo={{ href: '/', label: 'Voltar para a landing' }}
      footer={
        <>
          Já tem uma conta? <Link to="/login" className="auth-link">Faça login</Link>
        </>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Nome</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="password">Senha</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        <div className="form-group">
          <label htmlFor="confirm">Confirmar Senha</label>
          <input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        {error && <span className="error-message">{error}</span>}
        <div className="auth-form-actions">
          <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
            <span className="auth-btn-label">{loading ? 'Criando...' : 'Criar conta'}</span>
            <span className="auth-btn-trail" aria-hidden>
              <ArrowRight size={18} strokeWidth={2.25} />
            </span>
          </button>
        </div>
      </form>
    </AuthLayout>
  );
}
