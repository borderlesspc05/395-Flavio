export type PlanId = 'starter' | 'advanced' | 'premium';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  /** null = unlimited concurrent API/IA requests */
  concurrencyLimit: number | null;
  /** null = unlimited open projects/cycles (draft + active) */
  maxOpenCycles: number | null;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  starter: { id: 'starter', name: 'Starter', concurrencyLimit: 1, maxOpenCycles: 1 },
  advanced: { id: 'advanced', name: 'Advanced', concurrencyLimit: 3, maxOpenCycles: 3 },
  premium: { id: 'premium', name: 'Premium', concurrencyLimit: null, maxOpenCycles: null },
};

export const DEFAULT_PLAN_ID: PlanId = 'starter';

export function isPlanId(value: string): value is PlanId {
  return value === 'starter' || value === 'advanced' || value === 'premium';
}

export function getConcurrencyLimit(planId: PlanId): number | null {
  return PLANS[planId].concurrencyLimit;
}

export function getMaxOpenCycles(planId: PlanId): number | null {
  return PLANS[planId].maxOpenCycles;
}

/** Limite padrão do plano (1, 3 ou null). String vazia = ilimitado (premium). */
export function parseConcurrencyInput(raw: unknown): number | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || raw === 'unlimited' || raw === '') return null;
  if (typeof raw === 'number' && raw > 0) return Math.floor(raw);
  if (typeof raw === 'string') {
    const trimmed = raw.trim().toLowerCase();
    if (trimmed === '' || trimmed === 'unlimited' || trimmed === 'ilimitado') return null;
    const n = Number(trimmed);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return undefined;
}

export function isDefaultConcurrencyForPlan(
  planId: PlanId,
  limit: number | null | undefined
): boolean {
  const expected = PLANS[planId].concurrencyLimit;
  return limit === expected;
}

/** Alinha exibição do plano quando só o limite de concorrência está configurado (ex.: admin). */
export function inferPlanIdFromConcurrencyLimit(limit: number | null): PlanId | null {
  if (limit === null) return 'premium';
  if (limit >= 3) return 'advanced';
  if (limit === 1) return 'starter';
  return null;
}
