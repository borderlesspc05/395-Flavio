import { AppError } from '../utils/errors';
import { isPlanId, type PlanId } from './plans';
import { getAuth } from './firebase';
import { upsertUserProfile } from './users';
import { linkSubscriptionToUser, setSubscriptionPlanForEmail } from './subscriptions';
import { getConcurrencyLimitFromSettings } from './adminSettings';
import { getById, update, COLLECTIONS } from './storage';
import type { UserProfile } from './users';

async function resolveConcurrency(
  planId: PlanId,
  raw: unknown | undefined
): Promise<number | null | undefined> {
  if (raw === undefined) return undefined;
  if (raw === null || raw === 'unlimited' || raw === '') return null;
  if (typeof raw === 'number' && raw > 0) return Math.floor(raw);
  if (typeof raw === 'string') {
    const trimmed = raw.trim().toLowerCase();
    if (trimmed === '' || trimmed === 'unlimited' || trimmed === 'ilimitado') return null;
    const n = Number(trimmed);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return getConcurrencyLimitFromSettings(planId);
}

export async function adminCreateUser(input: {
  email: string;
  password: string;
  displayName?: string;
  planId: string;
  concurrencyLimit?: number | null | string;
}): Promise<{ userId: string; email: string; planId: PlanId; concurrencyLimit: number | null }> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  if (!email || !password) {
    throw new AppError(400, 'Email e senha são obrigatórios.');
  }
  if (!isPlanId(input.planId)) {
    throw new AppError(400, 'Plano inválido. Use starter, advanced ou premium.');
  }

  const auth = getAuth();
  if (!auth) {
    throw new AppError(503, 'Firebase não configurado — não é possível criar usuários pelo admin.');
  }

  const planId = input.planId;
  const concurrencyLimit = await resolveConcurrency(planId, input.concurrencyLimit);
  const defaultLimit = await getConcurrencyLimitFromSettings(planId);
  const effectiveLimit = concurrencyLimit !== undefined ? concurrencyLimit : defaultLimit;

  let userId: string;
  try {
    const user = await auth.createUser({
      email,
      password,
      displayName: input.displayName?.trim() || undefined,
      emailVerified: true,
    });
    userId = user.uid;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/email-already-exists') {
      throw new AppError(409, 'Já existe uma conta com este email.');
    }
    throw new AppError(500, 'Não foi possível criar o usuário no Firebase.');
  }

  await upsertUserProfile({
    userId,
    email,
    displayName: input.displayName?.trim(),
    planId,
    concurrencyOverride: effectiveLimit,
  });
  await setSubscriptionPlanForEmail(email, planId, userId);

  return { userId, email, planId, concurrencyLimit: effectiveLimit };
}

export async function adminUpdateUserAccess(
  userId: string,
  input: { planId?: string; concurrencyLimit?: number | null | string }
): Promise<{ userId: string; planId: PlanId; concurrencyLimit: number | null }> {
  const profile = await getById<UserProfile>(COLLECTIONS.userProfiles, userId);
  if (!profile?.email) {
    throw new AppError(404, 'Usuário não encontrado.');
  }

  const planId = input.planId && isPlanId(input.planId) ? input.planId : profile.planId ?? 'starter';
  if (input.planId && !isPlanId(input.planId)) {
    throw new AppError(400, 'Plano inválido.');
  }

  const concurrencyPatch = await resolveConcurrency(planId, input.concurrencyLimit);
  const effectiveLimit =
    concurrencyPatch !== undefined
      ? concurrencyPatch
      : profile.concurrencyOverride !== undefined
        ? profile.concurrencyOverride
        : await getConcurrencyLimitFromSettings(planId);

  await setSubscriptionPlanForEmail(profile.email, planId, userId);
  await update(COLLECTIONS.userProfiles, userId, {
    planId,
    concurrencyOverride: effectiveLimit,
    lastSeenAt: new Date().toISOString(),
  });

  return { userId, planId, concurrencyLimit: effectiveLimit };
}
