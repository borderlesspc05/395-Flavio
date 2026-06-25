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

/** Buffer em memória — evita gravar cada request no Firestore (estoura quota). */
const MAX_REQUEST_LOGS = 3000;
const requestLogBuffer: ApiRequestLog[] = [];

function pushRequestLog(entry: ApiRequestLog): void {
  requestLogBuffer.unshift(entry);
  if (requestLogBuffer.length > MAX_REQUEST_LOGS) {
    requestLogBuffer.length = MAX_REQUEST_LOGS;
  }
}

const TYPE_LABELS: Record<string, string> = {
  chat: 'Consultoria IA (chat)',
  blueprint_gate: 'Gate Zero (classificação IA)',
  solution_pick: 'Solution Pick (Design)',
  domain_learnings: 'Domínio — aprendizados IA',
  evolution_loop: 'Loop contínuo IA',
  objectives_suggest: 'Sugestões de objetivos (IA)',
  action_canvas_suggest: 'Sugestão Action Canvas (IA)',
  report_generate: 'Geração de relatório',
  billing_checkout: 'Checkout / plano',
  billing_claim: 'Vínculo de assinatura',
  magnus_memory_sync: 'Sync memória Magnus',
  objective_crud: 'Objetivos',
  action_canvas_crud: 'Action Canvas',
  team_crud: 'Equipe',
  activities: 'Atividades / timeline',
  profile: 'Perfil do usuário',
  workspace: 'Workspace / ciclos',
  support: 'Suporte',
  agent: 'Agente / skills',
  billing_status: 'Status do plano',
  ai_conversations: 'Conversas IA (CRUD)',
  reports_crud: 'Relatórios (leitura)',
  rag: 'RAG / indexação',
  other: 'Outras requisições',
};

export function classifyRequestType(method: string, path: string): string {
  const p = path.split('?')[0];
  if (p.includes('/ai/chat')) return 'chat';
  if (p.includes('/ai/blueprint-gate')) return 'blueprint_gate';
  if (p.includes('/ai/solution-pick')) return 'solution_pick';
  if (p.includes('/ai/domain-learnings')) return 'domain_learnings';
  if (p.includes('/ai/evolution-loop')) return 'evolution_loop';
  if (p.includes('/ai/conversations')) return 'ai_conversations';
  if (p.includes('/objectives/suggest')) return 'objectives_suggest';
  if (p.includes('/action-canvases/suggest')) return 'action_canvas_suggest';
  if (p.includes('/reports/generate')) return 'report_generate';
  if (p.includes('/reports/')) return 'reports_crud';
  if (p.includes('/billing/checkout')) return 'billing_checkout';
  if (p.includes('/billing/claim')) return 'billing_claim';
  if (p.includes('/billing/')) return 'billing_status';
  if (p.includes('/magnus-memory')) return 'magnus_memory_sync';
  if (p.includes('/rag')) return 'rag';
  if (p.includes('/objectives')) return 'objective_crud';
  if (p.includes('/action-canvases')) return 'action_canvas_crud';
  if (p.includes('/team-members')) return 'team_crud';
  if (p.includes('/activities')) return 'activities';
  if (p.includes('/me')) return 'profile';
  if (p.includes('/workspace')) return 'workspace';
  if (p.includes('/support')) return 'support';
  if (p.includes('/agent')) return 'agent';
  return 'other';
}

export function getRequestTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type;
}

/** Assunto Magnus Waves (módulo do produto) */
const SUBJECT_LABELS: Record<string, string> = {
  chat: 'Consultoria IA',
  blueprint_gate: 'Gate Zero / Design',
  solution_pick: 'Solution Pick',
  domain_learnings: 'Domínio',
  evolution_loop: 'Loop contínuo',
  objectives_suggest: 'Difusão — Objetivos',
  action_canvas_suggest: 'Difusão — Action Canvas',
  objective_crud: 'Difusão — Objetivos',
  action_canvas_crud: 'Difusão — Action Canvas',
  magnus_memory_sync: 'Memória Magnus Waves',
  report_generate: 'Domínio / Relatórios',
  team_crud: 'Equipe',
  billing_checkout: 'Planos & pagamento',
  billing_claim: 'Planos & pagamento',
  activities: 'Atividades',
  profile: 'Perfil',
  workspace: 'Workspace',
  support: 'Suporte',
  agent: 'Agente',
  billing_status: 'Planos & pagamento',
  ai_conversations: 'Consultoria IA',
  reports_crud: 'Relatórios',
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

  pushRequestLog({
    id,
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
  return limit > 0 ? requestLogBuffer.slice(0, limit) : [...requestLogBuffer];
}

export interface ApiRequestLogQuery {
  page?: number;
  limit?: number;
  type?: string;
  q?: string;
  errorsOnly?: boolean;
}

export function filterApiRequestLogs(
  logs: ApiRequestLog[],
  query: ApiRequestLogQuery
): ApiRequestLog[] {
  const q = (query.q ?? '').trim().toLowerCase();
  const type = query.type?.trim();
  let rows = logs;

  if (type && type !== 'all') {
    rows = rows.filter((r) => r.requestType === type);
  }
  if (query.errorsOnly) {
    rows = rows.filter((r) => r.statusCode >= 400);
  }
  if (q) {
    rows = rows.filter((r) => {
      const label = getRequestTypeLabel(r.requestType).toLowerCase();
      return (
        r.userId.toLowerCase().includes(q) ||
        r.path.toLowerCase().includes(q) ||
        r.requestType.toLowerCase().includes(q) ||
        label.includes(q) ||
        String(r.statusCode).includes(q)
      );
    });
  }
  return rows;
}

export function paginateApiRequestLogs(
  logs: ApiRequestLog[],
  page: number,
  limit: number
): { items: ApiRequestLog[]; total: number; page: number; limit: number; totalPages: number } {
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const safePage = Math.max(page, 1);
  const total = logs.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const offset = (safePage - 1) * safeLimit;
  return {
    items: logs.slice(offset, offset + safeLimit),
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
  };
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

export function aggregateRequestsByDay(logs: ApiRequestLog[], days = 14) {
  const map = new Map<string, number>();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  cutoff.setHours(0, 0, 0, 0);

  for (const log of logs) {
    const d = new Date(log.createdAt);
    if (Number.isNaN(d.getTime()) || d < cutoff) continue;
    const key = d.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  const rows: { date: string; label: string; count: number }[] = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(cutoff);
    d.setDate(cutoff.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    rows.push({
      date: key,
      label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      count: map.get(key) ?? 0,
    });
  }
  return rows;
}

export function aggregateRequestHealth(logs: ApiRequestLog[]) {
  let total = logs.length;
  let errors = 0;
  let totalDuration = 0;
  for (const log of logs) {
    if (log.statusCode >= 400) errors += 1;
    totalDuration += log.durationMs ?? 0;
  }
  return {
    total,
    errors,
    errorRatePercent: total ? Math.round((errors / total) * 100) : 0,
    avgDurationMs: total ? Math.round(totalDuration / total) : 0,
  };
}
