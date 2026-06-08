import axios, { type InternalAxiosRequestConfig } from 'axios';
import { onAuthStateChanged } from 'firebase/auth';
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

async function getUserId(): Promise<string | null> {
  if (auth.currentUser) return auth.currentUser.uid;
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      resolve(user?.uid || null);
    });
  });
}

async function withUserId<T>(fn: (userId: string | null) => Promise<T>): Promise<T> {
  const userId = await getUserId();
  return fn(userId);
}

function getActiveCycleId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('mm.activeCycleId');
}

function scopeParams(userId: string | null, extra?: Record<string, string>) {
  const cycleId = getActiveCycleId();
  return {
    ...(extra ?? {}),
    ...(userId ? { userId } : {}),
    ...(cycleId ? { cycleId } : {}),
  };
}

export const magnusMemoryApi = {
  sync: (data: { diagnosticContext?: string; gateContext?: string }) =>
    withUserId((userId) =>
      api
        .post('/api/magnus-memory/sync', { ...data, userId: userId || undefined })
        .then((r) => r.data as { ok: boolean; updatedAt?: string })
    ),
};

export const actionCanvasesApi = {
  list: () =>
    withUserId((userId) =>
      api
        .get('/api/action-canvases', { params: scopeParams(userId) })
        .then((r) => r.data as import('../types').ActionCanvas[])
    ),
  create: (data: unknown) =>
    withUserId((userId) =>
      api
        .post('/api/action-canvases', {
          userId: userId || 'demo-user',
          cycleId: getActiveCycleId() || undefined,
          ...(data as object),
        })
        .then((r) => r.data as import('../types').ActionCanvas)
    ),
  update: (id: string, data: unknown) =>
    withUserId((userId) =>
      api
        .patch(`/api/action-canvases/${id}`, data, {
          params: userId ? { userId } : {},
        })
        .then((r) => r.data as import('../types').ActionCanvas)
    ),
  remove: (id: string) =>
    withUserId((userId) =>
      api.delete(`/api/action-canvases/${id}`, { params: userId ? { userId } : {} })
    ),
  suggest: (data?: { diagnosticContext?: string; gateContext?: string }) =>
    withUserId((userId) =>
      api
        .post('/api/action-canvases/suggest', {
          userId: userId || undefined,
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
        )
    ),
};

export const objectivesApi = {
  list: (params?: Record<string, string>) =>
    withUserId((userId) =>
      api.get('/api/objectives', { params: scopeParams(userId, params) }).then((r) => r.data)
    ),
  create: (data: unknown) =>
    withUserId((userId) =>
      api.post('/api/objectives', {
        userId: userId || 'demo-user',
        cycleId: getActiveCycleId() || undefined,
        ...(data as object),
      }).then((r) => r.data)
    ),
  update: (id: string, data: unknown) =>
    api.patch(`/api/objectives/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/objectives/${id}`).then((r) => r.data),
  suggest: (context?: string) =>
    withUserId((userId) =>
      api
        .post('/api/objectives/suggest', { userId: userId || 'demo-user', context })
        .then((r) => normalizeSuggestResponse(r.data))
    ),
};

export const teamApi = {
  list: (params?: Record<string, string>) =>
    withUserId((userId) => api.get('/api/team-members', { params: { ...params, ...(userId ? { userId } : {}) } }).then((r) => r.data)),
  create: (data: unknown) =>
    withUserId((userId) => api.post('/api/team-members', { userId: userId || 'demo-user', ...(data as object) }).then((r) => r.data)),
  update: (id: string, data: unknown) =>
    api.patch(`/api/team-members/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/team-members/${id}`).then((r) => r.data),
  sendDevelopmentEmail: (id: string) =>
    withUserId((userId) =>
      api
        .post(
          `/api/team-members/${id}/development-email`,
          { userId: userId || undefined, cycleId: getActiveCycleId() || undefined },
          { params: scopeParams(userId) }
        )
        .then((r) => r.data as { ok: boolean; demoMode: boolean; preview?: string })
    ),
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
  models: () => api.get('/api/ai/models').then((r) => normalizeModels(r.data)),
  conversations: () =>
    withUserId((userId) =>
      api
        .get('/api/ai/conversations', { params: userId ? { userId } : {} })
        .then((r) => normalizeConversationsList(r.data))
    ),
  conversation: (id: string) =>
    api.get(`/api/ai/conversations/${id}`).then((r) => normalizeConversationDetail(r.data)),
  chat: (data: {
    conversationId?: string;
    content: string;
    modelId?: string;
    diagnosticContext?: string;
    gateContext?: string;
  }) =>
    withUserId((userId) =>
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
            userId: userId || undefined,
          },
          { timeout: CHAT_TIMEOUT }
        )
        .then((r) => normalizeChatResponse(r.data))
    ),
  updateTitle: (id: string, title: string) =>
    api.patch(`/api/ai/conversations/${id}/title`, { title }).then((r) => r.data),
  updateModel: (id: string, modelId: string) =>
    api.patch(`/api/ai/conversations/${id}/model`, { model: modelId }).then((r) => r.data),
  blueprintGateSuggest: (diagnosticContext: string) =>
    withUserId((userId) =>
      api
        .post(
          '/api/ai/blueprint-gate',
          { diagnosticContext, userId: userId || undefined },
          { timeout: CHAT_TIMEOUT }
        )
        .then((r) => r.data as { reply: string; parsed: BlueprintGateParsed; localFallback?: boolean })
        .catch((err: unknown) => {
          if (axios.isAxiosError(err) && err.response?.status === 404) {
            return localBlueprintGateSuggest(diagnosticContext);
          }
          throw err;
        })
    ),
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
    withUserId((userId) =>
      api
        .get('/api/reports', { params: userId ? { userId } : {} })
        .then((r) => {
          const data = r.data;
          const list = Array.isArray(data) ? data : [];
          return list.map((item) => normalizeReport(item));
        })
    ),
  get: (id: string) => api.get(`/api/reports/${id}`).then((r) => normalizeReport(r.data)),
  generate: (type?: string) =>
    withUserId((userId) =>
      api
        .post('/api/reports/generate', { userId: userId || 'demo-user', type: type || 'completo' })
        .then((r) => normalizeReport(r.data))
    ),
};

export const activitiesApi = {
  list: (params?: Record<string, string>) =>
    withUserId((userId) => api.get('/api/activities', { params: { ...params, ...(userId ? { userId } : {}) } }).then((r) => r.data)),
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
    withUserId((userId) =>
      api
        .get('/api/agent/settings', { params: userId ? { userId } : {} })
        .then((r) => r.data as AgentSettingsDto)
    ),
  saveSettings: (data: Partial<AgentSettingsDto>) =>
    withUserId((userId) =>
      api
        .put('/api/agent/settings', { ...(userId ? { userId } : {}), ...data })
        .then((r) => r.data as AgentSettingsDto)
    ),
  listSkills: () =>
    withUserId((userId) =>
      api
        .get('/api/agent/skills', { params: userId ? { userId } : {} })
        .then((r) => (Array.isArray(r.data) ? (r.data as AgentSkillDto[]) : []))
    ),
  createSkill: (data: Partial<AgentSkillDto>) =>
    withUserId((userId) =>
      api
        .post('/api/agent/skills', { ...(userId ? { userId } : {}), ...data })
        .then((r) => r.data as AgentSkillDto)
    ),
  updateSkill: (id: string, data: Partial<AgentSkillDto>) =>
    api.patch(`/api/agent/skills/${id}`, data).then((r) => r.data as AgentSkillDto),
  removeSkill: (id: string) =>
    api.delete(`/api/agent/skills/${id}`).then((r) => r.data),
};
