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
  clearConcurrencyOverride?: boolean;
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
    requestCount: existing?.requestCount ?? 0,
    firstSeenAt: existing?.firstSeenAt ?? now,
    lastSeenAt: now,
  };

  if (data.clearConcurrencyOverride) {
    // omit — field removed below when persisting
  } else if (data.concurrencyOverride !== undefined) {
    record.concurrencyOverride = data.concurrencyOverride;
  } else if (existing?.concurrencyOverride !== undefined) {
    record.concurrencyOverride = existing.concurrencyOverride;
  }

  if (existing) {
    if (data.clearConcurrencyOverride) {
      await clearConcurrencyOverrideField(data.userId, record);
      return { id: data.userId, ...record };
    }
    await update(COLLECTIONS.userProfiles, data.userId, record);
    return { id: data.userId, ...record };
  }

  await create(COLLECTIONS.userProfiles, data.userId, record as Record<string, unknown>);
  return { id: data.userId, ...record };
}

/** Aplica plano ao perfil; por padrão remove override para o limite vir do plano. */
export async function applyUserPlanAccess(
  userId: string,
  planId: PlanId,
  options?: {
    concurrencyOverride?: number | null;
    keepOverride?: boolean;
    email?: string;
    displayName?: string;
  }
): Promise<UserProfile> {
  const existing = await getById<UserProfile>(COLLECTIONS.userProfiles, userId);
  const patch: Parameters<typeof upsertUserProfile>[0] = {
    userId,
    email: options?.email ?? existing?.email,
    displayName: options?.displayName ?? existing?.displayName,
    photoURL: existing?.photoURL,
    planId,
  };

  if (options?.concurrencyOverride !== undefined) {
    patch.concurrencyOverride = options.concurrencyOverride;
  } else if (!options?.keepOverride) {
    patch.clearConcurrencyOverride = true;
  }

  return upsertUserProfile(patch);
}

async function clearConcurrencyOverrideField(
  userId: string,
  baseRecord: Omit<UserProfile, 'id'>
): Promise<void> {
  const { concurrencyOverride: _removed, ...withoutOverride } = baseRecord as UserProfile;
  const { getFirestore, isFirebaseEnabled } = await import('./firebase');
  const db = getFirestore();

  if (db && isFirebaseEnabled()) {
    const admin = await import('firebase-admin');
    await db.collection(COLLECTIONS.userProfiles).doc(userId).set(
      {
        ...withoutOverride,
        concurrencyOverride: admin.firestore.FieldValue.delete(),
      },
      { merge: true }
    );
    return;
  }

  await update(COLLECTIONS.userProfiles, userId, withoutOverride as Partial<UserProfile>);
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
