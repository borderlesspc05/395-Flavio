import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import type { SupportTicket } from '../../types/supportChat';

const POLL_MS = 6000;

function previewMessage(ticket: SupportTicket) {
  const last = ticket.messages[ticket.messages.length - 1];
  if (!last) return 'Sem mensagens ainda';
  return last.body.length > 72 ? `${last.body.slice(0, 72)}…` : last.body;
}

export function AdminSupportPanel() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  const loadTickets = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const list = await adminApi.listSupportTickets();
      setTickets(list);
      setSelectedId((prev) => {
        if (prev && list.some((t) => t.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch {
      if (!silent) setError('Não foi possível carregar conversas de suporte.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets();
    const id = window.setInterval(() => void loadTickets(true), POLL_MS);
    return () => window.clearInterval(id);
  }, [loadTickets]);

  useEffect(() => {
    if (!selectedId) return;
    void adminApi.markSupportRead(selectedId).then((ticket) => {
      if (!ticket) return;
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? ticket : t)));
    });
  }, [selectedId, selected?.messages.length]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [selected?.messages.length]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setError('');
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedId || !draft.trim() || sending) return;
    setSending(true);
    setError('');
    try {
      const ticket = await adminApi.sendSupportReply(selectedId, draft.trim());
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? ticket : t)));
      setDraft('');
    } catch {
      setError('Falha ao enviar resposta.');
    } finally {
      setSending(false);
    }
  };

  const toggleStatus = async () => {
    if (!selected) return;
    const next = selected.status === 'open' ? 'closed' : 'open';
    try {
      const ticket = await adminApi.setSupportStatus(selected.id, next);
      setTickets((prev) => prev.map((t) => (t.id === ticket.id ? ticket : t)));
    } catch {
      setError('Não foi possível atualizar o status.');
    }
  };

  return (
    <section className="admin-support admin-reveal">
      <header className="admin-card-head">
        <h2>Chat de suporte</h2>
        <p>Conversas iniciadas pelos usuários no app</p>
      </header>

      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}

      <div className="admin-support-layout">
        <aside className="admin-support-inbox">
          {loading && tickets.length === 0 ? (
            <p className="admin-support-empty">Carregando…</p>
          ) : tickets.length === 0 ? (
            <p className="admin-support-empty">Nenhuma conversa ainda.</p>
          ) : (
            <ul>
              {tickets.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className={`admin-support-inbox-item ${selectedId === t.id ? 'is-active' : ''}`}
                    onClick={() => handleSelect(t.id)}
                  >
                    <span className="admin-support-inbox-top">
                      <strong>{t.userDisplayName || t.userEmail || t.userId}</strong>
                      {t.unreadByAdmin > 0 && (
                        <span className="admin-support-unread">{t.unreadByAdmin}</span>
                      )}
                    </span>
                    <span className="admin-support-inbox-email">{t.userEmail || '—'}</span>
                    <span className="admin-support-inbox-preview">{previewMessage(t)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="admin-support-thread">
          {!selected ? (
            <p className="admin-support-empty">Selecione uma conversa.</p>
          ) : (
            <>
              <header className="admin-support-thread-head">
                <div>
                  <strong>{selected.userDisplayName}</strong>
                  <span>{selected.userEmail}</span>
                </div>
                <button type="button" className="admin-btn admin-btn--ghost" onClick={() => void toggleStatus()}>
                  {selected.status === 'open' ? 'Encerrar' : 'Reabrir'}
                </button>
              </header>

              <div className="admin-support-messages" ref={listRef}>
                {selected.messages.length === 0 ? (
                  <p className="admin-support-empty">Aguardando primeira mensagem do usuário.</p>
                ) : (
                  selected.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`admin-support-bubble admin-support-bubble--${msg.role}`}
                    >
                      <span className="admin-support-bubble-meta">
                        {msg.role === 'admin' ? msg.authorLabel ?? 'Você' : selected.userDisplayName}
                        {' · '}
                        {new Date(msg.createdAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <p>{msg.body}</p>
                    </div>
                  ))
                )}
              </div>

              <form className="admin-support-compose" onSubmit={(e) => void handleSend(e)}>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Responder ao usuário…"
                  rows={3}
                  disabled={sending || selected.status === 'closed'}
                />
                <button
                  type="submit"
                  className="admin-btn admin-btn--primary"
                  disabled={sending || !draft.trim() || selected.status === 'closed'}
                >
                  <Send size={16} />
                  Enviar
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
