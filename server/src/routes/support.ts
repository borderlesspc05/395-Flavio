import { Router, Request, Response, NextFunction } from 'express';
import {
  appendUserMessage,
  getOrCreateTicket,
  getTicketForUser,
  markReadByUser,
} from '../services/supportChat';
import { AppError } from '../utils/errors';

const router = Router();

router.get('/thread', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.query.userId as string | undefined;
    if (!userId || userId === 'demo-user') {
      throw new AppError(401, 'Faça login para falar com o suporte.');
    }

    const userEmail = typeof req.query.userEmail === 'string' ? req.query.userEmail : undefined;
    const userDisplayName =
      typeof req.query.userDisplayName === 'string' ? req.query.userDisplayName : undefined;

    const ticket =
      (await getTicketForUser(userId)) ??
      (await getOrCreateTicket(userId, { userEmail, userDisplayName }));

    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

router.post('/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.body?.userId as string) || req.userId;
    if (!userId || userId === 'demo-user') {
      throw new AppError(401, 'Faça login para falar com o suporte.');
    }

    const body = String(req.body?.body ?? '');
    const userEmail = typeof req.body?.userEmail === 'string' ? req.body.userEmail : undefined;
    const userDisplayName =
      typeof req.body?.userDisplayName === 'string' ? req.body.userDisplayName : undefined;

    const ticket = await appendUserMessage(userId, body, { userEmail, userDisplayName });
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

router.post('/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.body?.userId as string) || req.userId;
    if (!userId || userId === 'demo-user') {
      throw new AppError(401, 'Faça login para falar com o suporte.');
    }
    const ticket = await markReadByUser(userId);
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

export default router;
