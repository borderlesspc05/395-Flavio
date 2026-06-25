import { listAll, COLLECTIONS } from './storage';
import type { UserProfile } from './users';
import type { SubscriptionRecord } from './subscriptions';
import {
  listApiRequestLogs,
  aggregateRequestsByType,
  aggregateRequestsBySubject,
  aggregateRequestsByDay,
  aggregateRequestHealth,
} from './apiRequestLog';
import { getPlanSettings } from './adminSettings';
import { getAdminClientAnalytics, type AdminClientAnalytics } from './adminAnalytics';
import { getAdminMergedUsers } from './adminUserLookup';

const EMPTY_ANALYTICS: AdminClientAnalytics = {
  diagnostics: {
    formsTotal: 0,
    formsCompleted: 0,
    formsWithChallenge: 0,
    cyclesTotal: 0,
    cyclesActive: 0,
    cyclesArchived: 0,
    gatePathA: 0,
    gatePathB: 0,
    gateSkipped: 0,
  },
  businessStages: [],
  challengeCategories: [],
  problemNature: [],
  recentChallenges: [],
};

async function safeLoad<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.warn(`[adminDashboard] ${label} falhou:`, err);
    return fallback;
  }
}

export async function getAdminDashboardData() {
  const [users, subscriptions, requestLogs, planSettings, clientAnalytics] = await Promise.all([
    safeLoad('userProfiles', () => listAll<UserProfile>(COLLECTIONS.userProfiles), []),
    safeLoad('subscriptions', () => listAll<SubscriptionRecord>(COLLECTIONS.subscriptions), []),
    safeLoad('requestLogs', () => listApiRequestLogs(3000), []),
    safeLoad('planSettings', () => getPlanSettings(), {
      starter: { name: 'Starter', priceLabel: '', priceCents: 0, concurrencyLimit: 1 },
      advanced: { name: 'Advanced', priceLabel: '', priceCents: 0, concurrencyLimit: 3 },
      premium: { name: 'Premium', priceLabel: '', priceCents: 0, concurrencyLimit: null },
    } as Awaited<ReturnType<typeof getPlanSettings>>),
    safeLoad('clientAnalytics', () => getAdminClientAnalytics(), EMPTY_ANALYTICS),
  ]);

  const mergedUsers = getAdminMergedUsers(users, subscriptions, planSettings);

  const requestsByType = aggregateRequestsByType(requestLogs);
  const requestsBySubject = aggregateRequestsBySubject(requestLogs);
  const requestsByDay = aggregateRequestsByDay(requestLogs);
  const requestHealth = aggregateRequestHealth(requestLogs);

  const topRequestType = requestsByType[0] ?? null;
  const topSubject = requestsBySubject[0] ?? null;
  const topChallenge = clientAnalytics.challengeCategories[0] ?? null;

  return {
    summary: {
      totalUsers: mergedUsers.length,
      totalRequests: requestLogs.length,
      activeSubscriptions: subscriptions.filter((s) => s.status === 'active').length,
      topRequestTypeLabel: topRequestType?.label ?? '—',
      topSubjectLabel: topSubject?.subject ?? '—',
      diagnosticsCompleted: clientAnalytics.diagnostics.formsCompleted,
      topChallengeCategory: topChallenge?.label ?? '—',
      errorRatePercent: requestHealth.errorRatePercent,
      avgDurationMs: requestHealth.avgDurationMs,
    },
    users: mergedUsers,
    requestsByType,
    requestsBySubject,
    requestsByDay,
    requestHealth,
    clientAnalytics,
    planSettings,
  };
}
