import { Router, Request, Response, NextFunction } from 'express';
import {
  ActionCanvas,
  ActionCanvasDelivery,
  ActionCanvasRisk,
  ActionCanvasSignOff,
  DeliveryStatus,
} from '../types';
import { generateId, nowIso } from '../utils/id';
import { AppError } from '../utils/errors';
import { listByUser, getById, create, update, remove, COLLECTIONS } from '../services/storage';
import { logActivity } from '../services/activities';
import { suggestActionCanvases } from '../services/actionCanvasSuggest';
import { indexActionCanvasAfterSave } from '../services/ragHooks';
import { withConcurrencyLimit } from '../services/concurrency';

const router = Router();
const MAX_CANVASES = 5;
const MAX_ENTREGAS = 10;
const MAX_RISCOS = 8;

function withoutUndefined<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;
}

function normalizeDelivery(raw: unknown, index: number): ActionCanvasDelivery {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const status = d.status === 'verde' || d.status === 'amarelo' || d.status === 'vermelho' ? d.status : 'amarelo';
  return {
    id: typeof d.id === 'string' && d.id ? d.id : `del-${index}-${generateId()}`,
    entrega: String(d.entrega ?? ''),
    responsavel: String(d.responsavel ?? ''),
    prazo: String(d.prazo ?? ''),
    status: status as DeliveryStatus,
    evidencia: String(d.evidencia ?? ''),
  };
}

function normalizeRisk(raw: unknown, index: number): ActionCanvasRisk {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    id: typeof r.id === 'string' && r.id ? r.id : `risk-${index}-${generateId()}`,
    risco: String(r.risco ?? ''),
    acaoTomar: String(r.acaoTomar ?? r.acao ?? ''),
  };
}

function normalizeSignOff(value: unknown): ActionCanvasSignOff {
  if (value === 'sim' || value === 'nao') return value;
  return 'pendente';
}

function buildCanvasPayload(
  userId: string,
  body: Record<string, unknown>,
  existing?: ActionCanvas
): ActionCanvas {
  const entregasRaw = Array.isArray(body.entregas) ? body.entregas : existing?.entregas ?? [];
  const riscosRaw = Array.isArray(body.riscos) ? body.riscos : existing?.riscos ?? [];
  const entregas = entregasRaw.slice(0, MAX_ENTREGAS).map((e, i) => normalizeDelivery(e, i));
  const riscos = riscosRaw.slice(0, MAX_RISCOS).map((r, i) => normalizeRisk(r, i));
  const signOff = normalizeSignOff(body.signOff ?? existing?.signOff);
  const fechado = signOff !== 'pendente';

  const cycleId = body.cycleId ? String(body.cycleId) : existing?.cycleId;

  return {
    id: existing?.id ?? generateId(),
    userId,
    cycleId,
    nomeIniciativa: String(body.nomeIniciativa ?? existing?.nomeIniciativa ?? ''),
    objetivoEspecifico: String(body.objetivoEspecifico ?? existing?.objetivoEspecifico ?? ''),
    owner: String(body.owner ?? existing?.owner ?? ''),
    sponsor: String(body.sponsor ?? existing?.sponsor ?? ''),
    prazoFinal: String(body.prazoFinal ?? existing?.prazoFinal ?? ''),
    entregas,
    riscos,
    signOff,
    fechado,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
  };
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cycleId = typeof req.query.cycleId === 'string' ? req.query.cycleId : undefined;
    const items = await listByUser<ActionCanvas>(COLLECTIONS.actionCanvases, req.userId, 'createdAt', cycleId);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post('/suggest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { diagnosticContext, gateContext } = req.body ?? {};
    const result = await withConcurrencyLimit(req.userId, () =>
      suggestActionCanvases(req.userId, {
        diagnosticContext: typeof diagnosticContext === 'string' ? diagnosticContext : undefined,
        gateContext: typeof gateContext === 'string' ? gateContext : undefined,
      })
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Record<string, unknown>;
    const cycleId = typeof body.cycleId === 'string' && body.cycleId ? body.cycleId : undefined;
    const existing = await listByUser<ActionCanvas>(
      COLLECTIONS.actionCanvases,
      req.userId,
      'createdAt',
      cycleId
    );
    if (existing.length >= MAX_CANVASES) {
      throw new AppError(400, `Limite de ${MAX_CANVASES} Action Canvas por ciclo.`);
    }

    const canvas = buildCanvasPayload(req.userId, body);
    await create(COLLECTIONS.actionCanvases, canvas.id, canvas as unknown as Record<string, unknown>);
    await logActivity(req.userId, 'action_canvas', `Action Canvas criado: ${canvas.nomeIniciativa || 'Sem nome'}`, {
      entidade: 'action_canvas',
      entidadeId: canvas.id,
    });
    indexActionCanvasAfterSave(canvas);
    res.status(201).json(canvas);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const existing = await getById<ActionCanvas>(COLLECTIONS.actionCanvases, id);
    if (!existing || existing.userId !== req.userId) {
      throw new AppError(404, 'Action Canvas not found');
    }

    const canvas = buildCanvasPayload(req.userId, req.body as Record<string, unknown>, existing);
    const updated = await update<ActionCanvas>(
      COLLECTIONS.actionCanvases,
      id,
      withoutUndefined(canvas as unknown as Record<string, unknown>)
    );

    if (canvas.signOff !== existing.signOff && canvas.signOff !== 'pendente') {
      await logActivity(
        req.userId,
        'action_canvas',
        `Action Canvas encerrado (${canvas.signOff === 'sim' ? 'SIM' : 'NÃO'}): ${canvas.nomeIniciativa}`,
        { entidade: 'action_canvas', entidadeId: id }
      );
    }

    if (updated) {
      indexActionCanvasAfterSave(updated);
    }

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const existing = await getById<ActionCanvas>(COLLECTIONS.actionCanvases, id);
    if (!existing || existing.userId !== req.userId) {
      throw new AppError(404, 'Action Canvas not found');
    }
    await remove(COLLECTIONS.actionCanvases, id);
    await logActivity(req.userId, 'action_canvas', `Action Canvas removido: ${existing.nomeIniciativa}`, {
      entidade: 'action_canvas',
      entidadeId: id,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
