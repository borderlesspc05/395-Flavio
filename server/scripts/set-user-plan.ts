/**
 * Atribui plano a um usuário existente pelo email.
 * Uso: npm run set:user-plan --prefix server -- lucas@email.com premium
 */
import path from 'path';
import dotenv from 'dotenv';
import { initFirebase, getAuth, isFirebaseEnabled } from '../src/services/firebase';
import {
  assignUserPlanByEmail,
  getPlanSummaryForUser,
} from '../src/services/subscriptions';
import { isPlanId, type PlanId } from '../src/services/plans';

const serverEnvPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: serverEnvPath, override: true });
dotenv.config();

async function main() {
  const email = (process.argv[2] ?? 'lucas@email.com').trim().toLowerCase();
  const planArg = (process.argv[3] ?? 'premium').trim().toLowerCase();

  if (!isPlanId(planArg)) {
    console.error('Plano inválido. Use: starter | advanced | premium');
    process.exit(1);
  }
  const planId = planArg as PlanId;

  initFirebase();
  const auth = getAuth();
  if (!auth) {
    console.error('Firebase não configurado em server/.env');
    process.exit(1);
  }

  console.log(`Storage: ${isFirebaseEnabled() ? 'firestore' : 'memória (sem credenciais)'}`);

  let userId: string;
  try {
    userId = (await auth.getUserByEmail(email)).uid;
    console.log(`Usuário encontrado: ${email} (uid: ${userId})`);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/user-not-found') {
      console.error(`Usuário não encontrado no Firebase Auth: ${email}`);
      process.exit(1);
    }
    throw err;
  }

  await assignUserPlanByEmail(email, planId, userId);
  const summary = await getPlanSummaryForUser(userId);

  console.log('Plano aplicado com sucesso:');
  console.log(`  Email: ${email}`);
  console.log(`  UID: ${userId}`);
  console.log(`  Plano: ${summary.planName} (${summary.planId})`);
  console.log(
    `  Concorrência: ${summary.concurrencyLimit === null ? 'ilimitada' : summary.concurrencyLimit}`
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
