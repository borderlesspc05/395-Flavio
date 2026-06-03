import { create, listAll, COLLECTIONS } from './storage';
import { generateId, nowIso } from '../utils/id';
import { incrementUserRequestCount } from './users';

export interface ApiRequestLog {
  id: string;
  userId: string;
  method: string;
  path: string;
  requestType: string;
  statusCode: number;
  durationMs: number;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  chat: 'Consultoria IA (chat)',
  blueprint_gate: 'Gate Zero (classificação IA)',
  objectives_suggest: 'Sugestões de objetivos (IA)',
  action_canvas_suggest: 'Sugestão Action Canvas (IA)',
  report_generate: 'Geração de relatório',
  billing_checkout: 'Checkout / plano',
  billing_claim: 'Vínculo de assinatura',
  magnus_memory_sync: 'Sync memória Magnus',
  objective_crud: 'Objetivos',
  action_canvas_crud: 'Action Canvas',
  team_crud: 'Equipe',
  other: 'Outras requisições',
};

export function classifyRequestType(method: string, path: string): string {
  const p = path.split('?')[0];
  if (p.includes('/ai/chat')) return 'chat';
  if (p.includes('/ai/blueprint-gate')) return 'blueprint_gate';
  if (p.includes('/objectives/suggest')) return 'objectives_suggest';
  if (p.includes('/action-canvases/suggest')) return 'action_canvas_suggest';
  if (p.includes('/reports/generate')) return 'report_generate';
  if (p.includes('/billing/checkout')) return 'billing_checkout';
  if (p.includes('/billing/claim')) return 'billing_claim';
  if (p.includes('/magnus-memory')) return 'magnus_memory_sync';
  if (p.includes('/objectives')) return 'objective_crud';
  if (p.includes('/action-canvases')) return 'action_canvas_crud';
  if (p.includes('/team-members')) return 'team_crud';
  return 'other';
}

export function getRequestTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

/** Assunto Magnus Waves (módulo do produto) */
const SUBJECT_LABELS: Record<string, string> = {
  chat: 'Consultoria IA',
  blueprint_gate: 'Gate Zero / Design',
  objectives_suggest: 'Difusão — Objetivos',
  action_canvas_suggest: 'Difusão — Action Canvas',
  objective_crud: 'Difusão — Objetivos',
  action_canvas_crud: 'Difusão — Action Canvas',
  magnus_memory_sync: 'Memória Magnus Waves',
  report_generate: 'Domínio / Relatórios',
  team_crud: 'Equipe',
  billing_checkout: 'Planos & pagamento',
  billing_claim: 'Planos & pagamento',
  other: 'Geral',
};

export function getRequestSubject(type: string): string {
  return SUBJECT_LABELS[type] ?? 'Geral';
}

export function aggregateRequestsBySubject(logs: ApiRequestLog[]) {
  const map = new Map<string, number>();
  for (const log of logs) {
    const subject = getRequestSubject(log.requestType);
    map.set(subject, (map.get(subject) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([subject, count]) => ({ subject, count }))
    .sort((a, b) => b.count - a.count);
}

export async function logApiRequest(data: {
  userId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
}): Promise<void> {
  if (data.path.startsWith('/api/admin') || data.path.includes('/health')) return;

  const requestType = classifyRequestType(data.method, data.path);
  const id = generateId();

  await create(COLLECTIONS.apiRequestLogs, id, {
    userId: data.userId,
    method: data.method,
    path: data.path.split('?')[0],
    requestType,
    statusCode: data.statusCode,
    durationMs: data.durationMs,
    createdAt: nowIso(),
  });

  if (data.userId && data.userId !== 'demo-user') {
    await incrementUserRequestCount(data.userId).catch(() => undefined);
  }
}

export async function listApiRequestLogs(limit = 500): Promise<ApiRequestLog[]> {
  const all = await listAll<ApiRequestLog>(COLLECTIONS.apiRequestLogs);
  return all.slice(0, limit);
}

export function aggregateRequestsByType(logs: ApiRequestLog[]) {
  const map = new Map<string, number>();
  for (const log of logs) {
    map.set(log.requestType, (map.get(log.requestType) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([type, count]) => ({
      type,
      label: getRequestTypeLabel(type),
      count,
    }))
    .sort((a, b) => b.count - a.count);
}
