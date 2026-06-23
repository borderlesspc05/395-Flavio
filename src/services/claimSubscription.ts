import { billingApi, clearPendingCheckout, readPendingCheckout } from './billingApi';
import { setClientConcurrencyLimit } from './requestConcurrency';
import type { PlanSummary } from './billingApi';

let claimInflight: Promise<PlanSummary | null> | null = null;
let claimInflightUserId: string | null = null;

export async function claimSubscriptionForUser(
  userId: string,
  email: string
): Promise<PlanSummary | null> {
  if (claimInflight && claimInflightUserId === userId) {
    return claimInflight;
  }

  claimInflightUserId = userId;
  claimInflight = (async () => {
  const pending = readPendingCheckout();
  try {
    const result = await billingApi.claim({
      userId,
      email,
      checkoutSessionId: pending?.sessionId,
      demo: pending?.demo,
      planId: pending?.planId,
    });
    setClientConcurrencyLimit(result.concurrencyLimit);
    clearPendingCheckout();
    return result;
  } catch {
    clearPendingCheckout();
    const plan = await billingApi.getPlan(userId).catch(() => null);
    if (plan) setClientConcurrencyLimit(plan.concurrencyLimit);
    return plan;
  }
  })().finally(() => {
    claimInflight = null;
    claimInflightUserId = null;
  });

  return claimInflight;
}
