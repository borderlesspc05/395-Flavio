import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { billingApi, type PlanSummary } from '../services/billingApi';
import { claimSubscriptionForUser } from '../services/claimSubscription';
import { setClientConcurrencyLimit } from '../services/requestConcurrency';
import { formatConcurrencyLimit } from '../constants/plans';
import type { PlanId } from '../constants/plans';

interface PlanContextValue {
  plan: PlanSummary | null;
  loading: boolean;
  refreshPlan: () => Promise<void>;
  concurrencyLabel: string;
}

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<PlanSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const applyPlan = useCallback((summary: PlanSummary | null) => {
    setPlan(summary);
    setClientConcurrencyLimit(summary?.concurrencyLimit ?? 1);
  }, []);

  const refreshPlan = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      applyPlan(null);
      return;
    }
    const summary = await billingApi.getPlan(user.uid);
    applyPlan(summary);
  }, [applyPlan]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (!user) {
        applyPlan(null);
        setLoading(false);
        return;
      }
      try {
        const claimed = await claimSubscriptionForUser(user.uid, user.email ?? '');
        if (claimed) {
          applyPlan(claimed);
        } else {
          await refreshPlan();
        }
      } catch {
        await refreshPlan().catch(() => applyPlan(null));
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, [applyPlan, refreshPlan]);

  const value = useMemo<PlanContextValue>(
    () => ({
      plan,
      loading,
      refreshPlan,
      concurrencyLabel: formatConcurrencyLimit(plan?.concurrencyLimit ?? 1),
    }),
    [plan, loading, refreshPlan]
  );

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) {
    throw new Error('usePlan must be used within PlanProvider');
  }
  return ctx;
}

export function usePlanId(): PlanId {
  const { plan } = usePlan();
  return plan?.planId ?? 'starter';
}
