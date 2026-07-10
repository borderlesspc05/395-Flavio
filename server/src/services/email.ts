import axios from 'axios';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  ok: boolean;
  demoMode: boolean;
  preview?: string;
}

export function isEmailConfigured(): boolean {
  return Boolean(env.email.resendApiKey || env.email.smtpHost);
}

/** Remetente padrão do Resend — só permite enviar ao e-mail da conta até verificar um domínio. */
export function isResendSandboxFrom(from: string = env.email.from): boolean {
  const lower = from.toLowerCase();
  return lower.includes('onboarding@resend.dev') || /@resend\.dev\s*>/.test(lower);
}

function sandboxRecipientError(): AppError {
  const fromHint = isResendSandboxFrom()
    ? 'EMAIL_FROM não está definido e o servidor usa onboarding@resend.dev (modo teste do Resend).'
    : `EMAIL_FROM está definido como "${env.email.from}", que não permite envio livre.`;
  const devHint =
    env.nodeEnv === 'development'
      ? ' Em desenvolvimento, defina RESEND_TEST_RECIPIENT com o e-mail da sua conta Resend para testar sem verificar domínio.'
      : '';
  return new AppError(
    403,
    `${fromHint} Verifique um domínio em resend.com/domains e defina EMAIL_FROM (ex.: Magnus Mind <noreply@seudominio.com>).${devHint}`,
    'EMAIL_RECIPIENT_FORBIDDEN'
  );
}

function mapResendError(err: unknown): AppError {
  if (!axios.isAxiosError(err)) {
    return new AppError(502, 'Falha ao enviar e-mail. Tente novamente.', 'EMAIL_SEND_FAILED');
  }

  const status = err.response?.status;
  const body = err.response?.data as { message?: string; name?: string } | undefined;
  const bodyMsg = typeof body?.message === 'string' ? body.message.trim() : '';
  const msg = bodyMsg || err.message;
  const lower = msg.toLowerCase();

  if (
    status === 401 ||
    lower.includes('invalid api key') ||
    lower.includes('not authorized') ||
    lower.includes('missing authorization')
  ) {
    return new AppError(
      503,
      'Provedor de e-mail não configurado corretamente. Defina RESEND_API_KEY válida no servidor.',
      'EMAIL_NOT_CONFIGURED'
    );
  }

  if (status === 403) {
    if (
      lower.includes('only send') ||
      lower.includes('testing emails') ||
      lower.includes('verify a domain') ||
      lower.includes('recipient')
    ) {
      return sandboxRecipientError();
    }
    if (lower.includes('domain') || lower.includes('from address')) {
      return new AppError(
        403,
        'O remetente (EMAIL_FROM) usa um domínio não verificado no Resend. Verifique o domínio em resend.com/domains.',
        'EMAIL_DOMAIN_NOT_VERIFIED'
      );
    }
    return new AppError(
      403,
      'Envio recusado pelo Resend. Verifique RESEND_API_KEY, EMAIL_FROM e se o domínio do remetente está verificado.',
      'EMAIL_FORBIDDEN'
    );
  }

  if (status === 422) {
    return new AppError(
      400,
      bodyMsg || 'Endereço de e-mail inválido ou rejeitado pelo provedor.',
      'EMAIL_INVALID'
    );
  }

  return new AppError(
    502,
    bodyMsg ? `Falha ao enviar e-mail: ${bodyMsg}` : 'Falha ao enviar e-mail. Tente novamente.',
    'EMAIL_SEND_FAILED'
  );
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  let to = input.to.trim();
  let subject = input.subject;
  let html = input.html;
  const text =
    input.text ?? input.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  if (env.email.resendApiKey) {
    const sandboxFrom = isResendSandboxFrom();
    const testRecipient = env.email.testRecipient?.trim();

    if (sandboxFrom && testRecipient && env.nodeEnv === 'development') {
      if (to.toLowerCase() !== testRecipient.toLowerCase()) {
        subject = `[DEV → ${to}] ${subject}`;
        html = `<p style="color:#666;font-size:13px;margin:0 0 16px">Em desenvolvimento: este e-mail seria enviado para <strong>${to}</strong>.</p>${html}`;
        to = testRecipient;
      }
    } else if (sandboxFrom && env.nodeEnv === 'development' && !testRecipient) {
      console.warn(
        '[email:resend] EMAIL_FROM usa sandbox (onboarding@resend.dev). Defina EMAIL_FROM com domínio verificado ou RESEND_TEST_RECIPIENT para testes locais.'
      );
    }

    try {
      await axios.post(
        'https://api.resend.com/emails',
        {
          from: env.email.from,
          to: [to],
          subject,
          html,
          text,
        },
        {
          headers: {
            Authorization: `Bearer ${env.email.resendApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );
      return { ok: true, demoMode: false };
    } catch (err) {
      console.error('[email:resend]', err instanceof Error ? err.message : err);
      throw mapResendError(err);
    }
  }

  if (env.email.smtpHost) {
    // SMTP via nodemailer would go here — for now log and simulate if only host set without full SMTP lib
    console.info('[email:smtp-stub]', input.to, input.subject);
    return { ok: true, demoMode: true, preview: text.slice(0, 500) };
  }

  console.info('[email:demo]', input.to, input.subject, text.slice(0, 280));
  return { ok: true, demoMode: true, preview: text };
}
