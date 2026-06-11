import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { AuthLayout } from '../components/AuthLayout';
import { storePendingCheckout } from '../services/billingApi';
import { claimSubscriptionForUser } from '../services/claimSubscription';
import { isPlanId } from '../constants/plans';
import { isAdminEmail } from '../constants/admin';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paymentSuccess = searchParams.get('payment') === 'success';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('payment') !== 'success') return;
    const sessionId = searchParams.get('session_id');
    if (!sessionId) return;
    const planRaw = searchParams.get('plan');
    storePendingCheckout(
      sessionId,
      searchParams.get('demo') === '1',
      planRaw && isPlanId(planRaw) ? planRaw : undefined
    );
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (isAdminEmail(cred.user.email)) {
        navigate('/admin');
        return;
      }
      await claimSubscriptionForUser(cred.user.uid, cred.user.email ?? email);
      navigate('/dashboard');
    } catch {
      setError('Email ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Entrar"
      subtitle="Acesse sua conta Magnus Waves"
      backTo={{ href: '/', label: 'Voltar' }}
    >
      {paymentSuccess && (
        <p className="auth-payment-banner" role="status">
          Pagamento recebido. Entre com o <strong>mesmo email</strong> usado no Stripe para ativar seu
          plano.
        </p>
      )}
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
