/**
 * Cria 3 contas de teste (starter / advanced / premium) com senha 123456.
 * Uso: npx tsx scripts/seed-test-plans.ts
 */
import path from 'path';
import dotenv from 'dotenv';
import { initFirebase, getAuth, isFirebaseEnabled } from '../src/services/firebase';
import { assignUserPlanByEmail, getPlanSummaryForUser } from '../src/services/subscriptions';
import type { PlanId } from '../src/services/plans';

const serverEnvPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: serverEnvPath, override: true });
dotenv.config();

const PASSWORD = '123456';

const ACCOUNTS: { email: string; planId: PlanId; displayName: string }[] = [
  { email: 'starter@email.com', planId: 'starter', displayName: 'Test Starter' },
  { email: 'advanced@email.com', planId: 'advanced', displayName: 'Test Advanced' },
  { email: 'premium@email.com', planId: 'premium', displayName: 'Test Premium' },
];

async function ensureUser(email: string, displayName: string) {
  const auth = getAuth();
  if (!auth) throw new Error('Firebase Auth indisponível');

  try {
    const existing = await auth.getUserByEmail(email);
    await auth.updateUser(existing.uid, {
      password: PASSWORD,
      displayName,
      emailVerified: true,
    });
    return { uid: existing.uid, created: false };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code !== 'auth/user-not-found') throw err;
    const user = await auth.createUser({
      email,
      password: PASSWORD,
      displayName,
      emailVerified: true,
    });
    return { uid: user.uid, created: true };
  }
}

async function main() {
  initFirebase();
  console.log(`Storage: ${isFirebaseEnabled() ? 'firestore' : 'memória'}`);

  for (const account of ACCOUNTS) {
    const { uid, created } = await ensureUser(account.email, account.displayName);
    await assignUserPlanByEmail(account.email, account.planId, uid);
    const summary = await getPlanSummaryForUser(uid);
    console.log(
      `${created ? 'CRIADO' : 'ATUALIZADO'} | ${account.email} | uid=${uid} | plano=${summary.planId} (${summary.planName})`
    );
  }

  console.log(`Senha de todas: ${PASSWORD}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
