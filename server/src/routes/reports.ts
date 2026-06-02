import { Router, Request, Response, NextFunction } from 'express';
import { Report } from '../types';
import { listByUser, getById, COLLECTIONS } from '../services/storage';
import { generateReport } from '../services/reports';
import { withConcurrencyLimit } from '../services/concurrency';
import { AppError } from '../utils/errors';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await listByUser<Report>(COLLECTIONS.reports, req.userId);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post('/generate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await withConcurrencyLimit(req.userId, () => generateReport(req.userId));
    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await getById<Report>(COLLECTIONS.reports, String(req.params.id));
    if (!report || report.userId !== req.userId) {
      throw new AppError(404, 'Report not found');
    }
    res.json(report);
  } catch (err) {
    next(err);
  }
});

export default router;
