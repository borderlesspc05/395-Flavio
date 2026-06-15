import {
  ActionCanvas,
  Objective,
  ObjectiveOrigin,
  ObjectiveStatus,
  TeamMember,
} from '../types';
import { generateId, nowIso } from '../utils/id';
import { AppError } from '../utils/errors';
import { create, getById, listByUser, remove, update, COLLECTIONS } from './storage';
import { logActivity } from './activities';
import { getFirestore, isFirebaseEnabled } from './firebase';
import type { LlmToolDefinition } from './llm';

const MAX_CANVASES = 5;

export interface AgentActionRecord {
  tool: string;
  ok: boolean;
  summary: string;
  entityId?: string;
  error?: string;
}

function withoutUndefined<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as T;
}

function priorityToNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  const map: Record<string, number> = { alta: 1, media: 2, média: 2, baixa: 3 };
  const key = String(value ?? '').toLowerCase();
  return map[key];
}

function parseStatus(value: unknown): ObjectiveStatus | undefined {
  const allowed: ObjectiveStatus[] = ['pendente', 'em_andamento', 'concluido', 'cancelado'];
  const v = String(value ?? '') as ObjectiveStatus;
  return allowed.includes(v) ? v : undefined;
}

async function getCycleLabel(cycleId: string, userId: string): Promise<string | null> {
  const db = getFirestore();
  if (!db || !isFirebaseEnabled()) return null;
  const snap = await db.collection('diagnosticCycles').doc(cycleId).get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (data?.userId !== userId) return null;
  return String(data.label ?? '');
}

async function renameCycleLabel(cycleId: string, userId: string, label: string): Promise<void> {
  const db = getFirestore();
  if (!db || !isFirebaseEnabled()) {
    throw new AppError(503, 'Firebase indisponível para renomear o projeto.');
  }
  const ref = db.collection('diagnosticCycles').doc(cycleId);
  const snap = await ref.get();
  if (!snap.exists) throw new AppError(404, 'Ciclo/projeto não encontrado.');
  const data = snap.data();
  if (data?.userId !== userId) throw new AppError(403, 'Sem permissão para este projeto.');
  await ref.update({ label });
}

export async function buildProjectSnapshot(userId: string, cycleId?: string): Promise<string> {
  const [objectives, canvases, team, projectName] = await Promise.all([
    listByUser<Objective>(COLLECTIONS.objectives, userId, 'createdAt', cycleId),
    listByUser<ActionCanvas>(COLLECTIONS.actionCanvases, userId, 'createdAt', cycleId),
    listByUser<TeamMember>(COLLECTIONS.teamMembers, userId),
    cycleId ? getCycleLabel(cycleId, userId) : Promise.resolve(null),
  ]);

  const objectiveLines =
    objectives.length === 0
      ? '- nenhum'
      : objectives
          .slice(0, 20)
          .map(
            (o) =>
              `- [id:${o.id}] ${o.titulo} | status:${o.status} | categoria:${o.categoria}${
                o.responsavel ? ` | resp:${o.responsavel}` : ''
              }`
          )
          .join('\n');

  const canvasLines =
    canvases.length === 0
      ? '- nenhum'
      : canvases
          .slice(0, 10)
          .map(
            (c) =>
              `- [id:${c.id}] ${c.nomeIniciativa || 'Sem nome'} | owner:${c.owner || '—'} | sign-off:${c.signOff}`
          )
          .join('\n');

  const teamLines =
    team.length === 0
      ? '- nenhum'
      : team
          .slice(0, 20)
          .map((m) => `- [id:${m.id}] ${m.nome} | ${m.cargo}${m.departamento ? ` | ${m.departamento}` : ''}`)
          .join('\n');

  return `
Nome do projeto/ciclo: ${projectName ?? 'não definido'}
CycleId ativo: ${cycleId ?? 'não informado'}

Objetivos (${objectives.length}):
${objectiveLines}

Action Canvas (${canvases.length}):
${canvasLines}

Equipe (${team.length}):
${teamLines}
`.trim();
}

export const AGENT_TOOLS: LlmToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'list_objectives',
      description: 'Lista objetivos do projeto ativo com ids para update/delete.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_objective',
      description: 'Cria um objetivo estratégico no projeto.',
      parameters: {
        type: 'object',
        properties: {
          titulo: { type: 'string' },
          descricao: { type: 'string' },
          categoria: { type: 'string' },
          status: { type: 'string', enum: ['pendente', 'em_andamento', 'concluido', 'cancelado'] },
          prioridade: { type: 'string', enum: ['alta', 'media', 'baixa'] },
          responsavel: { type: 'string' },
          prazo: { type: 'string' },
          impacto: { type: 'string' },
        },
        required: ['titulo', 'descricao'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_objective',
      description: 'Atualiza um objetivo existente pelo id.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          titulo: { type: 'string' },
          descricao: { type: 'string' },
          categoria: { type: 'string' },
          status: { type: 'string', enum: ['pendente', 'em_andamento', 'concluido', 'cancelado'] },
          prioridade: { type: 'string', enum: ['alta', 'media', 'baixa'] },
          responsavel: { type: 'string' },
          prazo: { type: 'string' },
          impacto: { type: 'string' },
        },
        required: ['id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_objective',
      description: 'Remove um objetivo pelo id.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_action_canvases',
      description: 'Lista Action Canvas do projeto com ids.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_action_canvas',
      description: 'Cria um Action Canvas.',
      parameters: {
        type: 'object',
        properties: {
          nomeIniciativa: { type: 'string' },
          objetivoEspecifico: { type: 'string' },
          owner: { type: 'string' },
          sponsor: { type: 'string' },
          prazoFinal: { type: 'string' },
        },
        required: ['nomeIniciativa'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_action_canvas',
      description: 'Atualiza um Action Canvas pelo id.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          nomeIniciativa: { type: 'string' },
          objetivoEspecifico: { type: 'string' },
          owner: { type: 'string' },
          sponsor: { type: 'string' },
          prazoFinal: { type: 'string' },
          signOff: { type: 'string', enum: ['pendente', 'sim', 'nao'] },
        },
        required: ['id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_action_canvas',
      description: 'Remove um Action Canvas pelo id.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_team_members',
      description: 'Lista membros da equipe com ids.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_team_member',
      description: 'Adiciona membro à equipe.',
      parameters: {
        type: 'object',
        properties: {
          nome: { type: 'string' },
          cargo: { type: 'string' },
          email: { type: 'string' },
          telefone: { type: 'string' },
          departamento: { type: 'string' },
        },
        required: ['nome', 'cargo'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_team_member',
      description: 'Atualiza membro da equipe pelo id.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          nome: { type: 'string' },
          cargo: { type: 'string' },
          email: { type: 'string' },
          telefone: { type: 'string' },
          departamento: { type: 'string' },
          ativo: { type: 'boolean' },
        },
        required: ['id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_team_member',
      description: 'Remove membro da equipe pelo id.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'rename_project',
      description: 'Renomeia o projeto/ciclo ativo (nome exibido no dashboard).',
      parameters: {
        type: 'object',
        properties: { label: { type: 'string' } },
        required: ['label'],
        additionalProperties: false,
      },
    },
  },
];

export async function executeAgentTool(
  userId: string,
  toolName: string,
  args: Record<string, unknown>,
  cycleId?: string
): Promise<AgentActionRecord> {
  try {
    switch (toolName) {
      case 'list_objectives': {
        const items = await listByUser<Objective>(COLLECTIONS.objectives, userId, 'createdAt', cycleId);
        return {
          tool: toolName,
          ok: true,
          summary: `${items.length} objetivo(s) listado(s).`,
        };
      }

      case 'create_objective': {
        const titulo = String(args.titulo ?? '').trim();
        const descricao = String(args.descricao ?? '').trim();
        if (!titulo || !descricao) {
          return { tool: toolName, ok: false, summary: 'Falha ao criar objetivo', error: 'titulo e descricao são obrigatórios' };
        }
        const id = generateId();
        const status = parseStatus(args.status) ?? 'pendente';
        const objective: Objective = withoutUndefined({
          id,
          userId,
          cycleId,
          titulo,
          descricao,
          categoria: String(args.categoria ?? 'Geral'),
          status,
          origem: 'ia' as ObjectiveOrigin,
          prioridade: priorityToNumber(args.prioridade),
          responsavel: args.responsavel ? String(args.responsavel) : undefined,
          prazo: args.prazo ? String(args.prazo) : undefined,
          impacto: args.impacto ? String(args.impacto) : undefined,
          insightOrigem: 'Assistente IA',
          createdAt: nowIso(),
          updatedAt: nowIso(),
        });
        await create(COLLECTIONS.objectives, id, objective as unknown as Record<string, unknown>);
        await logActivity(userId, 'objective', `Objetivo criado pela IA: ${titulo}`, {
          entidade: 'objective',
          entidadeId: id,
        });
        return { tool: toolName, ok: true, summary: `Objetivo criado: ${titulo}`, entityId: id };
      }

      case 'update_objective': {
        const id = String(args.id ?? '');
        const existing = await getById<Objective>(COLLECTIONS.objectives, id);
        if (!existing || existing.userId !== userId) {
          return { tool: toolName, ok: false, summary: 'Objetivo não encontrado', error: 'not_found' };
        }
        const patch: Partial<Objective> = {};
        if (args.titulo !== undefined) patch.titulo = String(args.titulo);
        if (args.descricao !== undefined) patch.descricao = String(args.descricao);
        if (args.categoria !== undefined) patch.categoria = String(args.categoria);
        if (args.status !== undefined) {
          const status = parseStatus(args.status);
          if (status) patch.status = status;
        }
        if (args.prioridade !== undefined) patch.prioridade = priorityToNumber(args.prioridade);
        if (args.responsavel !== undefined) patch.responsavel = String(args.responsavel);
        if (args.prazo !== undefined) patch.prazo = String(args.prazo);
        if (args.impacto !== undefined) patch.impacto = String(args.impacto);
        await update<Objective>(COLLECTIONS.objectives, id, withoutUndefined(patch));
        await logActivity(userId, 'objective', `Objetivo atualizado pela IA: ${patch.titulo ?? existing.titulo}`, {
          entidade: 'objective',
          entidadeId: id,
        });
        return { tool: toolName, ok: true, summary: `Objetivo atualizado: ${patch.titulo ?? existing.titulo}`, entityId: id };
      }

      case 'delete_objective': {
        const id = String(args.id ?? '');
        const existing = await getById<Objective>(COLLECTIONS.objectives, id);
        if (!existing || existing.userId !== userId) {
          return { tool: toolName, ok: false, summary: 'Objetivo não encontrado', error: 'not_found' };
        }
        await remove(COLLECTIONS.objectives, id);
        await logActivity(userId, 'objective', `Objetivo removido pela IA: ${existing.titulo}`, {
          entidade: 'objective',
          entidadeId: id,
        });
        return { tool: toolName, ok: true, summary: `Objetivo removido: ${existing.titulo}`, entityId: id };
      }

      case 'list_action_canvases': {
        const items = await listByUser<ActionCanvas>(COLLECTIONS.actionCanvases, userId, 'createdAt', cycleId);
        return { tool: toolName, ok: true, summary: `${items.length} Action Canvas listado(s).` };
      }

      case 'create_action_canvas': {
        const existing = await listByUser<ActionCanvas>(COLLECTIONS.actionCanvases, userId);
        if (existing.length >= MAX_CANVASES) {
          return {
            tool: toolName,
            ok: false,
            summary: 'Limite de Action Canvas atingido',
            error: `max_${MAX_CANVASES}`,
          };
        }
        const id = generateId();
        const nome = String(args.nomeIniciativa ?? '').trim();
        if (!nome) {
          return { tool: toolName, ok: false, summary: 'Falha ao criar canvas', error: 'nomeIniciativa obrigatório' };
        }
        const canvas: ActionCanvas = {
          id,
          userId,
          cycleId,
          nomeIniciativa: nome,
          objetivoEspecifico: String(args.objetivoEspecifico ?? ''),
          owner: String(args.owner ?? ''),
          sponsor: String(args.sponsor ?? ''),
          prazoFinal: String(args.prazoFinal ?? ''),
          entregas: [],
          riscos: [],
          signOff: 'pendente',
          fechado: false,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        await create(COLLECTIONS.actionCanvases, id, canvas as unknown as Record<string, unknown>);
        await logActivity(userId, 'action_canvas', `Action Canvas criado pela IA: ${nome}`, {
          entidade: 'action_canvas',
          entidadeId: id,
        });
        return { tool: toolName, ok: true, summary: `Action Canvas criado: ${nome}`, entityId: id };
      }

      case 'update_action_canvas': {
        const id = String(args.id ?? '');
        const existing = await getById<ActionCanvas>(COLLECTIONS.actionCanvases, id);
        if (!existing || existing.userId !== userId) {
          return { tool: toolName, ok: false, summary: 'Action Canvas não encontrado', error: 'not_found' };
        }
        const patch: Partial<ActionCanvas> = {};
        if (args.nomeIniciativa !== undefined) patch.nomeIniciativa = String(args.nomeIniciativa);
        if (args.objetivoEspecifico !== undefined) patch.objetivoEspecifico = String(args.objetivoEspecifico);
        if (args.owner !== undefined) patch.owner = String(args.owner);
        if (args.sponsor !== undefined) patch.sponsor = String(args.sponsor);
        if (args.prazoFinal !== undefined) patch.prazoFinal = String(args.prazoFinal);
        if (args.signOff === 'sim' || args.signOff === 'nao' || args.signOff === 'pendente') {
          patch.signOff = args.signOff;
          patch.fechado = args.signOff !== 'pendente';
        }
        await update<ActionCanvas>(COLLECTIONS.actionCanvases, id, withoutUndefined(patch));
        return {
          tool: toolName,
          ok: true,
          summary: `Action Canvas atualizado: ${patch.nomeIniciativa ?? existing.nomeIniciativa}`,
          entityId: id,
        };
      }

      case 'delete_action_canvas': {
        const id = String(args.id ?? '');
        const existing = await getById<ActionCanvas>(COLLECTIONS.actionCanvases, id);
        if (!existing || existing.userId !== userId) {
          return { tool: toolName, ok: false, summary: 'Action Canvas não encontrado', error: 'not_found' };
        }
        await remove(COLLECTIONS.actionCanvases, id);
        return { tool: toolName, ok: true, summary: `Action Canvas removido: ${existing.nomeIniciativa}`, entityId: id };
      }

      case 'list_team_members': {
        const items = await listByUser<TeamMember>(COLLECTIONS.teamMembers, userId);
        return { tool: toolName, ok: true, summary: `${items.length} membro(s) listado(s).` };
      }

      case 'create_team_member': {
        const nome = String(args.nome ?? '').trim();
        const cargo = String(args.cargo ?? '').trim();
        if (!nome || !cargo) {
          return { tool: toolName, ok: false, summary: 'Falha ao criar membro', error: 'nome e cargo obrigatórios' };
        }
        const id = generateId();
        const member: TeamMember = {
          id,
          userId,
          nome,
          cargo,
          email: args.email ? String(args.email) : undefined,
          telefone: args.telefone ? String(args.telefone) : undefined,
          departamento: args.departamento ? String(args.departamento) : undefined,
          ativo: true,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        await create(COLLECTIONS.teamMembers, id, member as unknown as Record<string, unknown>);
        await logActivity(userId, 'team', `Membro adicionado pela IA: ${nome}`, {
          entidade: 'teamMember',
          entidadeId: id,
        });
        return { tool: toolName, ok: true, summary: `Membro adicionado: ${nome}`, entityId: id };
      }

      case 'update_team_member': {
        const id = String(args.id ?? '');
        const existing = await getById<TeamMember>(COLLECTIONS.teamMembers, id);
        if (!existing || existing.userId !== userId) {
          return { tool: toolName, ok: false, summary: 'Membro não encontrado', error: 'not_found' };
        }
        const patch: Partial<TeamMember> = {};
        if (args.nome !== undefined) patch.nome = String(args.nome);
        if (args.cargo !== undefined) patch.cargo = String(args.cargo);
        if (args.email !== undefined) patch.email = String(args.email);
        if (args.telefone !== undefined) patch.telefone = String(args.telefone);
        if (args.departamento !== undefined) patch.departamento = String(args.departamento);
        if (args.ativo !== undefined) patch.ativo = Boolean(args.ativo);
        await update<TeamMember>(COLLECTIONS.teamMembers, id, withoutUndefined(patch));
        return { tool: toolName, ok: true, summary: `Membro atualizado: ${patch.nome ?? existing.nome}`, entityId: id };
      }

      case 'delete_team_member': {
        const id = String(args.id ?? '');
        const existing = await getById<TeamMember>(COLLECTIONS.teamMembers, id);
        if (!existing || existing.userId !== userId) {
          return { tool: toolName, ok: false, summary: 'Membro não encontrado', error: 'not_found' };
        }
        await remove(COLLECTIONS.teamMembers, id);
        return { tool: toolName, ok: true, summary: `Membro removido: ${existing.nome}`, entityId: id };
      }

      case 'rename_project': {
        if (!cycleId) {
          return { tool: toolName, ok: false, summary: 'Ciclo ativo não informado', error: 'no_cycle' };
        }
        const label = String(args.label ?? '').trim();
        if (label.length < 2) {
          return { tool: toolName, ok: false, summary: 'Nome inválido', error: 'min_length' };
        }
        await renameCycleLabel(cycleId, userId, label);
        await logActivity(userId, 'cycle', `Projeto renomeado pela IA: ${label}`, {
          entidade: 'cycle',
          entidadeId: cycleId,
        });
        return { tool: toolName, ok: true, summary: `Projeto renomeado para: ${label}`, entityId: cycleId };
      }

      default:
        return { tool: toolName, ok: false, summary: 'Ferramenta desconhecida', error: 'unknown_tool' };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao executar ação';
    return { tool: toolName, ok: false, summary: 'Falha na execução', error: message };
  }
}

export async function getToolResultPayload(
  userId: string,
  toolName: string,
  args: Record<string, unknown>,
  cycleId?: string
): Promise<unknown> {
  if (toolName === 'list_objectives') {
    const items = await listByUser<Objective>(COLLECTIONS.objectives, userId, 'createdAt', cycleId);
    return items.map((o) => ({
      id: o.id,
      titulo: o.titulo,
      status: o.status,
      categoria: o.categoria,
      responsavel: o.responsavel,
    }));
  }
  if (toolName === 'list_action_canvases') {
    const items = await listByUser<ActionCanvas>(COLLECTIONS.actionCanvases, userId, 'createdAt', cycleId);
    return items.map((c) => ({
      id: c.id,
      nomeIniciativa: c.nomeIniciativa,
      owner: c.owner,
      signOff: c.signOff,
    }));
  }
  if (toolName === 'list_team_members') {
    const items = await listByUser<TeamMember>(COLLECTIONS.teamMembers, userId);
    return items.map((m) => ({
      id: m.id,
      nome: m.nome,
      cargo: m.cargo,
      departamento: m.departamento,
      ativo: m.ativo,
    }));
  }
  return executeAgentTool(userId, toolName, args, cycleId);
}
