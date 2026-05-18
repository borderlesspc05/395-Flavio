import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  Bot,
  ChevronRight,
  Clock,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Target,
  User,
  X,
  Check,
} from 'lucide-react';
import { aiApi } from '../services/api';
import type { ChatMessage } from '../types';

const SUGGESTIONS = [
  'Como posso melhorar a eficiência operacional?',
  'Quais são as principais oportunidades de crescimento?',
  'Qual é o risco financeiro atual?',
];

interface AiModel {
  id: string;
  name: string;
}

interface ConvSummary {
  id: string;
  title: string;
  preview?: string;
  messageCount?: number;
  currentModelId?: string;
  model?: string;
  updatedAt?: string;
}

interface ServerMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  createdAt?: string;
}

function formatTime(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function mapMessages(raw: ServerMessage[], conversationId: string): ChatMessage[] {
  return raw
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m, i) => ({
      id: `${conversationId}-${i}`,
      conversationId,
      role: m.role as 'user' | 'assistant',
      content: m.content,
      createdAt: m.timestamp || m.createdAt,
    }));
}

export function ConsultoriaIAPage() {
  const [models, setModels] = useState<AiModel[]>([]);
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConv, setLoadingConv] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showObjectivesBanner, setShowObjectivesBanner] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.id === activeId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const loadConversations = useCallback(async () => {
    const data = await aiApi.conversations();
    const list = (Array.isArray(data) ? data : []).map((c: ConvSummary) => ({
      ...c,
      currentModelId: c.currentModelId || c.model,
      preview: c.preview || c.title,
    }));
    setConversations(list);
    return list;
  }, []);

  useEffect(() => {
    aiApi.models().then((data) => {
      const list = Array.isArray(data) ? data : [];
      setModels(list);
      if (list.length > 0) setSelectedModel((prev) => prev || list[0].id);
    });
    loadConversations().catch(() =>
      setError('Não foi possível conectar à API. Verifique sua conexão ou tente novamente em instantes.')
    );
  }, [loadConversations]);

  const loadConversation = async (id: string) => {
    setLoadingConv(true);
    setError(null);
    try {
      const conv = await aiApi.conversation(id);
      const msgs = mapMessages(conv.messages || [], id);
      setMessages(msgs);
      setActiveId(id);
      setSelectedModel(conv.model || conv.currentModelId || selectedModel);
      setTitleDraft(conv.title || 'Nova conversa');
    } catch {
      setError('Não foi possível carregar a conversa.');
    } finally {
      setLoadingConv(false);
    }
  };

  const startNewChat = () => {
    setActiveId(null);
    setMessages([]);
    setTitleDraft('Nova conversa');
    setEditingTitle(false);
    setError(null);
    setSidebarOpen(false);
  };

  const sendMessage = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;

    const tempUser: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversationId: activeId || 'new',
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUser]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const result = await aiApi.chat({
        conversationId: activeId || undefined,
        content,
        modelId: selectedModel || undefined,
      });

      const convId = result.conversationId as string;
      setActiveId(convId);

      const assistant: ChatMessage = {
        id: `assistant-${Date.now()}`,
        conversationId: convId,
        role: 'assistant',
        content: result.reply || '',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev.filter((m) => m.id !== tempUser.id), tempUser, assistant]);

      await loadConversations();
      if (result.suggestedObjectives?.length) {
        setShowObjectivesBanner(true);
      }
    } catch (err: unknown) {
      setMessages((prev) => prev.filter((m) => m.id !== tempUser.id));
      const ax = err as { code?: string; message?: string };
      if (ax.code === 'ECONNABORTED') {
        setError('A resposta demorou mais que o esperado. Tente novamente.');
      } else {
        setError('Erro ao enviar mensagem. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId);
    if (activeId) {
      try {
        await aiApi.updateModel(activeId, modelId);
      } catch {
        /* ignore */
      }
    }
  };

  const saveTitle = async () => {
    if (!activeId || !titleDraft.trim()) {
      setEditingTitle(false);
      return;
    }
    try {
      await aiApi.updateTitle(activeId, titleDraft.trim());
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, title: titleDraft.trim() } : c))
      );
    } catch {
      setError('Não foi possível renomear a conversa.');
    }
    setEditingTitle(false);
  };

  const chatTitle = activeConv?.title || titleDraft || 'Consultoria IA';

  return (
    <div className="consultoria-ia">
      <div className="consultoria-container">
        {sidebarOpen && (
          <div className="history-overlay" onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={`chat-history-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="history-header">
            <div className="history-title-group">
              <MessageSquare size={22} />
              <h2 className="history-title">Histórico</h2>
            </div>
            <button type="button" className="new-chat-button" onClick={startNewChat} aria-label="Nova conversa">
              <Plus size={20} />
            </button>
          </div>
          <div className="history-list">
            {conversations.length === 0 ? (
              <p className="chat-loading">Nenhuma conversa ainda.</p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  className={`history-item ${activeId === conv.id ? 'active' : ''}`}
                  onClick={() => {
                    loadConversation(conv.id);
                    setSidebarOpen(false);
                  }}
                >
                  <div className="history-item-content">
                    <div className="history-item-header">
                      <MessageSquare size={14} className="history-item-icon" />
                      <h3 className="history-item-title">{conv.title}</h3>
                    </div>
                    <p className="history-item-preview">{conv.preview || conv.title}</p>
                    <div className="history-item-footer">
                      <Clock size={12} />
                      <span className="history-item-time">{formatTime(conv.updatedAt)}</span>
                      <span className="history-item-count">
                        {conv.messageCount ?? 0} msgs
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="history-item-arrow" />
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="chat-main">
          <header className="chat-header">
            <button
              type="button"
              className="history-toggle"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir histórico"
            >
              <MessageSquare size={20} />
            </button>
            <div className="chat-header-content">
              {editingTitle && activeId ? (
                <div className="chat-title-edit">
                  <input
                    className="chat-title-input"
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveTitle();
                      if (e.key === 'Escape') setEditingTitle(false);
                    }}
                  />
                  <div className="chat-title-actions">
                    <button type="button" className="chat-title-action-button" onClick={saveTitle}>
                      <Check size={16} />
                    </button>
                    <button
                      type="button"
                      className="chat-title-action-button"
                      onClick={() => setEditingTitle(false)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="chat-title-wrapper">
                  <h1 className="chat-title">{chatTitle}</h1>
                  {activeId && (
                    <button
                      type="button"
                      className="chat-title-edit-button"
                      onClick={() => {
                        setTitleDraft(chatTitle);
                        setEditingTitle(true);
                      }}
                      aria-label="Editar título"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
              )}
              <p className="chat-subtitle">Consultor estratégico Magnus Mind</p>
            </div>
            <div className="chat-model-selector">
              <label className="chat-model-label">
                <Sparkles size={14} />
                Modelo
              </label>
              <select
                className="chat-model-select"
                value={selectedModel}
                onChange={(e) => handleModelChange(e.target.value)}
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </header>

          <div className="chat-messages">
            {error && (
              <div className="chat-error">
                <p>{error}</p>
                <button
                  type="button"
                  className="chat-error-link"
                  onClick={() => {
                    setError(null);
                    void loadConversations();
                    void aiApi.models().then((data) => {
                      const list = Array.isArray(data) ? data : [];
                      setModels(list);
                      if (list.length > 0) setSelectedModel((prev) => prev || list[0].id);
                    });
                  }}
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {showObjectivesBanner && (
              <div className="chat-objectives-banner">
                <div className="chat-objectives-banner-content">
                  <Target size={20} />
                  <div>
                    <p className="chat-objectives-banner-title">Transforme insights em objetivos</p>
                    <p className="chat-objectives-banner-description">
                      Use a Consultoria IA para gerar sugestões e cadastre objetivos estratégicos.
                    </p>
                  </div>
                </div>
                <Link to="/dashboard/objetivos" className="chat-objectives-banner-button">
                  Ver objetivos
                  <ChevronRight size={16} />
                </Link>
                <button
                  type="button"
                  className="chat-objectives-banner-close"
                  onClick={() => setShowObjectivesBanner(false)}
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {loadingConv ? (
              <div className="chat-loading">Carregando conversa...</div>
            ) : messages.length === 0 ? (
              <div className="chat-empty">
                <div className="chat-empty-icon">
                  <Bot size={48} />
                </div>
                <h2 className="chat-empty-title">Consultoria IA Magnus Mind</h2>
                <p className="chat-empty-description">
                  Faça perguntas sobre estratégia, operações, finanças e gestão. O assistente responde
                  com base em frameworks consultivos.
                </p>
                <div className="chat-suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="suggestion-button"
                      onClick={() => sendMessage(s)}
                      disabled={loading}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="messages-container">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`message ${msg.role === 'user' ? 'user-message' : 'ai-message'}`}
                  >
                    <div className="message-content">
                      <div className={`message-avatar ${msg.role === 'user' ? 'user' : ''}`}>
                        {msg.role === 'user' ? (
                          <User size={20} />
                        ) : (
                          <Bot size={20} />
                        )}
                      </div>
                      <div className="message-bubble">
                        <div className="message-text">
                          {msg.role === 'assistant' ? (
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          ) : (
                            <p>{msg.content}</p>
                          )}
                        </div>
                        {msg.createdAt && (
                          <span className="message-time">{formatTime(msg.createdAt)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="message ai-message">
                    <div className="message-content">
                      <div className="message-avatar">
                        <Bot size={20} />
                      </div>
                      <div className="ai-thinking">
                        <div className="thinking-indicator">
                          <span className="thinking-dot" />
                          <span className="thinking-dot" />
                          <span className="thinking-dot" />
                        </div>
                        <span className="thinking-text">Pensando...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="chat-input-container">
            <div className="chat-input-wrapper">
              <input
                type="text"
                className="chat-input"
                placeholder="Digite sua pergunta..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                disabled={loading}
              />
              <button
                type="button"
                className="chat-send-button"
                onClick={() => sendMessage(input)}
                disabled={loading || !input.trim()}
                aria-label="Enviar"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
