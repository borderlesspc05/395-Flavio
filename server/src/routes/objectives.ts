import { Router, Request, Response, NextFunction } from 'express';
import { Objective, ObjectiveStatus, ObjectiveOrigin } from '../types';
import { generateId, nowIso } from '../utils/id';
import { AppError } from '../utils/errors';
import { listByUser, getById, create, update, remove, COLLECTIONS } from '../services/storage';
import { logActivity } from '../services/activities';
import { suggestObjectives } from '../services/objectivesSuggest';
import { indexObjectiveAfterSave } from '../services/ragHooks';
import { withConcurrencyLimit } from '../services/concurrency';

const router = Router();

function withoutUndefined<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cycleId = typeof req.query.cycleId === 'string' ? req.query.cycleId : undefined;
    const items = await listByUser<Objective>(COLLECTIONS.objectives, req.userId, 'createdAt', cycleId);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      titulo,
      descricao,
      categoria,
      status,
      origem,
      prioridade,
      prazo,
      horizonte,
      responsavel,
      impacto,
      insightOrigem,
      cycleId,
    } = req.body;

    if (!titulo || !descricao) {
      throw new AppError(400, 'titulo and descricao are required');
    }

    const id = generateId();
    const objective: Objective = withoutUndefined({
      id,
      userId: req.userId,
      titulo: String(titulo),
      descricao: String(descricao),
      categoria: String(categoria ?? 'Geral'),
      status: (status as ObjectiveStatus) ?? 'pendente',
      origem: (origem as ObjectiveOrigin) ?? 'manual',
      prioridade: prioridade != null ? Number(prioridade) : undefined,
      horizonte: horizonte ? (String(horizonte) as Objective['horizonte']) : undefined,
      prazo: prazo ? String(prazo) : undefined,
      responsavel: responsavel ? String(responsavel) : undefined,
      impacto: impacto ? String(impacto) : undefined,
      insightOrigem: insightOrigem ? String(insightOrigem) : undefined,
      cycleId: cycleId ? String(cycleId) : undefined,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });

    await create(COLLECTIONS.objectives, id, objective as unknown as Record<string, unknown>);
    await logActivity(req.userId, 'objective', `Objetivo criado: ${objective.titulo}`, {
      entidade: 'objective',
      entidadeId: id,
    });

    indexObjectiveAfterSave(objective);

    res.status(201).json(objective);
  } catch (err) {
    next(err);
  }
});

router.post('/suggest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const context = req.body?.context ?? req.body?.message;
    const suggestions = await withConcurrencyLimit(req.userId, () =>
      suggestObjectives(req.userId, context)
    );
    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const existing = await getById<Objective>(COLLECTIONS.objectives, id);
    if (!existing || existing.userId !== req.userId) {
      throw new AppError(404, 'Objective not found');
    }

    const allowed = [
      'titulo',
      'descricao',
      'categoria',
      'status',
      'origem',
      'prioridade',
      'prazo',
      'horizonte',
      'responsavel',
      'impacto',
      'insightOrigem',
    ];
    const patch: Partial<Objective> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        (patch as Record<string, unknown>)[key] = req.body[key];
      }
    }

    const updated = await update<Objective>(COLLECTIONS.objectives, id, withoutUndefined(patch));
    if (updated) {
      indexObjectiveAfterSave(updated);
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const existing = await getById<Objective>(COLLECTIONS.objectives, id);
    if (!existing || existing.userId !== req.userId) {
      throw new AppError(404, 'Objective not found');
    }

    await remove(COLLECTIONS.objectives, id);
    await logActivity(req.userId, 'objective', `Objetivo removido: ${existing.titulo}`, {
      entidade: 'objective',
      entidadeId: id,
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
