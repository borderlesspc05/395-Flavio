import { Router, Request, Response, NextFunction } from 'express';
import { TeamMember } from '../types';
import { generateId, nowIso } from '../utils/id';
import { AppError } from '../utils/errors';
import { listByUser, getById, create, update, remove, COLLECTIONS } from '../services/storage';
import { logActivity } from '../services/activities';
import { sendTeamMemberDevelopmentEmail } from '../services/teamDevelopmentEmail';

const router = Router();

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await listByUser<TeamMember>(COLLECTIONS.teamMembers, req.userId);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { nome, cargo, email, telefone, departamento, ativo } = req.body;

    if (!nome || !cargo) {
      throw new AppError(400, 'nome and cargo are required');
    }

    const id = generateId();
    const member: TeamMember = {
      id,
      userId: req.userId,
      nome: String(nome),
      cargo: String(cargo),
      email: email ? String(email) : undefined,
      telefone: telefone ? String(telefone) : undefined,
      departamento: departamento ? String(departamento) : undefined,
      ativo: ativo !== false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    await create(COLLECTIONS.teamMembers, id, member as unknown as Record<string, unknown>);
    await logActivity(req.userId, 'team', `Membro adicionado: ${member.nome}`, {
      entidade: 'teamMember',
      entidadeId: id,
    });

    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const existing = await getById<TeamMember>(COLLECTIONS.teamMembers, id);
    if (!existing || existing.userId !== req.userId) {
      throw new AppError(404, 'Team member not found');
    }

    const allowed = ['nome', 'cargo', 'email', 'telefone', 'departamento', 'ativo'];
    const patch: Partial<TeamMember> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        (patch as Record<string, unknown>)[key] = req.body[key];
      }
    }

    const updated = await update<TeamMember>(COLLECTIONS.teamMembers, id, patch);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/development-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const cycleId =
      typeof req.query.cycleId === 'string'
        ? req.query.cycleId
        : typeof req.body?.cycleId === 'string'
          ? req.body.cycleId
          : undefined;
    const result = await sendTeamMemberDevelopmentEmail(req.userId, id, cycleId);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to send email';
    if (msg.includes('not found') || msg.includes('no email')) {
      next(new AppError(400, msg));
      return;
    }
    next(err);
  }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const existing = await getById<TeamMember>(COLLECTIONS.teamMembers, id);
    if (!existing || existing.userId !== req.userId) {
      throw new AppError(404, 'Team member not found');
    }

    await remove(COLLECTIONS.teamMembers, id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
