import { Router, Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { RateLimiter } from '../utils/rateLimiter';
import { getClientIp } from '../utils/clientIp';
import { sendPasswordResetEmail } from '../services/passwordReset';

const router = Router();

const ipLimiter = new RateLimiter(
  env.passwordReset.ipMax,
  env.passwordReset.ipWindowMs
);
const emailLimiter = new RateLimiter(
  env.passwordReset.emailMax,
  env.passwordReset.emailWindowMs
);

const GENERIC_OK =
  'Se existir uma conta com este email, enviamos um link para redefinir sua senha. Confira a caixa de entrada e o spam.';

function normalizeEmailInput(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().toLowerCase();
}

function assertRateLimit(
  result: ReturnType<RateLimiter['consume']>,
  message: string
): void {
  if (!result.allowed) {
    throw new AppError(429, message, 'RATE_LIMITED', result.retryAfterSeconds);
  }
}

router.post('/password-reset', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = normalizeEmailInput(req.body?.email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError(400, 'Informe um email válido.');
    }

    const ip = getClientIp(req);

    assertRateLimit(
      ipLimiter.consume(`ip:${ip}`),
      `Muitas tentativas deste dispositivo. Aguarde ${Math.ceil(env.passwordReset.ipWindowMs / 60000)} minutos e tente novamente.`
    );

    assertRateLimit(
      emailLimiter.consume(`email:${email}`),
      `Este email já recebeu solicitações recentes. Aguarde cerca de ${Math.ceil(env.passwordReset.emailWindowMs / 60000)} minutos antes de pedir novamente.`
    );

    await sendPasswordResetEmail(email);

    res.json({ ok: true, message: GENERIC_OK });
  } catch (err) {
    next(err);
  }
});

export default router;
