import { create, getById, update, COLLECTIONS } from './storage';
import { nowIso } from '../utils/id';
import type { PlanId } from './plans';

export interface UserProfile {
  id: string;
  userId: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  planId?: PlanId;
  /** Se definido, sobrescreve o limite do plano (null = ilimitado). */
  concurrencyOverride?: number | null;
  requestCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export async function upsertUserProfile(data: {
  userId: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  planId?: PlanId;
  concurrencyOverride?: number | null;
}): Promise<UserProfile> {
  if (!data.userId || data.userId === 'demo-user') {
    throw new Error('Invalid userId for profile');
  }

  const now = nowIso();
  const existing = await getById<UserProfile>(COLLECTIONS.userProfiles, data.userId);

  const record: Omit<UserProfile, 'id'> = {
    userId: data.userId,
    email: data.email?.trim().toLowerCase() ?? existing?.email ?? '',
    displayName: data.displayName ?? existing?.displayName,
    photoURL: data.photoURL ?? existing?.photoURL,
    planId: data.planId ?? existing?.planId,
    concurrencyOverride:
      data.concurrencyOverride !== undefined
        ? data.concurrencyOverride
        : existing?.concurrencyOverride,
    requestCount: existing?.requestCount ?? 0,
    firstSeenAt: existing?.firstSeenAt ?? now,
    lastSeenAt: now,
  };

  if (existing) {
    await update(COLLECTIONS.userProfiles, data.userId, record);
    return { id: data.userId, ...record };
  }

  await create(COLLECTIONS.userProfiles, data.userId, record as Record<string, unknown>);
  return { id: data.userId, ...record };
}

export async function incrementUserRequestCount(userId: string): Promise<void> {
  if (!userId || userId === 'demo-user') return;
  const existing = await getById<UserProfile>(COLLECTIONS.userProfiles, userId);
  if (!existing) {
    await upsertUserProfile({ userId, email: '' });
    const again = await getById<UserProfile>(COLLECTIONS.userProfiles, userId);
    if (again) {
      await update(COLLECTIONS.userProfiles, userId, {
        requestCount: 1,
        lastSeenAt: nowIso(),
      });
    }
    return;
  }
  await update(COLLECTIONS.userProfiles, userId, {
    requestCount: (existing.requestCount ?? 0) + 1,
    lastSeenAt: nowIso(),
  });
}
