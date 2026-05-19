import axios from 'axios';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import {
  normalizeChatResponse,
  normalizeConversationDetail,
  normalizeConversationsList,
  normalizeModels,
  normalizeReport,
  normalizeSuggestResponse,
} from './apiNormalize';

/** API no Render por padrão; use VITE_USE_LOCAL_API=true + proxy Vite para backend local. */
const API_BASE_URL =
  import.meta.env.VITE_USE_LOCAL_API === 'true'
    ? ''
    : (import.meta.env.VITE_API_BASE_URL || 'https://three95-flavio.onrender.com');
const DEFAULT_TIMEOUT = 90000;
const CHAT_TIMEOUT = 120000;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
});

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

export const objectivesApi = {
  list: (params?: Record<string, string>) =>
    withUserId((userId) => api.get('/api/objectives', { params: { ...params, ...(userId ? { userId } : {}) } }).then((r) => r.data)),
  create: (data: unknown) =>
    withUserId((userId) => api.post('/api/objectives', { userId: userId || 'demo-user', ...(data as object) }).then((r) => r.data)),
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
  chat: (data: { conversationId?: string; content: string; modelId?: string }) =>
    withUserId((userId) =>
      api
        .post(
          '/api/ai/chat',
          {
            content: data.content,
            message: data.content,
            conversationId: data.conversationId,
            model: data.modelId,
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
};

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
