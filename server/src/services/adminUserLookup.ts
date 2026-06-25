import type { UserProfile } from './users';
import type { SubscriptionRecord } from './subscriptions';
import { getPlanSettings } from './adminSettings';
import { PLANS, type PlanId } from './plans';

export function getAdminMergedUsers(
  users: UserProfile[],
  subscriptions: SubscriptionRecord[],
  planSettings?: Awaited<ReturnType<typeof getPlanSettings>>
) {
  const settings = planSettings;
  const subsByUserId = new Map<string, SubscriptionRecord>();
  for (const sub of subscriptions) {
    if (sub.userId) subsByUserId.set(sub.userId, sub);
  }

  const mergedUsers = users.map((u) => {
    const sub = subsByUserId.get(u.userId);
    const planId = (sub?.planId ?? u.planId ?? 'starter') as PlanId;
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
