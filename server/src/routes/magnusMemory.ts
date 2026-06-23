import { Router, Request, Response, NextFunction } from 'express';
import { upsertMagnusMemorySnapshot } from '../services/magnusMemory';
import { triggerInitialFormIndex } from '../services/ragHooks';

const router = Router();

/** Sincroniza texto do diagnóstico / Gate Zero para memória da IA no servidor */
router.post('/sync', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { diagnosticContext, gateContext } = req.body ?? {};
    const patch: { diagnosticContext?: string; gateContext?: string } = {};

    if (typeof diagnosticContext === 'string' && diagnosticContext.trim()) {
      patch.diagnosticContext = diagnosticContext.trim();
    }
    if (typeof gateContext === 'string' && gateContext.trim()) {
      patch.gateContext = gateContext.trim();
    }

    if (!patch.diagnosticContext && !patch.gateContext) {
      res.status(400).json({ error: 'diagnosticContext or gateContext required' });
      return;
    }

    const snapshot = await upsertMagnusMemorySnapshot(req.userId, patch);
    triggerInitialFormIndex(req.userId);
    res.json({ ok: true, updatedAt: snapshot.updatedAt });
  } catch (err) {
    next(err);
  }
});

export default router;
