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
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Faça login para falar com o suporte.');

    const ticket =
      (await getTicketForUser(userId)) ??
      (await getOrCreateTicket(userId, {
        userEmail: req.userEmail,
        userDisplayName: req.userDisplayName,
      }));

    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

router.post('/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Faça login para falar com o suporte.');

    const body = String(req.body?.body ?? '');
    const ticket = await appendUserMessage(userId, body, {
      userEmail: req.userEmail,
      userDisplayName: req.userDisplayName,
    });
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

router.post('/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await markReadByUser(req.userId);
    res.json({ ticket });
  } catch (err) {
    next(err);
  }
});

export default router;
