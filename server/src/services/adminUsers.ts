import { AppError } from '../utils/errors';
import {
  isPlanId,
  isDefaultConcurrencyForPlan,
  parseConcurrencyInput,
  type PlanId,
} from './plans';
import { getAuth } from './firebase';
import { applyUserPlanAccess, upsertUserProfile } from './users';
import { linkSubscriptionToUser, setSubscriptionPlanForEmail } from './subscriptions';
import { getConcurrencyLimitFromSettings } from './adminSettings';
import { getById, COLLECTIONS } from './storage';
import type { UserProfile } from './users';

/** Só retorna override quando o admin definiu limite diferente do padrão do plano. */
async function resolveAdminConcurrencyOverride(
  planId: PlanId,
  raw: unknown | undefined
): Promise<number | null | undefined> {
  const parsed = parseConcurrencyInput(raw);
  if (parsed === undefined) return undefined;

  const planDefault = await getConcurrencyLimitFromSettings(planId);
  if (isDefaultConcurrencyForPlan(planId, parsed) || parsed === planDefault) {
    return undefined;
  }
  return parsed;
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
  const customOverride = await resolveAdminConcurrencyOverride(planId, input.concurrencyLimit);
  const effectiveLimit = await getConcurrencyLimitFromSettings(planId);

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

  await setSubscriptionPlanForEmail(email, planId, userId);

  if (customOverride !== undefined) {
    await applyUserPlanAccess(userId, planId, {
      email,
      displayName: input.displayName?.trim(),
      concurrencyOverride: customOverride,
    });
  } else {
    await applyUserPlanAccess(userId, planId, {
      email,
      displayName: input.displayName?.trim(),
    });
  }

  return {
    userId,
    email,
    planId,
    concurrencyLimit: customOverride !== undefined ? customOverride : effectiveLimit,
  };
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

  const customOverride = await resolveAdminConcurrencyOverride(planId, input.concurrencyLimit);

  await setSubscriptionPlanForEmail(profile.email, planId, userId);

  if (customOverride !== undefined) {
    await applyUserPlanAccess(userId, planId, { concurrencyOverride: customOverride });
  } else {
    await applyUserPlanAccess(userId, planId);
  }

  const effectiveLimit =
    customOverride !== undefined
      ? customOverride
      : await getConcurrencyLimitFromSettings(planId);

  return { userId, planId, concurrencyLimit: effectiveLimit };
}
