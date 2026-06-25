import { api } from './api';
import { auth } from '../config/firebase';
import type { PlanId } from '../constants/plans';
import type { AdminNotificationsPayload } from '../types/adminNotifications';
import type { SupportTicket } from '../types/supportChat';

export interface AdminUserRow {
  id: string;
  userId: string;
  email: string;
  displayName?: string;
  planId: PlanId | string;
  concurrencyLimit?: number | null;
  requestCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  subscriptionStatus: string;
}

export interface AdminRequestLogRow {
  id: string;
  userId?: string;
  createdAt: string;
  userName: string;
  type: string;
  typeLabel: string;
  statusCode: number;
  durationMs: number;
  path: string;
  method: string;
}

export interface AdminRequestLogsPage {
  items: AdminRequestLogRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  typeOptions: { type: string; label: string; count: number }[];
}

export interface AdminRecentRequest {
  id: string;
  userId?: string;
  createdAt: string;
  userName: string;
  typeLabel: string;
  statusCode: number;
  durationMs: number;
}

export interface AdminCountRow {
  label: string;
  count: number;
}

export interface AdminClientAnalytics {
  diagnostics: {
    formsTotal: number;
    formsCompleted: number;
    formsWithChallenge: number;
    cyclesTotal: number;
    cyclesActive: number;
    cyclesArchived: number;
    gatePathA: number;
    gatePathB: number;
    gateSkipped: number;
  };
  businessStages: AdminCountRow[];
  challengeCategories: AdminCountRow[];
  problemNature: AdminCountRow[];
  recentChallenges: Array<{
    userId: string;
    organization?: string;
    stage?: string;
    challenge: string;
    categories: string[];
    updatedAt?: string;
  }>;
}

export interface AdminUserDetail {
  profile: {
    userId: string;
    email: string;
    displayName?: string;
    requestCount: number;
    firstSeenAt: string;
    lastSeenAt: string;
  } | null;
  plan: {
    planId: string;
    planName: string;
    concurrencyLimit: number | null;
    hasActiveSubscription: boolean;
  };
  subscription: { status: string; planId: string; email: string } | null;
  diagnostic: {
    organization?: string;
    product?: string;
    stage?: string;
    mainChallenge?: string;
    challengeCategories?: string[];
    completedAt?: string;
    draftUpdatedAt?: string;
  } | null;
  cycles: Array<{
    id: string;
    label: string;
    status: string;
    cycleNumber?: number;
    completedAt?: string;
  }>;
  gate: {
    selectedPath?: string;
    aiRecommendedPath?: string;
    rationale?: string;
    skipped?: boolean;
  } | null;
  recentRequests: Array<{
    id: string;
    createdAt: string;
    typeLabel: string;
    statusCode: number;
    durationMs: number;
  }>;
  counts: {
    objectives: number;
    actionCanvases: number;
    reports: number;
    conversations: number;
  };
}

export interface PlanSettingsEntry {
  name: string;
  priceLabel: string;
  priceCents: number;
  concurrencyLimit: number | null;
}

export type PlanSettingsMap = Record<PlanId, PlanSettingsEntry>;

export interface AdminDashboard {
  summary: {
    totalUsers: number;
    totalRequests: number;
    activeSubscriptions: number;
    topRequestTypeLabel: string;
    topSubjectLabel: string;
    diagnosticsCompleted: number;
    topChallengeCategory: string;
    errorRatePercent: number;
    avgDurationMs: number;
  };
  users: AdminUserRow[];
  requestsByType: { type: string; label: string; count: number }[];
  requestsBySubject: { subject: string; count: number }[];
  requestsByDay: { date: string; label: string; count: number }[];
  requestHealth: { total: number; errors: number; errorRatePercent: number; avgDurationMs: number };
  clientAnalytics: AdminClientAnalytics;
  planSettings: PlanSettingsMap;
}

async function adminHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export const adminApi = {
  getNotifications: async () => {
    const headers = await adminHeaders();
    const res = await api.get<AdminNotificationsPayload>('/api/admin/notifications', { headers });
    return res.data;
  },

  markAllSupportRead: async () => {
    const headers = await adminHeaders();
    const res = await api.post<{ updated: number }>('/api/admin/support/read-all', {}, { headers });
    return res.data.updated;
  },

  getDashboard: async () => {
    const headers = await adminHeaders();
    const res = await api.get<AdminDashboard>('/api/admin/dashboard', { headers });
    return res.data;
  },

  getRequestLogs: async (params: {
    page?: number;
    limit?: number;
    type?: string;
    q?: string;
    errorsOnly?: boolean;
  }) => {
    const headers = await adminHeaders();
    const search = new URLSearchParams();
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    if (params.type) search.set('type', params.type);
    if (params.q) search.set('q', params.q);
    if (params.errorsOnly) search.set('errorsOnly', '1');
    const qs = search.toString();
    const res = await api.get<AdminRequestLogsPage>(
      `/api/admin/requests${qs ? `?${qs}` : ''}`,
      { headers }
    );
    return res.data;
  },

  getUserDetail: async (userId: string) => {
    const headers = await adminHeaders();
    const res = await api.get<AdminUserDetail>(`/api/admin/users/${userId}/detail`, { headers });
    return res.data;
  },

  updatePlanSettings: async (plans: Partial<PlanSettingsMap>) => {
    const headers = await adminHeaders();
    const res = await api.put<{ plans: PlanSettingsMap }>(
      '/api/admin/settings/plans',
      { plans },
      { headers }
    );
    return res.data.plans;
  },

  listSupportTickets: async () => {
    const headers = await adminHeaders();
    const res = await api.get<{ tickets: SupportTicket[] }>('/api/admin/support/tickets', {
      headers,
    });
    return res.data.tickets;
  },

  sendSupportReply: async (ticketId: string, body: string) => {
    const headers = await adminHeaders();
    const res = await api.post<{ ticket: SupportTicket }>(
      `/api/admin/support/tickets/${ticketId}/messages`,
      { body },
      { headers }
    );
    return res.data.ticket;
  },

  markSupportRead: async (ticketId: string) => {
    const headers = await adminHeaders();
    const res = await api.post<{ ticket: SupportTicket | null }>(
      `/api/admin/support/tickets/${ticketId}/read`,
      {},
      { headers }
    );
    return res.data.ticket;
  },

  setSupportStatus: async (ticketId: string, status: 'open' | 'closed') => {
    const headers = await adminHeaders();
    const res = await api.patch<{ ticket: SupportTicket }>(
      `/api/admin/support/tickets/${ticketId}`,
      { status },
      { headers }
    );
    return res.data.ticket;
  },

  createUser: async (data: {
    email: string;
    password: string;
    displayName?: string;
    planId: PlanId;
    concurrencyLimit?: number | null | string;
  }) => {
    const headers = await adminHeaders();
    const res = await api.post<{
      userId: string;
      email: string;
      planId: PlanId;
      concurrencyLimit: number | null;
    }>('/api/admin/users', data, { headers });
    return res.data;
  },

  updateUserAccess: async (
    userId: string,
    data: { planId?: PlanId; concurrencyLimit?: number | null | string }
  ) => {
    const headers = await adminHeaders();
    const res = await api.patch<{
      userId: string;
      planId: PlanId;
      concurrencyLimit: number | null;
    }>(`/api/admin/users/${userId}`, data, { headers });
    return res.data;
  },
};
