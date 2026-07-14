import { Router, Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { env } from '../config/env';
import { sendWeeklyBriefsToAllLeaders } from '../services/weeklyBrief';

const router = Router();

function requireCronSecret(req: Request): void {
  const secret = env.cronSecret;
  if (!secret) {
    throw new AppError(503, 'CRON_SECRET não configurado no servidor.');
  }
  const header = req.headers.authorization;
  const bearer = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const fromQuery = typeof req.query.secret === 'string' ? req.query.secret : '';
  if (bearer !== secret && fromQuery !== secret) {
    throw new AppError(401, 'Cron secret inválido.');
  }
}

/** Segunda-feira: dispara Sprint Weekly Brief para líderes com e-mail no perfil. */
router.post('/weekly-brief', async (req: Request, res: Response, next: NextFunction) => {
  try {
    requireCronSecret(req);
    const result = await sendWeeklyBriefsToAllLeaders();
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
