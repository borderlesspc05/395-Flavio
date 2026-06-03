import { api } from './api';
import { auth } from '../config/firebase';
import type { PlanId } from '../constants/plans';

export interface AdminUserRow {
  id: string;
  userId: string;
  email: string;
  displayName?: string;
  planId: PlanId | string;
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
};
