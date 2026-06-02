export type PlanId = 'starter' | 'advanced' | 'premium';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  /** null = unlimited concurrent API/IA requests */
  concurrencyLimit: number | null;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  starter: { id: 'starter', name: 'Starter', concurrencyLimit: 1 },
  advanced: { id: 'advanced', name: 'Advanced', concurrencyLimit: 3 },
  premium: { id: 'premium', name: 'Premium', concurrencyLimit: null },
};

export const DEFAULT_PLAN_ID: PlanId = 'starter';

export function isPlanId(value: string): value is PlanId {
  return value === 'starter' || value === 'advanced' || value === 'premium';
}

export function getConcurrencyLimit(planId: PlanId): number | null {
  return PLANS[planId].concurrencyLimit;
}
