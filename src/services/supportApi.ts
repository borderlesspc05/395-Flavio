import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { api } from './api';
import type { SupportTicket } from '../types/supportChat';

async function getUserContext() {
  const user = auth.currentUser;
  if (user) {
    return {
      userId: user.uid,
      userEmail: user.email ?? '',
      userDisplayName: user.displayName ?? user.email?.split('@')[0] ?? 'Usuário',
    };
  }
  return new Promise<{ userId: string; userEmail: string; userDisplayName: string } | null>(
    (resolve) => {
      const unsub = onAuthStateChanged(auth, (u) => {
        unsub();
        if (!u) {
          resolve(null);
          return;
        }
        resolve({
          userId: u.uid,
          userEmail: u.email ?? '',
          userDisplayName: u.displayName ?? u.email?.split('@')[0] ?? 'Usuário',
        });
      });
    }
  );
}

export const supportApi = {
  getThread: async () => {
    const ctx = await getUserContext();
    if (!ctx) throw new Error('Faça login para falar com o suporte.');
    const res = await api.get<{ ticket: SupportTicket }>('/api/support/thread', {
      params: {
        userId: ctx.userId,
        userEmail: ctx.userEmail,
        userDisplayName: ctx.userDisplayName,
      },
    });
    return res.data.ticket;
  },

  sendMessage: async (body: string) => {
    const ctx = await getUserContext();
    if (!ctx) throw new Error('Faça login para falar com o suporte.');
    const res = await api.post<{ ticket: SupportTicket }>('/api/support/messages', {
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      userDisplayName: ctx.userDisplayName,
      body,
    });
    return res.data.ticket;
  },

  markRead: async () => {
    const ctx = await getUserContext();
    if (!ctx) return null;
    const res = await api.post<{ ticket: SupportTicket | null }>('/api/support/read', {
      userId: ctx.userId,
    });
    return res.data.ticket;
  },
};
