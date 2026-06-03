import { Router, Request, Response, NextFunction } from 'express';
import { getPlanSettings } from '../services/adminSettings';

const router = Router();

/** Valores exibidos na landing (público, sem auth) */
router.get('/config', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await getPlanSettings();
    res.json({ plans });
  } catch (err) {
    next(err);
  }
});

export default router;
