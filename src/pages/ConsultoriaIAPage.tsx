import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { buildDiagnosticContext } from '../constants/diagnosticFlow';
import { MagnusMemoryBanner } from '../components/MagnusMemoryBanner';
import { loadMagnusWavesMemory, type MagnusWavesMemoryMeta } from '../services/magnusWavesMemory';
import { syncMagnusMemoryFromFirebase } from '../services/magnusMemorySync';
import { buildGateContextAppendix } from '../constants/blueprintFlow';
import { getInitialForm } from '../services/initialForm';
import { resolveConsultoriaUiPhase, writeConsultoriaGateUiPhase } from '../constants/consultoriaGateUi';
import { getBlueprintGate, type BlueprintGateDoc } from '../services/blueprintGate';
import { GateZeroPanel } from '../components/GateZeroPanel';
import ReactMarkdown from 'react-markdown';
import {
  Bot,
  ChevronRight,
  Clock,
  GitBranch,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  Sparkles,
  Target,
  User,
  X,
  Check,
  Zap,
} from 'lucide-react';
import { agentApi, aiApi, type AgentSkillDto } from '../services/api';
import type { ChatMessage, InitialFormData } from '../types';

const SUGGESTIONS = [
  'Com base no diagnóstico 1.1-1.5, qual solução deve entrar primeiro no MM Blueprint?',
  'Transforme o diagnóstico em um MM Blueprint final e indique objetivos para a Difusão.',
  'Quais ações devo evitar agora segundo o Solution Pick?',
  'Monte um roadmap 0-30, 30-90 e 90-180 dias a partir do canvas.',
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
  const [chatDemoModeBanner, setChatDemoModeBanner] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [diagnosticComplete, setDiagnosticComplete] = useState<boolean | null>(null);
  const [diagnosticData, setDiagnosticData] = useState<InitialFormData | null>(null);
  const [memoryMeta, setMemoryMeta] = useState<MagnusWavesMemoryMeta | null>(null);
  const [memoryStatus, setMemoryStatus] = useState('');
  const [gateDoc, setGateDoc] = useState<BlueprintGateDoc | null>(null);
  const [gateLoading, setGateLoading] = useState(false);
  /** Com diagnóstico completo: `gate` = só tela Gate Zero; `chat` = só chat (persistido por utilizador). */
  const [uiPhase, setUiPhase] = useState<'gate' | 'chat'>('chat');
  const [skills, setSkills] = useState<AgentSkillDto[]>([]);
  const [skillMenuOpen, setSkillMenuOpen] = useState(false);
  const [skillSearch, setSkillSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeConv = conversations.find((c) => c.id === activeId);

  const enabledSkills = skills.filter((s) => s.enabled);
  const filteredSkills = skillSearch
    ? enabledSkills.filter(
        (s) =>
          s.slug.toLowerCase().includes(skillSearch.toLowerCase()) ||
          s.title.toLowerCase().includes(skillSearch.toLowerCase())
      )
    : enabledSkills;

  useEffect(() => {
    agentApi
      .listSkills()
      .then((list) => setSkills(list))
      .catch(() => setSkills([]));
  }, []);

  const insertSkillSlug = (slug: string) => {
    const el = inputRef.current;
    if (!el) {
      setInput((prev) => `${prev}${prev.endsWith(' ') || prev === '' ? '' : ' '}/${slug} `);
      setSkillMenuOpen(false);
      setSkillSearch('');
      return;
    }
    const value = el.value;
    const caret = el.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const after = value.slice(caret);
    const lastSlashIdx = before.lastIndexOf('/');
    const safeStart =
      lastSlashIdx >= 0 && /^\/[a-z0-9_-]*$/i.test(before.slice(lastSlashIdx))
        ? lastSlashIdx
        : before.length;
    const updated = `${before.slice(0, safeStart)}/${slug} ${after}`;
    setInput(updated);
    setSkillMenuOpen(false);
    setSkillSearch('');
    requestAnimationFrame(() => {
      const pos = safeStart + slug.length + 2;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);
    const caret = e.target.selectionStart ?? value.length;
    const before = value.slice(0, caret);
    const match = before.match(/(?:^|\s)\/([a-z0-9_-]*)$/i);
    if (match) {
      setSkillMenuOpen(true);
      setSkillSearch(match[1]);
    } else {
      setSkillMenuOpen(false);
      setSkillSearch('');
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setDiagnosticComplete(null);
        setUiPhase('chat');
        return;
      }
      getInitialForm(user.uid)
        .then(({ data, completedAt }) => {
          setDiagnosticComplete(!!completedAt);
          setDiagnosticData(data);
          if (completedAt) {
            void syncMagnusMemoryFromFirebase();
            void loadMagnusWavesMemory(user.uid).then((m) => {
              setMemoryMeta(m.meta);
              setMemoryStatus(m.statusLabel);
            });
          } else {
            setMemoryMeta(null);
            setMemoryStatus('');
          }
          if (completedAt) {
            setGateLoading(true);
            getBlueprintGate(user.uid)
              .then((g) => {
                setGateDoc(g);
                setUiPhase(resolveConsultoriaUiPhase(user.uid, g));
              })
              .catch(() => {
                setGateDoc(null);
                setUiPhase('gate');
              })
              .finally(() => setGateLoading(false));
          } else {
            setGateDoc(null);
            setGateLoading(false);
            setUiPhase('chat');
          }
        })
        .catch(() => {
          setDiagnosticComplete(false);
          setDiagnosticData(null);
          setGateDoc(null);
          setGateLoading(false);
          setUiPhase('chat');
        });
    });
    return unsub;
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleGateDocChange = useCallback((doc: BlueprintGateDoc | null) => {
    setGateDoc(doc);
    const has = Boolean(doc?.selectedPath || doc?.skipped);
    if (!doc || !has) {
      setUiPhase('gate');
    }
  }, []);

  const commitToChatPhase = useCallback(() => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      writeConsultoriaGateUiPhase(uid, 'chat');
      void loadMagnusWavesMemory(uid).then((m) => {
        setMemoryMeta(m.meta);
        setMemoryStatus(m.statusLabel);
      });
    }
    setUiPhase('chat');
  }, []);

  const openGateRevision = useCallback(() => {
    const uid = auth.currentUser?.uid;
    if (uid) writeConsultoriaGateUiPhase(uid, 'gate');
    setUiPhase('gate');
  }, []);

  const cancelGateRevision = useCallback(() => {
    const uid = auth.currentUser?.uid;
    if (uid) writeConsultoriaGateUiPhase(uid, 'chat');
    setUiPhase('chat');
  }, []);

  const loadConversations = useCallback(async () => {
    const data = await aiApi.conversations();
    const list = (Array.isArray(data) ? data : []).map((raw) => {
      const c = raw as ConvSummary;
      return {
        ...c,
        currentModelId: c.currentModelId || c.model,
        preview: c.preview || c.title,
      };
    });
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
      const msgs = mapMessages((conv.messages || []) as ServerMessage[], id);
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
      const diagnosticContext = diagnosticData ? buildDiagnosticContext(diagnosticData) : undefined;
      const gateContext =
        gateDoc?.selectedPath != null
          ? buildGateContextAppendix(gateDoc.selectedPath, {
              aiRecommendedPath: gateDoc.aiRecommendedPath,
              rationale: gateDoc.rationale,
            })
          : undefined;

      const result = await aiApi.chat({
        conversationId: activeId || undefined,
        content,
        modelId: selectedModel || undefined,
        diagnosticContext,
        gateContext,
      });

      const convId = result.conversationId as string;
      setActiveId(convId);

      setChatDemoModeBanner(Boolean(result.demoMode));

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
      const ax = err as {
        code?: string;
        message?: string;
        response?: { status?: number; data?: { error?: string } };
      };
      if (ax.code === 'ECONNABORTED') {
        setError('A resposta demorou mais que o esperado. Tente novamente.');
      } else if (ax.response?.status === 400) {
        setError(ax.response.data?.error || 'Requisição inválida. Tente enviar a mensagem novamente.');
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

  const showConsultoriaGate = diagnosticComplete === true && (gateLoading || uiPhase === 'gate');
  const showConsultoriaChat =
    diagnosticComplete !== true || (!gateLoading && uiPhase === 'chat');
  const gateRevisionMode =
    !gateLoading &&
    uiPhase === 'gate' &&
    Boolean(gateDoc?.selectedPath || gateDoc?.skipped);

  return (
    <div
      className={`consultoria-ia${
        showConsultoriaGate && !gateLoading ? ' consultoria-ia--gate-phase' : ''
      }`}
    >
      {diagnosticComplete === false && (
        <div className="consultoria-gate-banner" style={{ margin: '0 1rem 0', maxWidth: 1200 }}>
          Complete o <strong>Human-to-Business Canvas</strong> (Onda 1 — Diagnóstico) antes do MM
          Blueprint.{' '}
          <Link to="/dashboard/initial-form">Ir para o diagnóstico</Link>
        </div>
      )}
      {showConsultoriaGate && (
        <GateZeroPanel
          diagnosticContext={
            diagnosticData ? buildDiagnosticContext(diagnosticData) : ''
          }
          gateDoc={gateDoc}
          gateLoading={gateLoading}
          onGateDocChange={handleGateDocChange}
          revisionMode={gateRevisionMode}
          onCommitted={commitToChatPhase}
          onCancelRevision={gateRevisionMode ? cancelGateRevision : undefined}
        />
      )}
      {showConsultoriaChat && (
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
              {diagnosticComplete === true &&
                uiPhase === 'chat' &&
                (gateDoc?.selectedPath || gateDoc?.skipped) && (
                  <button
                    type="button"
                    className="chat-gate-revisit-button"
                    onClick={openGateRevision}
                  >
                    <GitBranch size={15} aria-hidden />
                    Refazer escolha (Gate Zero)
                  </button>
                )}
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

          {diagnosticComplete === true && uiPhase === 'chat' && (
            <div className="consultoria-memory-wrap">
              <MagnusMemoryBanner
                meta={memoryMeta}
                statusLabel={memoryStatus}
                compact
              />
            </div>
          )}

          <div className="chat-messages">
            {chatDemoModeBanner && (
              <div className="chat-demo-mode-banner" role="status">
                <div className="chat-demo-mode-banner-inner">
                  <Zap size={20} className="chat-demo-mode-icon" aria-hidden />
                  <div>
                    <p className="chat-demo-mode-title">Modo demonstração (respostas fixas de teste)</p>
                    <p className="chat-demo-mode-text">
                      O backend está sem chave de IA. Configure <code>OPENAI_API_KEY</code> ou{' '}
                      <code>OPENROUTER_API_KEY</code> no servidor (<code>server/.env</code> local ou
                      Render) para usar o modelo real.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="chat-demo-mode-dismiss"
                  onClick={() => setChatDemoModeBanner(false)}
                  aria-label="Fechar aviso de modo demonstração"
                >
                  <X size={18} />
                </button>
              </div>
            )}
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

            {showObjectivesBanner && messages.length > 0 && (
              <div className="chat-objectives-banner">
                <div className="chat-objectives-banner-content">
                  <Target size={20} />
                  <div>
                    <p className="chat-objectives-banner-title">Transforme insights em objetivos</p>
                    <p className="chat-objectives-banner-description">
                      Leve o diagnóstico e o MM Blueprint para a Difusão e gere objetivos prontos para execução.
                    </p>
                  </div>
                </div>
                <Link
                  to="/dashboard/objetivos"
                  state={{ generateFromDesign: true }}
                  className="chat-objectives-banner-button"
                >
                  Gerar objetivos
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
                <h2 className="chat-empty-title">Onda 2 — Design · MM Blueprint</h2>
                <p className="chat-empty-description">
                  {gateDoc?.selectedPath || gateDoc?.skipped ? (
                    <>
                      O contexto do diagnóstico e do <strong>Gate Zero</strong> já entram nas respostas.
                      Use as sugestões abaixo ou escreva sua própria pergunta.
                    </>
                  ) : (
                    <>
                      Confirme o <strong>Gate Zero</strong> (Caminho A ou B) na etapa anterior. Depois, a
                      IA conduz o Blueprint: Outcome Forge → Build → Impact Evaluation — com clareza para
                      agir, sem atalhos que ignorem o diagnóstico.
                    </>
                  )}
                </p>
                {showObjectivesBanner && (
                  <div className="chat-empty-objectives-hint">
                    <Target size={18} aria-hidden />
                    <p>
                      Transforme insights em objetivos estratégicos na aba{' '}
                      <Link to="/dashboard/objetivos" state={{ generateFromDesign: true }}>
                        Objetivos
                      </Link>.
                    </p>
                  </div>
                )}
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

          <div id="consultoria-chat-anchor" className="chat-input-container">
            <div className="chat-input-wrapper">
              {skillMenuOpen && filteredSkills.length > 0 && (
                <div className="chat-skill-menu" role="listbox" aria-label="Skills disponíveis">
                  <div className="chat-skill-menu-header">
                    <Zap size={12} aria-hidden />
                    <span>Skills disponíveis</span>
                  </div>
                  {filteredSkills.slice(0, 6).map((skill) => (
                    <button
                      key={skill.id}
                      type="button"
                      className="chat-skill-menu-item"
                      onClick={() => insertSkillSlug(skill.slug)}
                      role="option"
                      aria-selected={false}
                    >
                      <span className="chat-skill-menu-slug">/{skill.slug}</span>
                      <span className="chat-skill-menu-title">{skill.title}</span>
                    </button>
                  ))}
                </div>
              )}
              <input
                ref={inputRef}
                type="text"
                className="chat-input"
                placeholder="Digite sua pergunta — ou use /skill para ativar habilidades"
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Escape' && skillMenuOpen) {
                    setSkillMenuOpen(false);
                    return;
                  }
                  if (e.key === 'Tab' && skillMenuOpen && filteredSkills.length > 0) {
                    e.preventDefault();
                    insertSkillSlug(filteredSkills[0].slug);
                    return;
                  }
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
      )}
    </div>
  );
}
