import { listAll, COLLECTIONS } from './storage';
import type { UserProfile } from './users';
import type { SubscriptionRecord } from './subscriptions';
import {
  listApiRequestLogs,
  aggregateRequestsByType,
  aggregateRequestsBySubject,
  getRequestTypeLabel,
} from './apiRequestLog';
import { getPlanSettings } from './adminSettings';

export async function getAdminDashboardData() {
  const [users, subscriptions, requestLogs, planSettings] = await Promise.all([
    listAll<UserProfile>(COLLECTIONS.userProfiles),
    listAll<SubscriptionRecord>(COLLECTIONS.subscriptions),
    listApiRequestLogs(1000),
    getPlanSettings(),
  ]);

  const subsByUserId = new Map<string, SubscriptionRecord>();
  for (const sub of subscriptions) {
    if (sub.userId) subsByUserId.set(sub.userId, sub);
  }

  const mergedUsers = users.map((u) => {
    const sub = subsByUserId.get(u.userId);
    return {
      ...u,
      planId: sub?.planId ?? u.planId ?? 'starter',
      subscriptionStatus: sub?.status ?? 'none',
      email: u.email || sub?.email || '—',
    };
  });

  for (const sub of subscriptions) {
    if (sub.userId && !mergedUsers.find((u) => u.userId === sub.userId)) {
      mergedUsers.push({
        id: sub.userId,
        userId: sub.userId,
        email: sub.email,
        planId: sub.planId,
        requestCount: 0,
        firstSeenAt: sub.createdAt,
        lastSeenAt: sub.updatedAt,
        subscriptionStatus: sub.status,
      });
    }
  }

  mergedUsers.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));

  const userLookup = new Map<string, { displayName?: string; email: string }>();
  for (const u of mergedUsers) {
    userLookup.set(u.userId, {
      displayName: u.displayName,
      email: u.email,
    });
  }

  function resolveUserName(userId: string): string {
    if (!userId || userId === 'demo-user') return 'Demo / visitante';
    const profile = userLookup.get(userId);
    if (profile?.displayName?.trim()) return profile.displayName.trim();
    if (profile?.email && profile.email !== '—') return profile.email;
    return 'Usuário sem nome';
  }

  const requestsByType = aggregateRequestsByType(requestLogs);
  const requestsBySubject = aggregateRequestsBySubject(requestLogs);

  const recentRequests = requestLogs.slice(0, 80).map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    userName: resolveUserName(r.userId),
    typeLabel: getRequestTypeLabel(r.requestType),
  }));

  const topRequestType = requestsByType[0] ?? null;
  const topSubject = requestsBySubject[0] ?? null;

  return {
    summary: {
      totalUsers: mergedUsers.length,
      totalRequests: requestLogs.length,
      activeSubscriptions: subscriptions.filter((s) => s.status === 'active').length,
      topRequestTypeLabel: topRequestType?.label ?? '—',
      topSubjectLabel: topSubject?.subject ?? '—',
    },
    users: mergedUsers,
    requestsByType,
    requestsBySubject,
    recentRequests,
    planSettings,
  };
}
