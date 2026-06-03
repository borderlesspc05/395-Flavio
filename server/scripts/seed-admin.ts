/**
 * Cria ou atualiza o usuário admin no Firebase Auth.
 * Uso: npm run seed:admin --prefix server
 */
import path from 'path';
import dotenv from 'dotenv';
import admin from 'firebase-admin';

const serverEnvPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: serverEnvPath, override: true });
dotenv.config();

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? 'admin@gmail.com').trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '123456';

function normalizePrivateKey(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n');
}

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    console.error(
      'Configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY em server/.env'
    );
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });

  try {
    const existing = await admin.auth().getUserByEmail(ADMIN_EMAIL);
    await admin.auth().updateUser(existing.uid, {
      password: ADMIN_PASSWORD,
      displayName: 'Admin Magnus Mind',
    });
    console.log(`Admin atualizado: ${ADMIN_EMAIL} (uid: ${existing.uid})`);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/user-not-found') {
      const user = await admin.auth().createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        displayName: 'Admin Magnus Mind',
        emailVerified: true,
      });
      console.log(`Admin criado: ${ADMIN_EMAIL} (uid: ${user.uid})`);
    } else {
      throw err;
    }
  }

  console.log('Senha:', ADMIN_PASSWORD);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
