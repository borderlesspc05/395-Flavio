import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { supportApi } from '../services/supportApi';
import type { SupportTicket } from '../types/supportChat';

const POLL_MS = 8000;

export function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const loadThread = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await supportApi.getThread();
      setTicket(data);
      if (open && data.unreadByUser > 0) {
        const updated = await supportApi.markRead();
        if (updated) setTicket(updated);
      }
    } catch {
      if (!silent) setError('Não foi possível carregar o suporte.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    void loadThread(true);
    const id = window.setInterval(() => void loadThread(true), open ? POLL_MS : POLL_MS * 2);
    return () => window.clearInterval(id);
  }, [open, loadThread]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(scrollToBottom);
    }
  }, [open, ticket?.messages.length, scrollToBottom]);

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const updated = await supportApi.sendMessage(text);
      setTicket(updated);
      setDraft('');
    } catch {
      setError('Não foi possível enviar. Tente de novo.');
    } finally {
      setSending(false);
    }
  };

  const unread = !open && (ticket?.unreadByUser ?? 0) > 0;

  return (
    <div className="support-chat-root" aria-live="polite">
      {open && (
        <div className="support-chat-panel" role="dialog" aria-label="Chat com suporte">
          <header className="support-chat-head">
            <div>
              <strong>Suporte Magnus</strong>
              <span>Resposta da equipe em horário comercial</span>
            </div>
            <button type="button" className="support-chat-close" onClick={handleClose} aria-label="Fechar">
              <X size={18} />
            </button>
          </header>

          <div className="support-chat-messages" ref={listRef}>
            {loading && !ticket ? (
              <p className="support-chat-placeholder">Carregando…</p>
            ) : ticket && ticket.messages.length === 0 ? (
              <p className="support-chat-placeholder">
                Olá! Conte o que precisa. Um administrador vai responder por aqui.
              </p>
            ) : (
              ticket?.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`support-chat-bubble support-chat-bubble--${msg.role}`}
                >
                  {msg.role === 'admin' && (
                    <span className="support-chat-author">{msg.authorLabel ?? 'Suporte'}</span>
                  )}
                  <p>{msg.body}</p>
                </div>
              ))
            )}
          </div>

          {error && (
            <p className="support-chat-error" role="alert">
              {error}
            </p>
          )}

          <form className="support-chat-form" onSubmit={(e) => void handleSend(e)}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escreva sua mensagem…"
              rows={2}
              disabled={sending}
            />
            <button type="submit" disabled={sending || !draft.trim()} aria-label="Enviar">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className={`support-chat-fab ${open ? 'is-open' : ''}`}
        onClick={() => (open ? handleClose() : handleOpen())}
        aria-expanded={open}
        aria-label={open ? 'Fechar suporte' : 'Falar com o suporte'}
        title="Suporte"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
        {unread && <span className="support-chat-badge" aria-hidden />}
      </button>
    </div>
  );
}
