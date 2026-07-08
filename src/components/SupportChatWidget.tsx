import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Headphones, MessageCircle, Send, X } from 'lucide-react';
import { aiApi } from '../services/api';
import { supportApi } from '../services/supportApi';
import type { SupportTicket } from '../types/supportChat';

const POLL_MS = 8000;

type ChatMode = 'ai' | 'support';

type MiniAiMessage = {
  id: string;
  role: 'user' | 'assistant';
  body: string;
};

export function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ChatMode>('ai');
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [supportDraft, setSupportDraft] = useState('');
  const [aiDraft, setAiDraft] = useState('');
  const [aiMessages, setAiMessages] = useState<MiniAiMessage[]>([]);
  const [aiConversationId, setAiConversationId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [sendingSupport, setSendingSupport] = useState(false);
  const [sendingAi, setSendingAi] = useState(false);
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
      if (open && mode === 'support' && data.unreadByUser > 0) {
        const updated = await supportApi.markRead();
        if (updated) setTicket(updated);
      }
    } catch {
      if (!silent) setError('Não foi possível carregar o suporte.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [mode, open]);

  useEffect(() => {
    void loadThread(true);
    const id = window.setInterval(() => void loadThread(true), open ? POLL_MS : POLL_MS * 2);
    return () => window.clearInterval(id);
  }, [open, loadThread]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(scrollToBottom);
  }, [open, mode, ticket?.messages.length, aiMessages.length, scrollToBottom]);

  useEffect(() => {
    if (!open || mode !== 'ai' || selectedModel) return;
    aiApi
      .models()
      .then((models) => {
        if (models.length > 0) setSelectedModel(models[0].id);
      })
      .catch(() => {
        /* O chat ainda pode usar o modelo padrão do backend. */
      });
  }, [mode, open, selectedModel]);

  const handleSupportSend = async (e: FormEvent) => {
    e.preventDefault();
    const text = supportDraft.trim();
    if (!text || sendingSupport) return;
    setSendingSupport(true);
    setError(null);
    try {
      const updated = await supportApi.sendMessage(text);
      setTicket(updated);
      setSupportDraft('');
    } catch {
      setError('Não foi possível enviar. Tente de novo.');
    } finally {
      setSendingSupport(false);
    }
  };

  const handleAiSend = async (e: FormEvent) => {
    e.preventDefault();
    const text = aiDraft.trim();
    if (!text || sendingAi) return;

    const userMessage: MiniAiMessage = {
      id: `ai-user-${Date.now()}`,
      role: 'user',
      body: text,
    };

    setAiMessages((prev) => [...prev, userMessage]);
    setAiDraft('');
    setSendingAi(true);
    setError(null);

    try {
      const result = await aiApi.chat({
        conversationId: aiConversationId || undefined,
        content: text,
        modelId: selectedModel || undefined,
      });

      setAiConversationId(String(result.conversationId || aiConversationId || ''));
      setAiMessages((prev) => [
        ...prev,
        {
          id: `ai-assistant-${Date.now()}`,
          role: 'assistant',
          body: result.reply || 'Não consegui gerar uma resposta agora.',
        },
      ]);
    } catch {
      setAiMessages((prev) => prev.filter((msg) => msg.id !== userMessage.id));
      setError('Não foi possível falar com a IA agora. Tente novamente em instantes.');
    } finally {
      setSendingAi(false);
    }
  };

  const unread = !open && (ticket?.unreadByUser ?? 0) > 0;
  const isAi = mode === 'ai';

  return (
    <div className="support-chat-root" aria-live="polite">
      {open && (
        <div className="support-chat-panel" role="dialog" aria-label="Chat Sprint">
          <header className="support-chat-head">
            <div>
              <strong>Chat Sprint</strong>
              <span>{isAi ? 'Consultoria rápida com IA' : 'Resposta da equipe em horário comercial'}</span>
            </div>
            <button type="button" className="support-chat-close" onClick={() => setOpen(false)} aria-label="Fechar">
              <X size={18} />
            </button>
          </header>

          <div className="support-chat-switch" role="tablist" aria-label="Tipo de atendimento">
            <button
              type="button"
              role="tab"
              aria-selected={isAi}
              className={isAi ? 'is-active' : ''}
              onClick={() => setMode('ai')}
            >
              <Bot size={15} aria-hidden />
              IA
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isAi}
              className={!isAi ? 'is-active' : ''}
              onClick={() => setMode('support')}
            >
              <Headphones size={15} aria-hidden />
              Suporte
              {unread && <span className="support-chat-inline-badge" aria-hidden />}
            </button>
          </div>

          <div className="support-chat-messages" ref={listRef}>
            {isAi ? (
              aiMessages.length === 0 ? (
                <p className="support-chat-placeholder">
                  Pergunte sobre diagnóstico, planos de ação, prioridades ou próximos passos do Sprint.
                </p>
              ) : (
                aiMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`support-chat-bubble support-chat-bubble--${msg.role}`}
                  >
                    {msg.role === 'assistant' && <span className="support-chat-author">IA Sprint</span>}
                    <p>{msg.body}</p>
                  </div>
                ))
              )
            ) : loading && !ticket ? (
              <p className="support-chat-placeholder">Carregando...</p>
            ) : ticket && ticket.messages.length === 0 ? (
              <p className="support-chat-placeholder">
                Olá! Conte o que precisa. Um administrador humano vai responder por aqui.
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
            {sendingAi && (
              <div className="support-chat-bubble support-chat-bubble--assistant">
                <span className="support-chat-author">IA Sprint</span>
                <p>Pensando...</p>
              </div>
            )}
          </div>

          {error && (
            <p className="support-chat-error" role="alert">
              {error}
            </p>
          )}

          {isAi ? (
            <form className="support-chat-form" onSubmit={(e) => void handleAiSend(e)}>
              <textarea
                value={aiDraft}
                onChange={(e) => setAiDraft(e.target.value)}
                placeholder="Pergunte para a IA..."
                rows={2}
                disabled={sendingAi}
              />
              <button type="submit" disabled={sendingAi || !aiDraft.trim()} aria-label="Enviar para IA">
                <Send size={16} />
              </button>
            </form>
          ) : (
            <form className="support-chat-form" onSubmit={(e) => void handleSupportSend(e)}>
              <textarea
                value={supportDraft}
                onChange={(e) => setSupportDraft(e.target.value)}
                placeholder="Escreva para o suporte..."
                rows={2}
                disabled={sendingSupport}
              />
              <button type="submit" disabled={sendingSupport || !supportDraft.trim()} aria-label="Enviar para suporte">
                <Send size={16} />
              </button>
            </form>
          )}
        </div>
      )}

      <button
        type="button"
        className={`support-chat-fab ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? 'Fechar chat' : 'Abrir chat Sprint'}
        title="Chat Sprint"
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
        {unread && <span className="support-chat-badge" aria-hidden />}
      </button>
    </div>
  );
}
