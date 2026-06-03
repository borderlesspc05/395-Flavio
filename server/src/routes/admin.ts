import { Router, Request, Response, NextFunction } from 'express';
import { requireAdmin } from '../middleware/adminAuth';
import { getAdminDashboardData } from '../services/adminDashboard';
import {
  getPlanSettings,
  savePlanSettings,
  validatePlanSettingsInput,
} from '../services/adminSettings';

const router = Router();

router.use(requireAdmin);

router.get('/dashboard', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getAdminDashboardData();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get('/settings/plans', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await getPlanSettings();
    res.json({ plans });
  } catch (err) {
    next(err);
  }
});

router.put('/settings/plans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const patch = validatePlanSettingsInput(req.body);
    const plans = await savePlanSettings(patch);
    res.json({ plans });
  } catch (err) {
    next(err);
  }
});

export default router;
