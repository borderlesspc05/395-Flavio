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
  if (limit === null) return 'IA sem fila de espera';
  if (limit === 1) return '1 operação de IA por vez';
  return `${limit} operações de IA em paralelo`;
}

export { formatMaxOpenCycles } from '../utils/cycleLimits';

export function formatPlanQuotaSummary(
  maxOpenCycles: number | null,
  concurrencyLimit: number | null
): string {
  const projects =
    maxOpenCycles === null
      ? 'Projetos ilimitados'
      : maxOpenCycles === 1
        ? '1 projeto ativo'
        : `${maxOpenCycles} projetos ativos`;
  return `${projects} · ${formatConcurrencyLimit(concurrencyLimit)}`;
}
