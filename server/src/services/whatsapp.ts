import crypto from 'crypto';
import axios from 'axios';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

const GRAPH_API = 'https://graph.facebook.com/v21.0';

export function isWhatsAppConfigured(): boolean {
  return Boolean(env.whatsapp.token && env.whatsapp.phoneId);
}

/** Send text message via Meta Cloud API */
export async function sendWhatsAppMessage(to: string, text: string): Promise<{ messageId: string }> {
  const { token, phoneId } = env.whatsapp;

  if (!token || !phoneId) {
    throw new AppError(
      503,
      'WhatsApp not configured. Set WHATSAPP_TOKEN and WHATSAPP_PHONE_ID.',
      'WHATSAPP_NOT_CONFIGURED'
    );
  }

  const url = `${GRAPH_API}/${phoneId}/messages`;
  const response = await axios.post(
    url,
    {
      messaging_product: 'whatsapp',
      to: to.replace(/\D/g, ''),
      type: 'text',
      text: { body: text },
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  const messageId = response.data?.messages?.[0]?.id ?? 'unknown';
  return { messageId };
}

/** Webhook verification for Meta */
export function verifyWebhook(
  mode: string | undefined,
  token: string | undefined,
  challenge: string | undefined,
  verifyToken: string
): string | null {
  if (mode === 'subscribe' && token === verifyToken) {
    return challenge ?? null;
  }
  return null;
}

export function verifyWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  appSecret: string | undefined
): boolean {
  if (!appSecret) return true;
  if (!signatureHeader?.startsWith('sha256=')) return false;

  const expected = `sha256=${crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex')}`;

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(signatureHeader);
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

/** Parse incoming webhook payload (stub structure) */
export function parseIncomingMessage(body: unknown): {
  from?: string;
  text?: string;
  messageId?: string;
} | null {
  const data = body as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: Array<{
            from?: string;
            id?: string;
            text?: { body?: string };
          }>;
        };
      }>;
    }>;
  };

  const message = data?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) return null;

  return {
    from: message.from,
    text: message.text?.body,
    messageId: message.id,
  };
}
