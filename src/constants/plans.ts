export type PlanId = 'starter' | 'advanced' | 'premium';

export const PLAN_LABELS: Record<PlanId, string> = {
  starter: 'Starter',
  advanced: 'Advanced',
  premium: 'Premium',
};

export function isPlanId(value: string): value is PlanId {
  return value === 'starter' || value === 'advanced' || value === 'premium';
}

export function formatConcurrencyLimit(limit: number | null): string {
  if (limit === null) return 'Ilimitado';
  if (limit === 1) return '1 requisição por vez';
  return `${limit} requisições por vez`;
}
