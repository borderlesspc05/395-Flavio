import { create, getById, update, COLLECTIONS } from './storage';
import { DEFAULT_PLAN_ID, type PlanId, isPlanId, inferPlanIdFromConcurrencyLimit } from './plans';
import { getConcurrencyLimitForUser } from './concurrency';
import type { UserProfile } from './users';

export interface SubscriptionRecord {
  id: string;
  email: string;
  planId: PlanId;
  status: 'active' | 'cancelled' | 'past_due';
  userId?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeCheckoutSessionId?: string;
  createdAt: string;
  updatedAt: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function subscriptionDocId(email: string): string {
  return normalizeEmail(email);
}

export async function getSubscriptionByEmail(
  email: string
): Promise<SubscriptionRecord | null> {
  return getById<SubscriptionRecord>(COLLECTIONS.subscriptions, subscriptionDocId(email));
}

export async function upsertSubscriptionFromCheckout(data: {
  email: string;
  planId: PlanId;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeCheckoutSessionId?: string;
}): Promise<SubscriptionRecord> {
  const id = subscriptionDocId(data.email);
  const now = new Date().toISOString();
  const existing = await getById<SubscriptionRecord>(COLLECTIONS.subscriptions, id);

  const record: Omit<SubscriptionRecord, 'id'> = {
    email: normalizeEmail(data.email),
    planId: data.planId,
    status: 'active',
    stripeCustomerId: data.stripeCustomerId ?? existing?.stripeCustomerId,
    stripeSubscriptionId: data.stripeSubscriptionId ?? existing?.stripeSubscriptionId,
    stripeCheckoutSessionId: data.stripeCheckoutSessionId ?? existing?.stripeCheckoutSessionId,
    userId: existing?.userId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (existing) {
    await update(COLLECTIONS.subscriptions, id, record);
    return { id, ...record };
  }

  await create(COLLECTIONS.subscriptions, id, record as Record<string, unknown>);
  return { id, ...record };
}

export async function linkSubscriptionToUser(
  email: string,
  userId: string
): Promise<SubscriptionRecord | null> {
  const id = subscriptionDocId(email);
  const existing = await getById<SubscriptionRecord>(COLLECTIONS.subscriptions, id);
  if (!existing || existing.status !== 'active') return null;

  const updated = await update<SubscriptionRecord>(COLLECTIONS.subscriptions, id, {
    userId,
    updatedAt: new Date().toISOString(),
  } as Partial<SubscriptionRecord>);
  return updated;
}

export async function getPlanIdForUser(userId: string): Promise<PlanId> {
  const profile = await getById<UserProfile>(COLLECTIONS.userProfiles, userId);
  if (profile?.planId && isPlanId(profile.planId)) {
    return profile.planId;
  }

  const { listByUser } = await import('./storage');
  const items = await listByUser<SubscriptionRecord>(COLLECTIONS.subscriptions, userId);
  const active = items.find(
    (s) => (s.status === 'active' || s.status === 'past_due') && isPlanId(s.planId)
  );
  if (active) return active.planId;

  const email = profile?.email?.trim();
  if (email) {
    const byEmail = await getSubscriptionByEmail(email);
    if (
      byEmail &&
      (byEmail.status === 'active' || byEmail.status === 'past_due') &&
      isPlanId(byEmail.planId)
    ) {
      if (!byEmail.userId) {
        await linkSubscriptionToUser(email, userId).catch(() => undefined);
      }
      return byEmail.planId;
    }
  }

  return DEFAULT_PLAN_ID;
}

export async function getPlanSummaryForUser(userId: string) {
  const concurrencyLimit = await getConcurrencyLimitForUser(userId);
  let planId = await getPlanIdForUser(userId);

  if (planId === DEFAULT_PLAN_ID) {
    const inferred = inferPlanIdFromConcurrencyLimit(concurrencyLimit);
    if (inferred) planId = inferred;
  }

  const plan = (await import('./plans')).PLANS[planId];
  return {
    planId,
    planName: plan.name,
    concurrencyLimit,
  };
}

export async function setSubscriptionPlanForEmail(
  email: string,
  planId: PlanId,
  userId?: string
): Promise<SubscriptionRecord> {
  const record = await upsertSubscriptionFromCheckout({ email, planId });
  if (userId) {
    await linkSubscriptionToUser(email, userId);
  }
  return record;
}

export async function updateSubscriptionByStripeId(
  stripeSubscriptionId: string,
  patch: { status?: SubscriptionRecord['status']; planId?: PlanId }
): Promise<void> {
  const { getFirestore, isFirebaseEnabled } = await import('./firebase');
  const db = getFirestore();
  const now = new Date().toISOString();

  if (db && isFirebaseEnabled()) {
    const snap = await db
      .collection(COLLECTIONS.subscriptions)
      .where('stripeSubscriptionId', '==', stripeSubscriptionId)
      .limit(1)
      .get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      await update(COLLECTIONS.subscriptions, doc.id, { ...patch, updatedAt: now });
      return;
    }
  }

  const { listAll } = await import('./storage');
  const all = await listAll<SubscriptionRecord>(COLLECTIONS.subscriptions);
  const match = all.find((s) => s.stripeSubscriptionId === stripeSubscriptionId);
  if (match) {
    await update(COLLECTIONS.subscriptions, match.id, { ...patch, updatedAt: now });
  }
}

export async function cancelSubscriptionByStripeId(stripeSubscriptionId: string): Promise<void> {
  const { getFirestore, isFirebaseEnabled } = await import('./firebase');
  const db = getFirestore();
  const now = new Date().toISOString();

  if (db && isFirebaseEnabled()) {
    const snap = await db
      .collection(COLLECTIONS.subscriptions)
      .where('stripeSubscriptionId', '==', stripeSubscriptionId)
      .limit(1)
      .get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      await update(COLLECTIONS.subscriptions, doc.id, {
        status: 'cancelled',
        updatedAt: now,
      });
    }
  }
}
