import { Router, Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { requireAdmin } from '../middleware/adminAuth';
import {
  isWhatsAppConfigured,
  sendWhatsAppMessage,
  verifyWebhook,
  verifyWebhookSignature,
  parseIncomingMessage,
} from '../services/whatsapp';
import { AppError } from '../utils/errors';

const router = Router();

router.get('/status', requireAdmin, (_req: Request, res: Response) => {
  res.json({
    configured: isWhatsAppConfigured(),
    phoneId: process.env.WHATSAPP_PHONE_ID ? '***set***' : null,
  });
});

/** Meta webhook verification */
router.get('/webhook', (req: Request, res: Response) => {
  if (!env.whatsapp.verifyToken) {
    res.status(503).send('Webhook verify token not configured');
    return;
  }

  const mode = req.query['hub.mode'] as string | undefined;
  const token = req.query['hub.verify_token'] as string | undefined;
  const challenge = req.query['hub.challenge'] as string | undefined;

  const result = verifyWebhook(mode, token, challenge, env.whatsapp.verifyToken);
  if (result) {
    res.status(200).send(result);
    return;
  }
  res.status(403).send('Forbidden');
});

/** Incoming messages (stub — log and acknowledge) */
router.post('/webhook', (req: Request, res: Response) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
  const signature = req.headers['x-hub-signature-256'];
  const signatureHeader = typeof signature === 'string' ? signature : undefined;

  if (!verifyWebhookSignature(rawBody, signatureHeader, env.whatsapp.appSecret)) {
    res.status(403).json({ error: 'Invalid webhook signature' });
    return;
  }

  let parsedBody: unknown = req.body;
  if (Buffer.isBuffer(req.body)) {
    try {
      parsedBody = JSON.parse(req.body.toString('utf8'));
    } catch {
      res.status(400).json({ error: 'Invalid webhook payload' });
      return;
    }
  }

  const incoming = parseIncomingMessage(parsedBody);
  if (incoming) {
    console.log('[whatsapp] incoming:', incoming.from, incoming.text?.slice(0, 80));
  }
  res.status(200).json({ success: true });
});

router.post('/send', requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      throw new AppError(400, 'to and message are required');
    }

    const result = await sendWhatsAppMessage(String(to), String(message));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
