import { AppError } from '../utils/errors';
import { DEFAULT_PLAN_ID, type PlanId } from './plans';
import { getPlanIdForUser } from './subscriptions';
import { getConcurrencyLimitFromSettings } from './adminSettings';
import { COLLECTIONS } from '../config/env';
import { getById } from './storage';
import { getFirestore, isFirebaseEnabled } from './firebase';
import type { UserProfile } from './users';

/** Fallback em memória (dev / Firestore indisponível) */
const activeByUser = new Map<string, number>();

export async function getConcurrencyLimitForUser(userId: string): Promise<number | null> {
  try {
    const { isDemoSubscriptionUser } = await import('./subscriptions');
    if (await isDemoSubscriptionUser(userId)) return null;

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

function tryAcquireSlotMemory(userId: string, limit: number | null): boolean {
  if (limit === null) return true;
  const current = activeByUser.get(userId) ?? 0;
  if (current >= limit) return false;
  activeByUser.set(userId, current + 1);
  return true;
}

function releaseSlotMemory(userId: string): void {
  const current = activeByUser.get(userId) ?? 0;
  if (current <= 1) {
    activeByUser.delete(userId);
  } else {
    activeByUser.set(userId, current - 1);
  }
}

async function tryAcquireSlotDistributed(userId: string, limit: number | null): Promise<boolean> {
  if (limit === null) return true;

  const db = getFirestore();
  if (!db || !isFirebaseEnabled()) {
    return tryAcquireSlotMemory(userId, limit);
  }

  try {
    return await db.runTransaction(async (tx) => {
      const ref = db.collection(COLLECTIONS.concurrencySlots).doc(userId);
      const snap = await tx.get(ref);
      const active = typeof snap.data()?.activeCount === 'number' ? snap.data()!.activeCount : 0;
      if (active >= limit) return false;
      tx.set(
        ref,
        { activeCount: active + 1, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      return true;
    });
  } catch (err) {
    console.warn('[concurrency] Firestore acquire failed, using memory:', err);
    return tryAcquireSlotMemory(userId, limit);
  }
}

async function releaseSlotDistributed(userId: string, limit: number | null): Promise<void> {
  if (limit === null) return;

  const db = getFirestore();
  if (!db || !isFirebaseEnabled()) {
    releaseSlotMemory(userId);
    return;
  }

  try {
    await db.runTransaction(async (tx) => {
      const ref = db.collection(COLLECTIONS.concurrencySlots).doc(userId);
      const snap = await tx.get(ref);
      const active = typeof snap.data()?.activeCount === 'number' ? snap.data()!.activeCount : 0;
      const next = Math.max(0, active - 1);
      if (next === 0) {
        tx.delete(ref);
      } else {
        tx.set(ref, { activeCount: next, updatedAt: new Date().toISOString() }, { merge: true });
      }
    });
  } catch (err) {
    console.warn('[concurrency] Firestore release failed, using memory:', err);
    releaseSlotMemory(userId);
  }
}

export async function withConcurrencyLimit<T>(
  userId: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!userId || userId === 'demo-user') {
    throw new AppError(401, 'Autenticação necessária para usar recursos de IA.');
  }

  const limit = await getConcurrencyLimitForUser(userId);
  const acquired = await tryAcquireSlotDistributed(userId, limit);
  if (!acquired) {
    const label =
      limit === null
        ? 'ilimitadas'
        : limit === 1
          ? '1 requisição'
          : `${limit} requisições`;
    throw new AppError(
      429,
      `Limite do seu plano atingido (${label} simultânea(s)). Aguarde a conclusão das chamadas em andamento ou faça upgrade.`
    );
  }

  try {
    return await fn();
  } finally {
    await releaseSlotDistributed(userId, limit);
  }
}
