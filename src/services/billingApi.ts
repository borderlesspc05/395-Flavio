import { api } from './api';
import type { PlanId } from '../constants/plans';

export interface PlanSummary {
  planId: PlanId;
  planName: string;
  concurrencyLimit: number | null;
  maxOpenCycles: number | null;
}

export interface ClaimResult extends PlanSummary {
  ok: boolean;
  linked: boolean;
  hasActiveSubscription: boolean;
}

const PENDING_CHECKOUT_KEY = 'magnus_pending_checkout';

export function storePendingCheckout(sessionId: string, demo?: boolean, planId?: PlanId) {
  sessionStorage.setItem(
    PENDING_CHECKOUT_KEY,
    JSON.stringify({ sessionId, demo: Boolean(demo), planId })
  );
}

export function readPendingCheckout(): {
  sessionId: string;
  demo?: boolean;
  planId?: PlanId;
} | null {
  try {
    const raw = sessionStorage.getItem(PENDING_CHECKOUT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { sessionId: string; demo?: boolean; planId?: PlanId };
  } catch {
    return null;
  }
}

export function clearPendingCheckout() {
  sessionStorage.removeItem(PENDING_CHECKOUT_KEY);
}

export const billingApi = {
  createCheckoutSession: (planId: PlanId) =>
    api
      .post<{ url: string; sessionId: string }>('/api/billing/checkout-session', { planId })
      .then((r) => r.data),

  claim: (data: {
    email: string;
    checkoutSessionId?: string;
    demo?: boolean;
    planId?: PlanId;
  }) => api.post<ClaimResult>('/api/billing/claim', data).then((r) => r.data),

  getPlan: () =>
    api.get<PlanSummary>('/api/billing/plan').then((r) => r.data),
};
