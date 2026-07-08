import type { UserProfile } from './users';
import type { SubscriptionRecord } from './subscriptions';
import { getPlanSettings } from './adminSettings';
import { PLANS, type PlanId, isPlanId } from './plans';

function resolvePlanIdForAdminRow(
  profile: UserProfile,
  sub: SubscriptionRecord | undefined
): PlanId {
  if (sub && (sub.status === 'active' || sub.status === 'past_due') && isPlanId(sub.planId)) {
    return sub.planId;
  }
  if (profile.planId && isPlanId(profile.planId)) {
    return profile.planId;
  }
  return 'starter';
}

export function getAdminMergedUsers(
  users: UserProfile[],
  subscriptions: SubscriptionRecord[],
  planSettings?: Awaited<ReturnType<typeof getPlanSettings>>
) {
  const settings = planSettings;
  const subsByUserId = new Map<string, SubscriptionRecord>();
  const subsByEmail = new Map<string, SubscriptionRecord>();
  for (const sub of subscriptions) {
    if (sub.userId) subsByUserId.set(sub.userId, sub);
    if (sub.email) subsByEmail.set(sub.email.trim().toLowerCase(), sub);
  }

  const mergedUsers = users.map((u) => {
    const sub =
      subsByUserId.get(u.userId) ??
      (u.email ? subsByEmail.get(u.email.trim().toLowerCase()) : undefined);
    const planId = resolvePlanIdForAdminRow(u, sub);
    const concurrencyLimit =
      u.concurrencyOverride !== undefined
        ? u.concurrencyOverride
        : (settings?.[planId]?.concurrencyLimit ?? PLANS[planId].concurrencyLimit);
    return {
      ...u,
      planId,
      concurrencyLimit,
      subscriptionStatus: sub?.status ?? 'none',
      email: u.email || sub?.email || '—',
    };
  });

  for (const sub of subscriptions) {
    if (sub.userId && !mergedUsers.find((u) => u.userId === sub.userId)) {
      const planId = sub.planId as PlanId;
      mergedUsers.push({
        id: sub.userId,
        userId: sub.userId,
        email: sub.email,
        planId,
        concurrencyLimit:
          settings?.[planId]?.concurrencyLimit ?? PLANS[planId].concurrencyLimit,
        requestCount: 0,
        firstSeenAt: sub.createdAt,
        lastSeenAt: sub.updatedAt,
        subscriptionStatus: sub.status,
      });
    }
  }

  mergedUsers.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  return mergedUsers;
}

export function resolveAdminUserName(
  userId: string,
  userLookup: Map<string, { displayName?: string; email: string }>
): string {
  if (!userId || userId === 'demo-user') return 'Demo / visitante';
  const profile = userLookup.get(userId);
  if (profile?.displayName?.trim()) return profile.displayName.trim();
  if (profile?.email && profile.email !== '—') return profile.email;
  return 'Usuário sem nome';
}
