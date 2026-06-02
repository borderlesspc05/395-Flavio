import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { billingApi, storePendingCheckout } from '../services/billingApi';
import type { PlanId } from '../constants/plans';
import { isPlanId } from '../constants/plans';

interface PlanCheckoutButtonProps {
  planId: PlanId;
  className?: string;
  children: React.ReactNode;
}

export function PlanCheckoutButton({ planId, className, children }: PlanCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClick = async () => {
    setError('');
    setLoading(true);
    try {
      const { url, sessionId } = await billingApi.createCheckoutSession(planId);
      const isDemo = url.includes('demo=1');
      storePendingCheckout(sessionId, isDemo, isPlanId(planId) ? planId : undefined);
      window.location.href = url;
    } catch (e: unknown) {
      const msg =
        axiosMessage(e) ?? 'Não foi possível iniciar o pagamento. Tente novamente em instantes.';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <span className="plan-checkout-wrap">
      <button
        type="button"
        className={className}
        onClick={() => void handleClick()}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? (
          <>
            <Loader2 size={18} className="plans-btn-spinner" aria-hidden />
            Redirecionando…
          </>
        ) : (
          children
        )}
      </button>
      {error && (
        <span className="plan-checkout-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}

function axiosMessage(e: unknown): string | undefined {
  if (e && typeof e === 'object' && 'response' in e) {
    const data = (e as { response?: { data?: { message?: string; error?: string } } }).response?.data;
    return data?.message ?? data?.error;
  }
  return undefined;
}
