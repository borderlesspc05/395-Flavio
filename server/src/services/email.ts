import axios from 'axios';
import { env } from '../config/env';

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

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const text = input.text ?? input.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  if (env.email.resendApiKey) {
    await axios.post(
      'https://api.resend.com/emails',
      {
        from: env.email.from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
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
  }

  if (env.email.smtpHost) {
    // SMTP via nodemailer would go here — for now log and simulate if only host set without full SMTP lib
    console.info('[email:smtp-stub]', input.to, input.subject);
    return { ok: true, demoMode: true, preview: text.slice(0, 500) };
  }

  console.info('[email:demo]', input.to, input.subject, text.slice(0, 280));
  return { ok: true, demoMode: true, preview: text };
}
