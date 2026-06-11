import { COLLECTIONS } from '../config/env';
import { create, getById, listAll, update } from './storage';
import { generateId, nowIso } from '../utils/id';
import { AppError } from '../utils/errors';

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

function ticketIdForUser(userId: string) {
  return `support_${userId}`;
}

export async function getTicketForUser(userId: string): Promise<SupportTicket | null> {
  return getById<SupportTicket>(COLLECTIONS.supportTickets, ticketIdForUser(userId));
}

export async function getOrCreateTicket(
  userId: string,
  meta?: { userEmail?: string; userDisplayName?: string }
): Promise<SupportTicket> {
  const id = ticketIdForUser(userId);
  const existing = await getById<SupportTicket>(COLLECTIONS.supportTickets, id);
  if (existing) {
    const patch: Partial<SupportTicket> = {};
    if (meta?.userEmail && meta.userEmail !== existing.userEmail) patch.userEmail = meta.userEmail;
    if (meta?.userDisplayName && meta.userDisplayName !== existing.userDisplayName) {
      patch.userDisplayName = meta.userDisplayName;
    }
    if (Object.keys(patch).length > 0) {
      const updated = await update<SupportTicket>(COLLECTIONS.supportTickets, id, patch);
      return updated ?? existing;
    }
    return existing;
  }

  const now = nowIso();
  const ticket: SupportTicket = {
    id,
    userId,
    userEmail: meta?.userEmail?.trim() || '',
    userDisplayName: meta?.userDisplayName?.trim() || 'Usuário',
    status: 'open',
    messages: [],
    createdAt: now,
    updatedAt: now,
    unreadByAdmin: 0,
    unreadByUser: 0,
  };
  await create(COLLECTIONS.supportTickets, id, ticket);
  return ticket;
}

export async function appendUserMessage(
  userId: string,
  body: string,
  meta?: { userEmail?: string; userDisplayName?: string }
): Promise<SupportTicket> {
  const trimmed = body.trim();
  if (!trimmed) throw new AppError(400, 'Mensagem vazia.');

  const ticket = await getOrCreateTicket(userId, meta);
  const message: SupportMessage = {
    id: generateId(),
    role: 'user',
    body: trimmed,
    createdAt: nowIso(),
  };

  const updated = await update<SupportTicket>(COLLECTIONS.supportTickets, ticket.id, {
    messages: [...ticket.messages, message],
    updatedAt: nowIso(),
    status: 'open',
    unreadByAdmin: (ticket.unreadByAdmin ?? 0) + 1,
    userEmail: meta?.userEmail?.trim() || ticket.userEmail,
    userDisplayName: meta?.userDisplayName?.trim() || ticket.userDisplayName,
  });

  if (!updated) throw new AppError(500, 'Não foi possível enviar a mensagem.');
  return updated;
}

export async function appendAdminMessage(
  ticketId: string,
  body: string,
  adminEmail: string
): Promise<SupportTicket> {
  const trimmed = body.trim();
  if (!trimmed) throw new AppError(400, 'Mensagem vazia.');

  const ticket = await getById<SupportTicket>(COLLECTIONS.supportTickets, ticketId);
  if (!ticket) throw new AppError(404, 'Conversa não encontrada.');

  const message: SupportMessage = {
    id: generateId(),
    role: 'admin',
    body: trimmed,
    createdAt: nowIso(),
    authorLabel: 'Suporte Magnus',
  };

  const updated = await update<SupportTicket>(COLLECTIONS.supportTickets, ticketId, {
    messages: [...ticket.messages, message],
    updatedAt: nowIso(),
    status: 'open',
    unreadByUser: (ticket.unreadByUser ?? 0) + 1,
    unreadByAdmin: 0,
  });

  if (!updated) throw new AppError(500, 'Não foi possível responder.');
  return updated;
}

export async function listSupportTickets(): Promise<SupportTicket[]> {
  const tickets = await listAll<SupportTicket>(COLLECTIONS.supportTickets, 'updatedAt');
  return tickets.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function markReadByUser(userId: string): Promise<SupportTicket | null> {
  const ticket = await getTicketForUser(userId);
  if (!ticket || ticket.unreadByUser === 0) return ticket;
  return update<SupportTicket>(COLLECTIONS.supportTickets, ticket.id, { unreadByUser: 0 });
}

export async function markReadByAdmin(ticketId: string): Promise<SupportTicket | null> {
  const ticket = await getById<SupportTicket>(COLLECTIONS.supportTickets, ticketId);
  if (!ticket || ticket.unreadByAdmin === 0) return ticket;
  return update<SupportTicket>(COLLECTIONS.supportTickets, ticketId, { unreadByAdmin: 0 });
}

export async function markAllReadByAdmin(): Promise<number> {
  const tickets = await listAll<SupportTicket>(COLLECTIONS.supportTickets);
  let updated = 0;
  for (const ticket of tickets) {
    if ((ticket.unreadByAdmin ?? 0) === 0) continue;
    await update<SupportTicket>(COLLECTIONS.supportTickets, ticket.id, { unreadByAdmin: 0 });
    updated += 1;
  }
  return updated;
}

export async function setTicketStatus(
  ticketId: string,
  status: 'open' | 'closed'
): Promise<SupportTicket> {
  const updated = await update<SupportTicket>(COLLECTIONS.supportTickets, ticketId, {
    status,
    updatedAt: nowIso(),
  });
  if (!updated) throw new AppError(404, 'Conversa não encontrada.');
  return updated;
}
