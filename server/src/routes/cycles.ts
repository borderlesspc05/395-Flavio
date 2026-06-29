import { Router, Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import {
  createDiagnosticCycleForUser,
  getCycleQuotaForUser,
} from '../services/diagnosticCyclesServer';

const router = Router();

router.get('/quota', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quota = await getCycleQuotaForUser(req.userId);
    res.json(quota);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { label, status, diagnosticContext, gateSummary, formData, archiveCycleId } =
      req.body ?? {};

    if (status && status !== 'draft' && status !== 'active' && status !== 'archived') {
      throw new AppError(400, 'status inválido.');
    }

    const created = await createDiagnosticCycleForUser(req.userId, {
      label: typeof label === 'string' ? label : undefined,
      status: status === 'active' || status === 'archived' ? status : 'draft',
      diagnosticContext: typeof diagnosticContext === 'string' ? diagnosticContext : '',
      gateSummary: typeof gateSummary === 'string' ? gateSummary : undefined,
      formData:
        formData && typeof formData === 'object' ? (formData as Record<string, unknown>) : undefined,
      archiveCycleId: typeof archiveCycleId === 'string' ? archiveCycleId : undefined,
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

export default router;
