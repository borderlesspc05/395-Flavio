import { listAll, COLLECTIONS } from './storage';
import type { UserProfile } from './users';
import type { SubscriptionRecord } from './subscriptions';
import {
  filterApiRequestLogs,
  getRequestTypeLabel,
  listApiRequestLogs,
  paginateApiRequestLogs,
  aggregateRequestsByType,
  type ApiRequestLogQuery,
} from './apiRequestLog';
import { getAdminMergedUsers, resolveAdminUserName } from './adminUserLookup';

export async function getAdminRequestLogsPage(query: ApiRequestLogQuery) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);

  let logs = await listApiRequestLogs(0);

  let users: UserProfile[] = [];
  let subscriptions: SubscriptionRecord[] = [];
  try {
    [users, subscriptions] = await Promise.all([
      listAll<UserProfile>(COLLECTIONS.userProfiles),
      listAll<SubscriptionRecord>(COLLECTIONS.subscriptions),
    ]);
  } catch (err) {
    console.warn('[adminRequestLogs] user lookup falhou:', err);
  }

  const mergedUsers = getAdminMergedUsers(users, subscriptions);
  const userLookup = new Map(
    mergedUsers.map((u) => [u.userId, { displayName: u.displayName, email: u.email }])
  );

  const filtered = filterApiRequestLogs(logs, query);
  const paged = paginateApiRequestLogs(filtered, page, limit);

  const typeOptions = aggregateRequestsByType(logs).map((t) => ({
    type: t.type,
    label: t.label,
    count: t.count,
  }));

  return {
    items: paged.items.map((r) => ({
      id: r.id,
      userId: r.userId,
      createdAt: r.createdAt,
      userName: resolveAdminUserName(r.userId, userLookup),
      type: r.requestType,
      typeLabel: getRequestTypeLabel(r.requestType),
      statusCode: r.statusCode,
      durationMs: r.durationMs,
      path: r.path,
      method: r.method,
    })),
    total: paged.total,
    page: paged.page,
    limit: paged.limit,
    totalPages: paged.totalPages,
    typeOptions,
  };
}
