import axios from 'axios';
import { env } from '../config/env';
import { getAuth } from './firebase';
import { sendEmail } from './email';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function userExists(email: string): Promise<boolean> {
  const auth = getAuth();
  if (!auth) return true;
  try {
    await auth.getUserByEmail(email);
    return true;
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code?: string }).code)
        : '';
    if (code === 'auth/user-not-found') return false;
    throw err;
  }
}

async function sendViaIdentityToolkit(email: string): Promise<void> {
  const apiKey = env.firebase.webApiKey;
  if (!apiKey) {
    throw new Error('FIREBASE_WEB_API_KEY não configurada.');
  }

  await axios.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`,
    {
      requestType: 'PASSWORD_RESET',
      email,
      continueUrl: `${env.frontendUrl.replace(/\/$/, '')}/login`,
    },
    { timeout: 15000 }
  );
}

async function sendViaAdminLink(email: string): Promise<void> {
  const auth = getAuth();
  if (!auth) {
    throw new Error('Firebase Admin indisponível.');
  }

  const link = await auth.generatePasswordResetLink(email, {
    url: `${env.frontendUrl.replace(/\/$/, '')}/login`,
    handleCodeInApp: false,
  });

  await sendEmail({
    to: email,
    subject: 'Redefinir senha — Magnus Mind',
    html: `
      <p>Recebemos um pedido para redefinir a senha da sua conta Magnus Mind.</p>
      <p><a href="${link}">Clique aqui para criar uma nova senha</a></p>
      <p>Se você não solicitou isso, ignore este email.</p>
    `,
    text: `Redefina sua senha em: ${link}`,
  });
}

/** Dispara email de recuperação sem revelar se o usuário existe. */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes('@')) return;

  const exists = await userExists(normalized);
  if (!exists) return;

  try {
    if (env.firebase.webApiKey) {
      await sendViaIdentityToolkit(normalized);
      return;
    }
    await sendViaAdminLink(normalized);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const lower = message.toLowerCase();
    if (lower.includes('email_not_found') || lower.includes('user not found')) {
      return;
    }
    console.error('[password-reset] falha ao enviar:', message);
    throw err;
  }
}
