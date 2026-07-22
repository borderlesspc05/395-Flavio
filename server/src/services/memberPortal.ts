import { generateId } from '../utils/id';
import type { ActionCanvas, TeamMember } from '../types';
import {
  deriveDeliveryStatusFromChecklist,
  getDeliveryChecklistItems,
  type DeliveryChecklistItem,
  type ChecklistProgress,
} from './deliveryChecklist';
import { COLLECTIONS, getById, listByUser, update } from './storage';
import { env } from '../config/env';
import { nowIso } from '../utils/id';

export function generatePortalToken(): string {
  return `pt_${generateId()}_${Math.random().toString(36).slice(2, 12)}`;
}

export function buildMemberPortalUrl(member: Pick<TeamMember, 'id' | 'portalToken'>): string | null {
  if (!member.portalToken) return null;
  const base = env.frontendUrl.replace(/\/$/, '');
  return `${base}/colaborador/${member.id}?token=${encodeURIComponent(member.portalToken)}`;
}

export async function ensureMemberPortalToken(member: TeamMember): Promise<TeamMember> {
  if (member.portalToken?.trim()) return member;
  const portalToken = generatePortalToken();
  const updated = await update<TeamMember>(COLLECTIONS.teamMembers, member.id, { portalToken });
  return updated ?? { ...member, portalToken };
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

/** Verifica se o texto de responsável aponta para este membro (nome ou e-mail). */
export function assigneeMatchesMember(responsavel: string, member: TeamMember): boolean {
  const raw = (responsavel || '').trim();
  if (!raw) return false;
  const needle = normalizeName(raw);
  const nome = normalizeName(member.nome || '');
  const email = normalizeName(member.email || '');

  if (email && (needle === email || needle.includes(email) || email.includes(needle))) {
    return true;
  }
  if (!nome) return false;
  return needle === nome || needle.includes(nome) || nome.includes(needle);
}

export interface MemberPortalTask {
  canvasId: string;
  deliveryId: string;
  itemId: string;
  initiative: string;
  deliveryTitle: string;
  deliveryPrazo?: string;
  texto: string;
  progresso: ChecklistProgress;
  prazo?: string;
  done: boolean;
}

export interface MemberPortalPayload {
  member: {
    id: string;
    name: string;
    email?: string;
    role: string;
    department?: string;
    status?: string;
  };
  tasks: MemberPortalTask[];
}

export async function authenticateMemberPortal(
  memberId: string,
  token: string
): Promise<TeamMember> {
  const member = await getById<TeamMember>(COLLECTIONS.teamMembers, memberId);
  if (!member) {
    throw Object.assign(new Error('Membro não encontrado'), { status: 404 });
  }
  const ensured = await ensureMemberPortalToken(member);
  const expected = (ensured.portalToken || '').trim();
  const provided = (token || '').trim();
  if (!expected || !provided || expected !== provided) {
    throw Object.assign(new Error('Link inválido ou expirado'), { status: 401 });
  }
  return ensured;
}

export async function listMemberPortalTasks(member: TeamMember): Promise<MemberPortalTask[]> {
  const canvases = await listByUser<ActionCanvas>(COLLECTIONS.actionCanvases, member.userId);
  const tasks: MemberPortalTask[] = [];

  for (const canvas of canvases) {
    if (canvas.fechado) continue;
    for (const delivery of canvas.entregas ?? []) {
      const items = getDeliveryChecklistItems(delivery);
      for (const item of items) {
        if (!item.texto.trim()) continue;
        if (!assigneeMatchesMember(item.responsavel || '', member)) continue;
        tasks.push({
          canvasId: canvas.id,
          deliveryId: delivery.id,
          itemId: item.id,
          initiative: canvas.nomeIniciativa || 'Iniciativa',
          deliveryTitle: delivery.entrega || 'Entrega',
          deliveryPrazo: delivery.prazo || undefined,
          texto: item.texto,
          progresso: (item.progresso ?? (item.done ? 100 : 0)) as ChecklistProgress,
          prazo: item.prazo || undefined,
          done: Boolean(item.done) || item.progresso === 100,
        });
      }
    }
  }

  return tasks;
}

export async function getMemberPortalPayload(member: TeamMember): Promise<MemberPortalPayload> {
  const tasks = await listMemberPortalTasks(member);
  return {
    member: {
      id: member.id,
      name: member.nome,
      email: member.email,
      role: member.cargo,
      department: member.departamento,
      status: member.status,
    },
    tasks,
  };
}

export async function updateMemberPortalTask(params: {
  member: TeamMember;
  canvasId: string;
  deliveryId: string;
  itemId: string;
  progresso: ChecklistProgress;
}): Promise<MemberPortalTask> {
  const { member, canvasId, deliveryId, itemId, progresso } = params;
  const canvas = await getById<ActionCanvas>(COLLECTIONS.actionCanvases, canvasId);
  if (!canvas || canvas.userId !== member.userId) {
    throw Object.assign(new Error('Tarefa não encontrada'), { status: 404 });
  }
  if (canvas.fechado) {
    throw Object.assign(new Error('Esta iniciativa está encerrada'), { status: 403 });
  }

  const delivery = canvas.entregas.find((d) => d.id === deliveryId);
  if (!delivery) {
    throw Object.assign(new Error('Entrega não encontrada'), { status: 404 });
  }

  const items = getDeliveryChecklistItems(delivery);
  const index = items.findIndex((i) => i.id === itemId);
  if (index < 0) {
    throw Object.assign(new Error('Ação não encontrada'), { status: 404 });
  }

  const current = items[index];
  if (!assigneeMatchesMember(current.responsavel || '', member)) {
    throw Object.assign(new Error('Esta ação não está atribuída a você'), { status: 403 });
  }

  const nextProgress = Math.max(0, Math.min(100, Math.round(progresso))) as ChecklistProgress;
  const allowed: ChecklistProgress[] = [0, 25, 50, 75, 100];
  const safeProgress = allowed.includes(nextProgress) ? nextProgress : 0;

  const nextItems: DeliveryChecklistItem[] = items.map((item, i) =>
    i === index
      ? {
          ...item,
          progresso: safeProgress,
          done: safeProgress === 100,
        }
      : item
  );

  const nextEntregas = canvas.entregas.map((d) => {
    if (d.id !== deliveryId) return d;
    return {
      ...d,
      checklistItems: nextItems,
      checklist: nextItems.map((i) => i.texto).filter(Boolean),
      status: deriveDeliveryStatusFromChecklist(nextItems, d.prazo),
    };
  });

  await update<ActionCanvas>(COLLECTIONS.actionCanvases, canvasId, {
    entregas: nextEntregas,
    updatedAt: nowIso(),
  });

  const updated = nextItems[index];
  return {
    canvasId,
    deliveryId,
    itemId,
    initiative: canvas.nomeIniciativa || 'Iniciativa',
    deliveryTitle: delivery.entrega || 'Entrega',
    deliveryPrazo: delivery.prazo || undefined,
    texto: updated.texto,
    progresso: (updated.progresso ?? 0) as ChecklistProgress,
    prazo: updated.prazo || undefined,
    done: Boolean(updated.done) || updated.progresso === 100,
  };
}
