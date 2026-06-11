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

export interface AdminRecentRequest {
  id: string;
  createdAt: string;
  userName: string;
  typeLabel: string;
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
  };
  users: AdminUserRow[];
  requestsByType: { type: string; label: string; count: number }[];
  requestsBySubject: { subject: string; count: number }[];
  recentRequests: AdminRecentRequest[];
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
