import { Router, Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import type { ChecklistProgress } from '../services/deliveryChecklist';
import {
  authenticateMemberPortal,
  getMemberPortalPayload,
  updateMemberPortalTask,
} from '../services/memberPortal';

const router = Router();

const ALLOWED_PROGRESS: ChecklistProgress[] = [0, 25, 50, 75, 100];

function readToken(req: Request): string {
  const q = typeof req.query.token === 'string' ? req.query.token : '';
  const body = req.body && typeof req.body.token === 'string' ? req.body.token : '';
  const header = typeof req.headers['x-member-token'] === 'string' ? req.headers['x-member-token'] : '';
  return (q || body || header || '').trim();
}

router.get('/:memberId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberId = String(req.params.memberId);
    const token = readToken(req);
    if (!token) {
      throw new AppError(401, 'Informe o token do convite');
    }
    const member = await authenticateMemberPortal(memberId, token);
    const payload = await getMemberPortalPayload(member);
    res.json(payload);
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      const status = Number((err as { status: number }).status) || 500;
      next(new AppError(status, err instanceof Error ? err.message : 'Erro no portal'));
      return;
    }
    next(err);
  }
});

router.patch('/:memberId/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const memberId = String(req.params.memberId);
    const token = readToken(req);
    if (!token) {
      throw new AppError(401, 'Informe o token do convite');
    }
    const member = await authenticateMemberPortal(memberId, token);

    const canvasId = String(req.body?.canvasId ?? '').trim();
    const deliveryId = String(req.body?.deliveryId ?? '').trim();
    const itemId = String(req.body?.itemId ?? '').trim();
    const progresso = Number(req.body?.progresso) as ChecklistProgress;

    if (!canvasId || !deliveryId || !itemId) {
      throw new AppError(400, 'canvasId, deliveryId e itemId são obrigatórios');
    }
    if (!ALLOWED_PROGRESS.includes(progresso)) {
      throw new AppError(400, 'Progresso deve ser 0, 25, 50, 75 ou 100');
    }

    const task = await updateMemberPortalTask({
      member,
      canvasId,
      deliveryId,
      itemId,
      progresso,
    });
    res.json({ task });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) {
      const status = Number((err as { status: number }).status) || 500;
      next(new AppError(status, err instanceof Error ? err.message : 'Erro no portal'));
      return;
    }
    next(err);
  }
});

export default router;
