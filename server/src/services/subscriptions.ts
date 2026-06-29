import { create, getById, update, COLLECTIONS } from './storage';
import { DEFAULT_PLAN_ID, type PlanId, isPlanId } from './plans';
import { getConcurrencyLimitFromSettings } from './adminSettings';
import { getConcurrencyLimitForUser } from './concurrency';
import { applyUserPlanAccess, type UserProfile } from './users';

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
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const stripeCustomerId = data.stripeCustomerId ?? existing?.stripeCustomerId;
  const stripeSubscriptionId = data.stripeSubscriptionId ?? existing?.stripeSubscriptionId;
  const stripeCheckoutSessionId =
    data.stripeCheckoutSessionId ?? existing?.stripeCheckoutSessionId;
  if (stripeCustomerId) record.stripeCustomerId = stripeCustomerId;
  if (stripeSubscriptionId) record.stripeSubscriptionId = stripeSubscriptionId;
  if (stripeCheckoutSessionId) record.stripeCheckoutSessionId = stripeCheckoutSessionId;
  if (existing?.userId) record.userId = existing.userId;

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

  const { listByUser } = await import('./storage');
  const items = await listByUser<SubscriptionRecord>(COLLECTIONS.subscriptions, userId);
  const activeByUser = items.find(
    (s) => (s.status === 'active' || s.status === 'past_due') && isPlanId(s.planId)
  );
  if (activeByUser) return activeByUser.planId;

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

  if (profile?.planId && isPlanId(profile.planId)) {
    return profile.planId;
  }

  return DEFAULT_PLAN_ID;
}

/** Sincroniza userProfiles.planId com assinatura ativa; remove override obsoleto. */
export async function syncUserProfilePlan(userId: string): Promise<PlanId> {
  const profile = await getById<UserProfile>(COLLECTIONS.userProfiles, userId);
  const email = profile?.email?.trim();

  let activeSub: SubscriptionRecord | null = null;
  const { listByUser } = await import('./storage');
  const byUserId = await listByUser<SubscriptionRecord>(COLLECTIONS.subscriptions, userId);
  activeSub =
    byUserId.find(
      (s) => (s.status === 'active' || s.status === 'past_due') && isPlanId(s.planId)
    ) ?? null;

  if (!activeSub && email) {
    const byEmail = await getSubscriptionByEmail(email);
    if (
      byEmail &&
      (byEmail.status === 'active' || byEmail.status === 'past_due') &&
      isPlanId(byEmail.planId)
    ) {
      activeSub = byEmail;
      if (!byEmail.userId) {
        await linkSubscriptionToUser(email, userId).catch(() => undefined);
      }
    }
  }

  const targetPlan: PlanId =
    activeSub?.planId ??
    (profile?.planId && isPlanId(profile.planId) ? profile.planId : DEFAULT_PLAN_ID);

  const planDefaultLimit = await getConcurrencyLimitFromSettings(targetPlan);
  const planMismatch = profile?.planId !== targetPlan;
  const staleOverride =
    profile?.concurrencyOverride !== undefined &&
    profile.concurrencyOverride === planDefaultLimit;

  if (planMismatch || staleOverride) {
    await applyUserPlanAccess(userId, targetPlan);
  }

  return targetPlan;
}

export async function assignUserPlanByEmail(
  email: string,
  planId: PlanId,
  userId?: string
): Promise<{ userId: string; planId: PlanId }> {
  if (!isPlanId(planId)) {
    throw new Error('Invalid planId');
  }

  const normalized = normalizeEmail(email);
  let resolvedUserId = userId;

  if (!resolvedUserId) {
    const { getAuth } = await import('./firebase');
    const auth = getAuth();
    if (auth) {
      try {
        resolvedUserId = (await auth.getUserByEmail(normalized)).uid;
      } catch {
        // user may not exist yet
      }
    }
  }

  await upsertSubscriptionFromCheckout({ email: normalized, planId });
  if (resolvedUserId) {
    await linkSubscriptionToUser(normalized, resolvedUserId);
    await applyUserPlanAccess(resolvedUserId, planId);
    await upsertUserProfileEmail(resolvedUserId, normalized);
    return { userId: resolvedUserId, planId };
  }

  return { userId: '', planId };
}

async function upsertUserProfileEmail(userId: string, email: string): Promise<void> {
  const { upsertUserProfile } = await import('./users');
  await upsertUserProfile({ userId, email });
}

export async function getPlanSummaryForUser(userId: string) {
  const planId = await syncUserProfilePlan(userId);
  const concurrencyLimit = await getConcurrencyLimitForUser(userId);
  const plan = (await import('./plans')).PLANS[planId];
  const { getMaxOpenCyclesFromSettings } = await import('./adminSettings');
  const maxOpenCycles = await getMaxOpenCyclesFromSettings(planId);
  return {
    planId,
    planName: plan.name,
    concurrencyLimit,
    maxOpenCycles,
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

  let subscription: SubscriptionRecord | null = null;

  if (db && isFirebaseEnabled()) {
    const snap = await db
      .collection(COLLECTIONS.subscriptions)
      .where('stripeSubscriptionId', '==', stripeSubscriptionId)
      .limit(1)
      .get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      subscription = { id: doc.id, ...(doc.data() as Omit<SubscriptionRecord, 'id'>) };
      await update(COLLECTIONS.subscriptions, doc.id, {
        status: 'cancelled',
        updatedAt: now,
      });
    }
  } else {
    const { listAll } = await import('./storage');
    const all = await listAll<SubscriptionRecord>(COLLECTIONS.subscriptions);
    const match = all.find((s) => s.stripeSubscriptionId === stripeSubscriptionId);
    if (match) {
      subscription = match;
      await update(COLLECTIONS.subscriptions, match.id, {
        status: 'cancelled',
        updatedAt: now,
      });
    }
  }

  if (subscription?.userId) {
    await applyUserPlanAccess(subscription.userId, DEFAULT_PLAN_ID);
  } else if (subscription?.email) {
    const profileList = await findProfilesByEmail(subscription.email);
    await Promise.all(
      profileList.map((p) => applyUserPlanAccess(p.userId, DEFAULT_PLAN_ID))
    );
  }
}

async function findProfilesByEmail(email: string): Promise<UserProfile[]> {
  const normalized = normalizeEmail(email);
  const { listAll } = await import('./storage');
  const all = await listAll<UserProfile>(COLLECTIONS.userProfiles);
  return all.filter((p) => normalizeEmail(p.email ?? '') === normalized);
}

export async function syncProfileAfterSubscriptionEmail(email: string): Promise<void> {
  const sub = await getSubscriptionByEmail(email);
  const profiles = await findProfilesByEmail(email);
  for (const profile of profiles) {
    if (sub && (sub.status === 'active' || sub.status === 'past_due') && isPlanId(sub.planId)) {
      await applyUserPlanAccess(profile.userId, sub.planId);
    } else if (sub?.status === 'cancelled') {
      await applyUserPlanAccess(profile.userId, DEFAULT_PLAN_ID);
    } else {
      await syncUserProfilePlan(profile.userId);
    }
  }
}

export async function syncProfileAfterSubscriptionChange(stripeSubscriptionId: string): Promise<void> {
  const { listAll } = await import('./storage');
  const all = await listAll<SubscriptionRecord>(COLLECTIONS.subscriptions);
  const match = all.find((s) => s.stripeSubscriptionId === stripeSubscriptionId);
  if (!match) return;

  if (match.userId) {
    if (match.status === 'cancelled') {
      await applyUserPlanAccess(match.userId, DEFAULT_PLAN_ID);
    } else if (isPlanId(match.planId)) {
      await applyUserPlanAccess(match.userId, match.planId);
    }
    return;
  }

  if (match.email) {
    await syncProfileAfterSubscriptionEmail(match.email);
  }
}
