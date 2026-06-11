import { listAll, COLLECTIONS } from './storage';
import type { UserProfile } from './users';
import { listApiRequestLogs, getRequestTypeLabel } from './apiRequestLog';
import { listSupportTickets } from './supportChat';

export type AdminNotificationType = 'user_joined' | 'support_message' | 'api_request';

export interface AdminNotification {
  id: string;
  type: AdminNotificationType;
  title: string;
  body: string;
  createdAt: string;
  meta?: {
    userId?: string;
    ticketId?: string;
    requestId?: string;
  };
}

const NEW_USER_WINDOW_MS = 72 * 60 * 60 * 1000;

export async function getAdminNotifications(limit = 40): Promise<{
  notifications: AdminNotification[];
  unreadSupportCount: number;
}> {
  const [users, requestLogs, tickets] = await Promise.all([
    listAll<UserProfile>(COLLECTIONS.userProfiles),
    listApiRequestLogs(30),
    listSupportTickets(),
  ]);

  const notifications: AdminNotification[] = [];
  const unreadSupportCount = tickets.reduce((sum, ticket) => sum + (ticket.unreadByAdmin ?? 0), 0);
  const userLookup = new Map(users.map((u) => [u.userId, u]));
  const cutoff = Date.now() - NEW_USER_WINDOW_MS;

  for (const user of users) {
    if (new Date(user.firstSeenAt).getTime() < cutoff) continue;
    const name = user.displayName?.trim() || user.email || 'Usuário';
    notifications.push({
      id: `user-${user.userId}`,
      type: 'user_joined',
      title: 'Novo usuário',
      body: `${name} entrou no sistema`,
      createdAt: user.firstSeenAt,
      meta: { userId: user.userId },
    });
  }

  for (const ticket of tickets) {
    if ((ticket.unreadByAdmin ?? 0) === 0) continue;
    const lastUserMsg = [...ticket.messages].reverse().find((m) => m.role === 'user');
    const name = ticket.userDisplayName?.trim() || ticket.userEmail || 'Usuário';
    notifications.push({
      id: `support-${ticket.id}-${lastUserMsg?.id ?? ticket.updatedAt}`,
      type: 'support_message',
      title: 'Mensagem de suporte',
      body: `${name} enviou uma mensagem`,
      createdAt: lastUserMsg?.createdAt ?? ticket.updatedAt,
      meta: { ticketId: ticket.id, userId: ticket.userId },
    });
  }

  for (const log of requestLogs.slice(0, 25)) {
    const profile = userLookup.get(log.userId);
    const name =
      profile?.displayName?.trim() ||
      profile?.email ||
      (log.userId === 'demo-user' ? 'Demo / visitante' : 'Usuário');
    notifications.push({
      id: `req-${log.id}`,
      type: 'api_request',
      title: 'Nova requisição',
      body: `${name} — ${getRequestTypeLabel(log.requestType)}`,
      createdAt: log.createdAt,
      meta: { requestId: log.id, userId: log.userId },
    });
  }

  notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    notifications: notifications.slice(0, limit),
    unreadSupportCount,
  };
}
