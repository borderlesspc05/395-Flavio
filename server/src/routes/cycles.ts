import { Router, Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import {
  createDiagnosticCycleForUser,
  deleteDiagnosticCycleForUser,
  getCycleQuotaForUser,
  listDiagnosticCyclesForUser,
  updateDiagnosticCycleForUser,
} from '../services/diagnosticCyclesServer';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cycles = await listDiagnosticCyclesForUser(req.userId);
    res.json(cycles);
  } catch (err) {
    next(err);
  }
});

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
      gatePath: req.body?.gatePath === 'A' || req.body?.gatePath === 'B' ? req.body.gatePath : undefined,
      gateRationale:
        typeof req.body?.gateRationale === 'string' ? req.body.gateRationale : undefined,
      formData:
        formData && typeof formData === 'object' ? (formData as Record<string, unknown>) : undefined,
      archiveCycleId: typeof archiveCycleId === 'string' ? archiveCycleId : undefined,
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cycleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status, archivedAt } = req.body ?? {};
    if (status && status !== 'draft' && status !== 'active' && status !== 'archived') {
      throw new AppError(400, 'status inválido.');
    }
    const nextStatus =
      status === 'draft' || status === 'active' || status === 'archived' ? status : undefined;

    const updated = await updateDiagnosticCycleForUser(req.userId, cycleId, {
      label: typeof req.body?.label === 'string' ? req.body.label : undefined,
      status: nextStatus,
      diagnosticContext:
        typeof req.body?.diagnosticContext === 'string' ? req.body.diagnosticContext : undefined,
      gateSummary: typeof req.body?.gateSummary === 'string' ? req.body.gateSummary : undefined,
      gatePath: req.body?.gatePath === 'A' || req.body?.gatePath === 'B' ? req.body.gatePath : undefined,
      gateRationale:
        typeof req.body?.gateRationale === 'string' ? req.body.gateRationale : undefined,
      formData:
        req.body?.formData && typeof req.body.formData === 'object'
          ? (req.body.formData as Record<string, unknown>)
          : undefined,
      phaseLocks:
        req.body?.phaseLocks && typeof req.body.phaseLocks === 'object'
          ? (req.body.phaseLocks as Record<string, boolean>)
          : undefined,
      completedAt:
        req.body?.completedAt === null
          ? null
          : typeof req.body?.completedAt === 'string'
            ? req.body.completedAt
            : undefined,
      archivedAt:
        archivedAt === true || typeof archivedAt === 'string' ? archivedAt : undefined,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cycleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await deleteDiagnosticCycleForUser(req.userId, cycleId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
