import { Router, Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import {
  appendDiagnosticCycleToMemory,
  resetWorkspaceData,
  type WorkspaceResetOptions,
} from '../services/workspace';

const router = Router();

router.post('/reset', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body ?? {};
    const options: WorkspaceResetOptions = {
      objectives: Boolean(body.objectives),
      actionCanvases: Boolean(body.actionCanvases),
      reports: Boolean(body.reports),
      conversations: Boolean(body.conversations),
      magnusMemory: Boolean(body.magnusMemory),
    };

    if (!Object.values(options).some(Boolean)) {
      throw new AppError(400, 'Select at least one area to reset');
    }

    const result = await resetWorkspaceData(req.userId, options);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.post('/archive-cycle', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cycleNumber, label, diagnosticContext } = req.body ?? {};
    if (typeof diagnosticContext !== 'string' || !diagnosticContext.trim()) {
      throw new AppError(400, 'diagnosticContext is required');
    }
    await appendDiagnosticCycleToMemory(req.userId, {
      cycleNumber: Number(cycleNumber) || 1,
      label: typeof label === 'string' ? label : `Ciclo ${cycleNumber ?? 1}`,
      diagnosticContext: diagnosticContext.trim(),
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
