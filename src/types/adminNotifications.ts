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

export interface AdminNotificationsPayload {
  notifications: AdminNotification[];
  unreadSupportCount: number;
}
