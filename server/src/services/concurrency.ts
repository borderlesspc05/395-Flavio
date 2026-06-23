import { AppError } from '../utils/errors';
import { DEFAULT_PLAN_ID, type PlanId } from './plans';
import { getPlanIdForUser } from './subscriptions';
import { getConcurrencyLimitFromSettings } from './adminSettings';
import { COLLECTIONS } from '../config/env';
import { getById } from './storage';
import type { UserProfile } from './users';

const activeByUser = new Map<string, number>();

export async function getConcurrencyLimitForUser(userId: string): Promise<number | null> {
  try {
    const profile = await getById<UserProfile>(COLLECTIONS.userProfiles, userId);
    if (profile && profile.concurrencyOverride !== undefined) {
      return profile.concurrencyOverride;
    }
    const planId: PlanId = await getPlanIdForUser(userId);
    return getConcurrencyLimitFromSettings(planId);
  } catch (err) {
    console.warn('[concurrency] fallback to default plan limit:', err);
    return getConcurrencyLimitFromSettings(DEFAULT_PLAN_ID);
  }
}

export function tryAcquireSlot(userId: string, limit: number | null): boolean {
  if (limit === null) return true;
  const current = activeByUser.get(userId) ?? 0;
  if (current >= limit) return false;
  activeByUser.set(userId, current + 1);
  return true;
}

export function releaseSlot(userId: string): void {
  const current = activeByUser.get(userId) ?? 0;
  if (current <= 1) {
    activeByUser.delete(userId);
  } else {
    activeByUser.set(userId, current - 1);
  }
}

export async function withConcurrencyLimit<T>(
  userId: string,
  fn: () => Promise<T>
): Promise<T> {
  const limit = await getConcurrencyLimitForUser(userId);
  if (!tryAcquireSlot(userId, limit)) {
    const label = limit === 1 ? '1 requisição' : `${limit} requisições`;
    throw new AppError(
      429,
      `Limite do seu plano atingido (${label} simultânea(s)). Aguarde a conclusão das chamadas em andamento.`
    );
  }
  try {
    return await fn();
  } finally {
    releaseSlot(userId);
  }
}
