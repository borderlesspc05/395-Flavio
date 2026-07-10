import { Router, Request, Response, NextFunction } from 'express';
import { TeamMember, TeamMemberStatus } from '../types';
import { generateId, nowIso } from '../utils/id';
import { AppError } from '../utils/errors';
import { listByUser, getById, create, update, remove, COLLECTIONS } from '../services/storage';
import { logActivity } from '../services/activities';
import { sendTeamMemberDevelopmentEmail } from '../services/teamDevelopmentEmail';
import {
  createDevelopmentEntry,
  listDevelopmentEntries,
} from '../services/teamMemberDevelopment';

const router = Router();

const MEMBER_PATCH_KEYS = [
  'nome',
  'cargo',
  'email',
  'telefone',
  'departamento',
  'localizacao',
  'dataContratacao',
  'status',
  'skills',
  'performance',
  'ativo',
] as const;

function statusToAtivo(status: unknown): boolean | undefined {
  if (status === 'active' || status === 'remote') return true;
  if (status === 'on-leave') return false;
  return undefined;
}

function buildMemberPatch(body: Record<string, unknown>): Partial<TeamMember> {
  const patch: Partial<TeamMember> = {};

  if (body.nome !== undefined || body.name !== undefined) {
    patch.nome = String(body.nome ?? body.name).trim();
  }
  if (body.cargo !== undefined || body.role !== undefined) {
    patch.cargo = String(body.cargo ?? body.role).trim();
  }
  if (body.email !== undefined) {
    patch.email = body.email ? String(body.email).trim() : undefined;
  }
  if (body.telefone !== undefined || body.phone !== undefined) {
    const phone = body.telefone ?? body.phone;
    patch.telefone = phone ? String(phone).trim() : undefined;
  }
  if (body.departamento !== undefined || body.department !== undefined) {
    const dept = body.departamento ?? body.department;
    patch.departamento = dept ? String(dept).trim() : undefined;
  }
  if (body.localizacao !== undefined || body.location !== undefined) {
    const loc = body.localizacao ?? body.location;
    patch.localizacao = loc ? String(loc).trim() : undefined;
  }
  if (body.dataContratacao !== undefined || body.hireDate !== undefined) {
    const date = body.dataContratacao ?? body.hireDate;
    patch.dataContratacao = date ? String(date) : undefined;
  }
  if (body.status !== undefined) {
    patch.status = body.status as TeamMemberStatus;
    const ativo = statusToAtivo(body.status);
    if (ativo !== undefined) patch.ativo = ativo;
  }
  if (body.skills !== undefined) {
    patch.skills = Array.isArray(body.skills)
      ? body.skills.map((s) => String(s).trim()).filter(Boolean)
      : [];
  }
  if (body.performance !== undefined) {
    const perf = Number(body.performance);
    if (!Number.isNaN(perf)) {
      patch.performance = Math.max(0, Math.min(100, Math.round(perf)));
    }
  }
  if (body.ativo !== undefined) {
    patch.ativo = body.ativo !== false;
  }

  for (const key of MEMBER_PATCH_KEYS) {
    if (body[key] !== undefined && (patch as Record<string, unknown>)[key] === undefined) {
      (patch as Record<string, unknown>)[key] = body[key];
    }
  }

  return patch;
}

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
    const patch = buildMemberPatch(req.body);
    const nome = patch.nome ?? (req.body.nome ? String(req.body.nome) : req.body.name ? String(req.body.name) : '');
    const cargo = patch.cargo ?? (req.body.cargo ? String(req.body.cargo) : req.body.role ? String(req.body.role) : '');

    if (!nome.trim() || !cargo.trim()) {
      throw new AppError(400, 'nome and cargo are required');
    }

    const id = generateId();
    const status = (patch.status ?? req.body.status ?? 'active') as TeamMemberStatus;
    const member: TeamMember = {
      id,
      userId: req.userId,
      nome: nome.trim(),
      cargo: cargo.trim(),
      email: patch.email,
      telefone: patch.telefone,
      departamento: patch.departamento,
      localizacao: patch.localizacao,
      dataContratacao: patch.dataContratacao,
      status,
      skills: patch.skills,
      performance: patch.performance,
      ativo: patch.ativo ?? statusToAtivo(status) ?? true,
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

router.get('/:id/development', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const existing = await getById<TeamMember>(COLLECTIONS.teamMembers, id);
    if (!existing || existing.userId !== req.userId) {
      throw new AppError(404, 'Team member not found');
    }

    const entries = await listDevelopmentEntries(req.userId, id);
    res.json(entries);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/development', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const score = Number(req.body?.score);
    if (Number.isNaN(score)) {
      throw new AppError(400, 'score is required');
    }

    const cycleId =
      typeof req.body?.cycleId === 'string'
        ? req.body.cycleId
        : typeof req.query.cycleId === 'string'
          ? req.query.cycleId
          : undefined;

    const result = await createDevelopmentEntry(req.userId, id, {
      score,
      notes: typeof req.body?.notes === 'string' ? req.body.notes : undefined,
      cycleId,
    });

    res.status(201).json(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'Team member not found') {
      next(new AppError(404, err.message));
      return;
    }
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

    const patch = buildMemberPatch(req.body);
    if (Object.keys(patch).length === 0) {
      res.json(existing);
      return;
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
    if (err instanceof AppError) {
      next(err);
      return;
    }
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
