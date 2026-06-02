import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, LockKeyhole } from 'lucide-react';
import { isPlanId, PLAN_LABELS, type PlanId } from '../constants/plans';

export function MockCheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);

  const sessionId = searchParams.get('session_id') ?? '';
  const planParam = searchParams.get('plan') ?? 'starter';
  const planId: PlanId = isPlanId(planParam) ? planParam : 'starter';
  const planName = PLAN_LABELS[planId];

  const amountLabel = useMemo(() => {
    if (planId === 'starter') return 'R$ 59,00 / mês';
    if (planId === 'advanced') return 'R$ 149,00 / mês';
    return 'R$ 399,00 / mês';
  }, [planId]);

  const handleConfirmMockPayment = () => {
    setLoading(true);
    const redirect = `/register?payment=success&session_id=${encodeURIComponent(sessionId)}&plan=${planId}&demo=1`;
    navigate(redirect, { replace: true });
  };

  return (
    <main className="mock-checkout-page">
      <section className="mock-checkout-card">
        <p className="mock-checkout-kicker">Pagamento simulado (mock)</p>
        <h1>Checkout Magnus Mind</h1>
        <p className="mock-checkout-sub">
          Ambiente de teste: aqui validamos o fluxo antes do deploy com Stripe real.
        </p>

        <div className="mock-checkout-summary">
          <div>
            <span>Plano</span>
            <strong>{planName}</strong>
          </div>
          <div>
            <span>Valor</span>
            <strong>{amountLabel}</strong>
          </div>
          <div>
            <span>Sessão</span>
            <strong className="mock-checkout-session">{sessionId || 'demo'}</strong>
          </div>
        </div>

        <div className="mock-checkout-fake-form" aria-hidden>
          <label>
            <span>Número do cartão</span>
            <div>
              <CreditCard size={16} />
              4242 4242 4242 4242
            </div>
          </label>
          <div className="mock-checkout-inline">
            <label>
              <span>Validade</span>
              <div>12/34</div>
            </label>
            <label>
              <span>CVC</span>
              <div>123</div>
            </label>
          </div>
        </div>

        <button
          type="button"
          className="plans-btn plans-btn--primary plans-btn--lg mock-checkout-confirm"
          onClick={handleConfirmMockPayment}
          disabled={loading}
        >
          <LockKeyhole size={16} />
          {loading ? 'Confirmando…' : 'Confirmar pagamento mock'}
        </button>

        <Link to="/planos" className="mock-checkout-back">
          Voltar para os planos
        </Link>
      </section>
    </main>
  );
}
