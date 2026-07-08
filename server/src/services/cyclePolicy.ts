import { AppError } from '../utils/errors';
import { getMaxOpenCycles, type PlanId } from './plans';
import { getPlanIdForUser } from './subscriptions';
import { getPlanSettings } from './adminSettings';

export type CycleStatus = 'draft' | 'active' | 'archived';

export function isOpenCycleStatus(status: string): boolean {
  return status === 'draft' || status === 'active';
}

export function countOpenCycles(
  cycles: Array<{ id?: string; status: string }>,
  excludeCycleId?: string
): number {
  return cycles.filter(
    (c) => isOpenCycleStatus(c.status) && (!excludeCycleId || c.id !== excludeCycleId)
  ).length;
}

export async function getMaxOpenCyclesFromSettings(planId: PlanId): Promise<number | null> {
  const settings = await getPlanSettings();
  const fromSettings = settings[planId]?.maxOpenCycles;
  if (fromSettings !== undefined) return fromSettings;
  return getMaxOpenCycles(planId);
}

export async function getMaxOpenCyclesForUser(userId: string): Promise<number | null> {
  const { isDemoSubscriptionUser } = await import('./subscriptions');
  if (await isDemoSubscriptionUser(userId)) return null;
  const planId = await getPlanIdForUser(userId);
  return getMaxOpenCyclesFromSettings(planId);
}

export function assertCanAddOpenCycle(
  totalCount: number,
  maxCycles: number | null,
  planName: string
): void {
  if (maxCycles === null) return;
  if (totalCount < maxCycles) return;
  throw new AppError(
    403,
    maxCycles === 1
      ? `Seu plano ${planName} permite apenas 1 processo de pré-diagnóstico. Faça upgrade para criar outro.`
      : `Seu plano ${planName} permite até ${maxCycles} processos de pré-diagnóstico. Faça upgrade para criar mais.`
  );
}
