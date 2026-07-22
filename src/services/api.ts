import axios, { type InternalAxiosRequestConfig } from 'axios';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '../config/firebase';
import { localBlueprintGateSuggest } from './blueprintGateLocal';
import {
  acquireClientSlot,
  isConcurrencyLimitedUrl,
  releaseClientSlot,
} from './requestConcurrency';
import {
  normalizeChatResponse,
  normalizeConversationDetail,
  normalizeConversationsList,
  normalizeModels,
  normalizeReport,
  normalizeSuggestResponse,
} from './apiNormalize';
import type { TeamMemberDevelopmentEntry } from '../types';

/** Em dev, usa API local por padrão. Para forçar remoto em dev, defina VITE_USE_LOCAL_API=false. */
const API_BASE_URL =
  import.meta.env.DEV && import.meta.env.VITE_USE_LOCAL_API !== 'false'
    ? ''
    : (import.meta.env.VITE_API_BASE_URL || 'https://three95-flavio-fcha.onrender.com');
const DEFAULT_TIMEOUT = 90000;
const CHAT_TIMEOUT = 120000;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
});

type ConcurrencyAxiosConfig = InternalAxiosRequestConfig & { _concurrencyHeld?: boolean };

/** Envia o Firebase ID token para as rotas autenticadas da API. */
api.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.request.use(async (config) => {
  const cfg = config as ConcurrencyAxiosConfig;
  const path = cfg.url ?? '';
  if (!isConcurrencyLimitedUrl(path)) return config;
  await acquireClientSlot();
  cfg._concurrencyHeld = true;
  return config;
});

api.interceptors.response.use(
  (response) => {
    const cfg = response.config as ConcurrencyAxiosConfig;
    if (cfg._concurrencyHeld) releaseClientSlot();
    return response;
  },
  (error) => {
    const cfg = error.config as ConcurrencyAxiosConfig | undefined;
    if (cfg?._concurrencyHeld) releaseClientSlot();
    return Promise.reject(error);
  }
);

async function getAuthUser(): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user ?? null);
    });
  });
}

async function getAuthToken(): Promise<string | null> {
  const user = await getAuthUser();
  if (!user) return null;
  return user.getIdToken();
}

async function getUserId(): Promise<string | null> {
  const user = await getAuthUser();
  return user?.uid || null;
}

async function withUserId<T>(fn: (userId: string | null) => Promise<T>): Promise<T> {
  const userId = await getUserId();
  return fn(userId);
}

function getActiveCycleId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('mm.activeCycleId');
}

function scopeParams(_userId: string | null, extra?: Record<string, string>) {
  const cycleId = getActiveCycleId();
  return {
    ...(extra ?? {}),
    ...(cycleId ? { cycleId } : {}),
  };
}

export const magnusMemoryApi = {
  sync: (data: { diagnosticContext?: string; gateContext?: string }) =>
    api
      .post('/api/magnus-memory/sync', data)
      .then((r) => r.data as { ok: boolean; updatedAt?: string }),
};

export const actionCanvasesApi = {
  list: () =>
    api
      .get('/api/action-canvases', { params: scopeParams(null) })
      .then((r) => r.data as import('../types').ActionCanvas[]),
  create: (data: unknown) =>
    api
      .post('/api/action-canvases', {
        cycleId: getActiveCycleId() || undefined,
        ...(data as object),
      })
      .then((r) => r.data as import('../types').ActionCanvas),
  update: (id: string, data: unknown) =>
    api.patch(`/api/action-canvases/${id}`, data).then((r) => r.data as import('../types').ActionCanvas),
  remove: (id: string) => api.delete(`/api/action-canvases/${id}`),
  suggest: (data?: { diagnosticContext?: string; gateContext?: string }) =>
    api
      .post('/api/action-canvases/suggest', {
        diagnosticContext: data?.diagnosticContext,
        gateContext: data?.gateContext,
      })
      .then(
        (r) =>
          r.data as {
            suggestions: import('../types').SuggestedActionCanvasDraft[];
            slotsAvailable: number;
            demoMode?: boolean;
          }
      ),
  suggestRisks: (id: string) =>
    api.post(`/api/action-canvases/${id}/suggest-risks`).then(
      (r) =>
        r.data as {
          risks: import('../types').ActionCanvasRisk[];
          demoMode?: boolean;
        }
    ),
  remindRisk: (id: string, riskId: string) =>
    api
      .post(`/api/action-canvases/${id}/risks/${riskId}/remind`)
      .then((r) => r.data as { sent: boolean; demoMode?: boolean; reason?: string }),
  suggestDeliveryActions: (id: string, deliveryId: string) =>
    api.post(`/api/action-canvases/${id}/deliveries/${deliveryId}/suggest-actions`).then(
      (r) =>
        r.data as {
          items: import('../types').DeliveryChecklistItem[];
          demoMode?: boolean;
        }
    ),
  remindChecklistItem: (id: string, deliveryId: string, itemId: string) =>
    api
      .post(`/api/action-canvases/${id}/deliveries/${deliveryId}/checklist/${itemId}/remind`)
      .then((r) => r.data as { sent: boolean; demoMode?: boolean; reason?: string }),
};

export const objectivesApi = {
  list: (params?: Record<string, string>) =>
    api.get('/api/objectives', { params: scopeParams(null, params) }).then((r) => r.data),
  create: (data: unknown) =>
    api.post('/api/objectives', {
      cycleId: getActiveCycleId() || undefined,
      ...(data as object),
    }).then((r) => r.data),
  update: (id: string, data: unknown) =>
    api.patch(`/api/objectives/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/objectives/${id}`).then((r) => r.data),
  suggest: (context?: string) =>
    api
      .post('/api/objectives/suggest', { context })
      .then((r) => normalizeSuggestResponse(r.data)),
};

export const teamApi = {
  list: (params?: Record<string, string>) =>
    api.get('/api/team-members', { params }).then((r) => r.data),
  create: (data: unknown) =>
    api.post('/api/team-members', data as object).then((r) => r.data),
  update: (id: string, data: unknown) =>
    api.patch(`/api/team-members/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/team-members/${id}`).then((r) => r.data),
  getPortalLink: (id: string, rotate = false) =>
    api
      .post(`/api/team-members/${id}/portal-link`, { rotate })
      .then((r) => r.data as { portalUrl: string; memberId: string }),
  sendDevelopmentEmail: (id: string) =>
    api
      .post(
        `/api/team-members/${id}/development-email`,
        { cycleId: getActiveCycleId() || undefined },
        { params: scopeParams(null) }
      )
      .then((r) => r.data as { ok: boolean; demoMode: boolean; preview?: string }),
  listDevelopment: (id: string) =>
    api.get(`/api/team-members/${id}/development`).then((r) => r.data as TeamMemberDevelopmentEntry[]),
  addDevelopment: (id: string, data: { score: number; notes?: string }) =>
    api
      .post(`/api/team-members/${id}/development`, {
        ...data,
        cycleId: getActiveCycleId() || undefined,
      })
      .then((r) => r.data as { entry: TeamMemberDevelopmentEntry; member: Record<string, unknown> }),
};

export const workspaceApi = {
  reset: (options: {
    objectives?: boolean;
    actionCanvases?: boolean;
    reports?: boolean;
    conversations?: boolean;
    magnusMemory?: boolean;
  }) =>
    api
      .post('/api/workspace/reset', options)
      .then((r) => r.data as { ok: boolean; removed: Record<string, number> }),
  archiveCycle: (payload: { cycleNumber: number; label: string; diagnosticContext: string }) =>
    api.post('/api/workspace/archive-cycle', payload).then((r) => r.data as { ok: boolean }),
};

export const aiApi = {
  status: () =>
    api
      .get('/api/ai/status')
      .then((r) => r.data as { configured: boolean; provider: string; defaultModel: string | null }),
  models: () => api.get('/api/ai/models').then((r) => normalizeModels(r.data)),
  conversations: () =>
    api
      .get('/api/ai/conversations')
      .then((r) => normalizeConversationsList(r.data)),
  conversation: (id: string) =>
    api
      .get(`/api/ai/conversations/${id}`)
      .then((r) => normalizeConversationDetail(r.data)),
  chat: (data: {
    conversationId?: string;
    content: string;
    modelId?: string;
    diagnosticContext?: string;
    gateContext?: string;
    cycleId?: string;
  }) =>
    api
      .post(
        '/api/ai/chat',
        {
          content: data.content,
          message: data.content,
          conversationId: data.conversationId,
          model: data.modelId,
          diagnosticContext: data.diagnosticContext,
          gateContext: data.gateContext,
          cycleId: data.cycleId ?? getActiveCycleId() ?? undefined,
        },
        { timeout: CHAT_TIMEOUT }
      )
      .then((r) => normalizeChatResponse(r.data)),
  updateTitle: (id: string, title: string) =>
    api.patch(`/api/ai/conversations/${id}/title`, { title }).then((r) => r.data),
  updateModel: (id: string, modelId: string) =>
    api.patch(`/api/ai/conversations/${id}/model`, { model: modelId }).then((r) => r.data),
  blueprintGateSuggest: (diagnosticContext: string) =>
    api
      .post(
        '/api/ai/blueprint-gate',
        { diagnosticContext },
        { timeout: CHAT_TIMEOUT }
      )
      .then((r) => r.data as { reply: string; parsed: BlueprintGateParsed; localFallback?: boolean })
      .catch((err: unknown) => {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          return localBlueprintGateSuggest(diagnosticContext);
        }
        throw err;
      }),
  suggestSolutionPick: (diagnosticContext: string) =>
    api
      .post(
        '/api/ai/solution-pick-suggest',
        { diagnosticContext },
        { timeout: CHAT_TIMEOUT }
      )
      .then(
        (r) =>
          r.data as {
            suggestions: import('../types/solutionPick').SuggestedSolutionAction[];
            companySummary?: string;
            companySituation?: string;
            demoMode?: boolean;
            demoReason?: string;
            usedRag?: boolean;
            ragChunkCount?: number;
          }
      ),
  suggestDomainLearnings: (context: string) =>
    api
      .post(
        '/api/ai/domain-learnings',
        { context },
        { timeout: CHAT_TIMEOUT }
      )
      .then((r) => r.data as { learnings: string[] }),
  suggestEvolutionLoop: (context: string) =>
    api
      .post(
        '/api/ai/evolution-loop',
        { context },
        { timeout: CHAT_TIMEOUT }
      )
      .then((r) => r.data as import('../types/evolutionLoop').EvolutionLoopResult),
};

/** Resposta do Gate Zero (classificação IA) */
export interface BlueprintGateParsed {
  recommendedPath: 'A' | 'B';
  rationale: string;
  pathASignals: string[];
  pathBSignals: string[];
  questionForUser: string;
}

export const reportsApi = {
  list: () =>
    api
      .get('/api/reports')
      .then((r) => {
        const data = r.data;
        const list = Array.isArray(data) ? data : [];
        return list.map((item) => normalizeReport(item));
      }),
  get: (id: string) => api.get(`/api/reports/${id}`).then((r) => normalizeReport(r.data)),
  generate: (type?: string) =>
    api
      .post('/api/reports/generate', { type: type || 'completo' })
      .then((r) => normalizeReport(r.data)),
};

export const activitiesApi = {
  list: (params?: Record<string, string>) =>
    api.get('/api/activities', { params }).then((r) => r.data),
};

export interface AgentSettingsDto {
  id?: string;
  userId?: string;
  enabled: boolean;
  personaOverride?: string;
  rules?: string;
  tone?: string;
  responseFormat?: string;
  forbidden?: string;
  preferredModel?: string;
  updatedAt?: string;
}

export interface AgentSkillDto {
  id: string;
  userId?: string;
  slug: string;
  title: string;
  description?: string;
  content: string;
  tags?: string[];
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const agentApi = {
  getSettings: () =>
    api
      .get('/api/agent/settings')
      .then((r) => r.data as AgentSettingsDto),
  saveSettings: (data: Partial<AgentSettingsDto>) =>
    api
      .put('/api/agent/settings', data)
      .then((r) => r.data as AgentSettingsDto),
  listSkills: () =>
    api
      .get('/api/agent/skills')
      .then((r) => (Array.isArray(r.data) ? (r.data as AgentSkillDto[]) : [])),
  createSkill: (data: Partial<AgentSkillDto>) =>
    api
      .post('/api/agent/skills', data)
      .then((r) => r.data as AgentSkillDto),
  updateSkill: (id: string, data: Partial<AgentSkillDto>) =>
    api.patch(`/api/agent/skills/${id}`, data).then((r) => r.data as AgentSkillDto),
  removeSkill: (id: string) =>
    api.delete(`/api/agent/skills/${id}`).then((r) => r.data),
};

export const ragApi = {
  indexInitialForm: () =>
    withUserId((userId) => {
      if (!userId) return Promise.resolve({ ok: false });
      return api
        .post('/api/rag/index-initial-form')
        .then((r) => r.data as { ok: boolean })
        .catch((err) => {
          console.warn('[RAG] index-initial-form failed:', err);
          return { ok: false };
        });
    }),
  reindex: () =>
    withUserId(() =>
      api.post('/api/rag/reindex').then(
        (r) =>
          r.data as {
            ok: boolean;
            indexedDocuments: number;
            message: string;
            errors: string[];
          }
      )
    ),
  kpiInsights: (kpiIds?: string[]) =>
    withUserId(() =>
      api
        .post('/api/rag/kpi-insights', kpiIds?.length ? { kpiIds } : {})
        .then(
          (r) =>
            r.data as {
              ok: boolean;
              ragEnabled: boolean;
              vectorConfigured: boolean;
              generatedAt: string;
              insights: Array<{
                kpiId: string;
                detail: string;
                bullets: string[];
                sources: string[];
                usedRag: boolean;
                usedFrameworkRag: boolean;
              }>;
            }
        )
    ),
};
