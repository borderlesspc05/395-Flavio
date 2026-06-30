import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useViewTransitionNavigate } from '../hooks/useViewTransitionNavigate';
import { ArrowRight } from 'lucide-react';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { AuthLayout } from '../components/AuthLayout';
import { storePendingCheckout } from '../services/billingApi';
import { isPlanId } from '../constants/plans';
import { isAdminEmail } from '../constants/admin';
import { clearWorkspaceEntered } from '../services/projectWorkspace';

export function LoginPage() {
  const navigate = useViewTransitionNavigate();
  const [searchParams] = useSearchParams();
  const paymentSuccess = searchParams.get('payment') === 'success';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

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
      clearWorkspaceEntered();
      navigate('/escolher-projeto');
    } catch {
      setError('Email ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setForgotMessage('');
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Informe o email da sua conta para receber o link de redefinição.');
      return;
    }
    setForgotLoading(true);
    try {
      await sendPasswordResetEmail(auth, trimmed, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      });
      setForgotMessage(
        'Enviamos um link para redefinir sua senha. Confira sua caixa de entrada e o spam.'
      );
    } catch {
      setError('Não foi possível enviar o email de recuperação. Verifique o endereço e tente novamente.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <AuthLayout
      title={forgotMode ? 'Recuperar senha' : 'Entrar'}
      subtitle={
        forgotMode
          ? 'Enviaremos um link seguro para o email da sua conta'
          : 'Acesse sua conta Magnus Waves'
      }
      backTo={{ href: '/', label: 'Voltar' }}
    >
      {paymentSuccess && !forgotMode && (
        <p className="auth-payment-banner" role="status">
          Pagamento recebido. Entre com o <strong>mesmo email</strong> usado no Stripe para ativar seu
          plano.
        </p>
      )}

      {forgotMode ? (
        <form className="auth-form" onSubmit={handleForgotPassword}>
          <div className="form-group">
            <label htmlFor="email">Email da conta</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={error ? 'input-error' : ''}
            />
          </div>
          {forgotMessage && (
            <p className="auth-success-banner" role="status">
              {forgotMessage}
            </p>
          )}
          {error && <span className="error-message">{error}</span>}
          <div className="auth-form-actions">
            <button type="submit" className="auth-btn auth-btn--primary" disabled={forgotLoading}>
              <span className="auth-btn-label">
                {forgotLoading ? 'Enviando…' : 'Enviar link de recuperação'}
              </span>
              <span className="auth-btn-trail" aria-hidden>
                <ArrowRight size={18} strokeWidth={2.25} />
              </span>
            </button>
          </div>
          <button
            type="button"
            className="auth-forgot-back"
            onClick={() => {
              setForgotMode(false);
              setError('');
              setForgotMessage('');
            }}
          >
            Voltar para entrar
          </button>
        </form>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
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
              autoComplete="current-password"
              className={error ? 'input-error' : ''}
            />
            <button
              type="button"
              className="auth-forgot-link"
              onClick={() => {
                setForgotMode(true);
                setError('');
              }}
            >
              Esqueci minha senha
            </button>
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
      )}
    </AuthLayout>
  );
}
