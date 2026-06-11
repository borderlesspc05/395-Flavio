export type SupportMessageRole = 'user' | 'admin';

export interface SupportMessage {
  id: string;
  role: SupportMessageRole;
  body: string;
  createdAt: string;
  authorLabel?: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  status: 'open' | 'closed';
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
  unreadByAdmin: number;
  unreadByUser: number;
}
