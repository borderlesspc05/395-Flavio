import { Conversation, SuggestedObjective } from '../types';
import { generateId, nowIso } from '../utils/id';
import {
  chatCompletion,
  mockChatReply,
  getDefaultModel,
  isLlmNotConfiguredError,
  type ChatCompletionMessage,
} from './llm';
import { retrieveRelevantContext } from './rag';
import { shouldSearchWeb, webSearch, formatSearchResults, isSearchConfigured } from './search';
import { create, getById, update, COLLECTIONS } from './storage';
import { logActivity } from './activities';
import {
  buildAgentContext,
  getAgentSettings,
  resolveMentionedSkills,
} from './agentConfig';
import {
  buildMagnusWavesMemoryContext,
  MAGNUS_MEMORY_SYSTEM_PREAMBLE,
} from './magnusMemory';

const SYSTEM_PROMPT = `Você é o consultor estratégico Magnus Mind, especializado em gestão, performance humana, OKRs, planejamento e liderança.
Você trabalha com o método Magnus Waves do MM People Sprint 90+:
1.1 Decoding: clareza estratégica, contexto, dor real, cultura, dados e expectativa sobre IA.
1.2 Gap Scan: desired state, current state, severidade do gap, consequências, barreiras e governança.
1.3 System Scan: processos, tarefas, erros, ferramentas, decisões e fricção sistêmica.
1.4 Team Scan: contexto de trabalho, aprendizagem, talentos, onboarding, gestão, estrutura e hipóteses humanas.
1.5 Solution Pick: regras SE-ENTÃO, waves de solução e solução selecionada para o Design.

Responda em português brasileiro, de forma clara, executiva e acionável.
Antes de recomendar treinamento, verifique se o problema é de sistema, contexto, gestão, entrada de talentos ou transferência.
Quando usar o diagnóstico, deixe claro quais evidências sustentam a recomendação e o que NÃO fazer agora.
Quando apropriado, sugira objetivos estratégicos concretos.
Se o usuário pedir objetivos, inclua ao final um bloco JSON válido entre marcadores:
<!-- SUGGESTED_OBJECTIVES -->
[{"titulo":"...","descricao":"...","categoria":"...","prioridade":1}]
<!-- /SUGGESTED_OBJECTIVES -->`;

function parseSuggestedObjectives(content: string): {
  cleanContent: string;
  suggested: SuggestedObjective[];
} {
  const match = content.match(
    /<!--\s*SUGGESTED_OBJECTIVES\s*-->([\s\S]*?)<!--\s*\/SUGGESTED_OBJECTIVES\s*-->/
  );
  if (!match) {
    return { cleanContent: content, suggested: [] };
  }

  let suggested: SuggestedObjective[] = [];
  try {
    const parsed = JSON.parse(match[1].trim());
    if (Array.isArray(parsed)) {
      suggested = parsed.filter(
        (o) => o && typeof o.titulo === 'string' && typeof o.descricao === 'string'
      );
    }
  } catch {
    /* ignore parse errors */
  }

  const cleanContent = content.replace(match[0], '').trim();
  return { cleanContent, suggested };
}

export interface ChatRequest {
  userId: string;
  message: string;
  conversationId?: string;
  model?: string;
  diagnosticContext?: string;
  gateContext?: string;
  suggestObjectives?: boolean;
}

export interface ChatResponse {
  conversationId: string;
  reply: string;
  model: string;
  suggestedObjectives?: SuggestedObjective[];
  usedWebSearch?: boolean;
  usedRag?: boolean;
  invokedSkills?: string[];
  /** true quando caiu no mock por falta de chave de IA */
  demoMode?: boolean;
}

export async function handleChat(req: ChatRequest): Promise<ChatResponse> {
  const agentSettings = await getAgentSettings(req.userId);

  const model =
    req.model ??
    (agentSettings.enabled && agentSettings.preferredModel
      ? agentSettings.preferredModel
      : getDefaultModel());

  let conversation: Conversation | null = null;

  if (req.conversationId) {
    conversation = await getById<Conversation>(COLLECTIONS.conversations, req.conversationId);
    if (conversation && conversation.userId !== req.userId) {
      conversation = null;
    }
  }

  const invokedSkills = await resolveMentionedSkills(req.userId, req.message);
  const agentContext = buildAgentContext(agentSettings, invokedSkills);

  const ragContext = await retrieveRelevantContext(req.userId, req.message);
  let webContext = '';

  if (shouldSearchWeb(req.message)) {
    if (isSearchConfigured()) {
      try {
        const results = await webSearch(req.message);
        webContext = formatSearchResults(results);
      } catch (err) {
        console.warn('[search] failed:', err);
      }
    }
  }

  const systemParts = [SYSTEM_PROMPT];
  if (agentContext) {
    systemParts.push(agentContext);
  }
  if (ragContext) {
    systemParts.push(`\n\n## Frameworks consultivos relevantes\n${ragContext}`);
  }
  const magnusMemory = await buildMagnusWavesMemoryContext(req.userId, {
    diagnosticContext: req.diagnosticContext,
    gateContext: req.gateContext,
  });
  if (magnusMemory.trim()) {
    systemParts.push(
      `\n\n## Memória Magnus Waves (diagnóstico → design → difusão)\n${MAGNUS_MEMORY_SYSTEM_PREAMBLE}\n\n${magnusMemory}`
    );
  }
  if (webContext) {
    systemParts.push(`\n\n${webContext}`);
  }
  if (req.suggestObjectives) {
    systemParts.push('\n\nO usuário solicitou sugestões de objetivos. Inclua o bloco SUGGESTED_OBJECTIVES.');
  }

  const historyMessages: ChatCompletionMessage[] = (conversation?.messages ?? [])
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content }));

  const messages: ChatCompletionMessage[] = [
    { role: 'system', content: systemParts.join('') },
    ...historyMessages,
    { role: 'user', content: req.message },
  ];

  let rawReply: string;
  let demoMode = false;
  try {
    rawReply = await chatCompletion({ model, messages });
  } catch (err) {
    if (isLlmNotConfiguredError(err)) {
      rawReply = mockChatReply(req.message, ragContext);
      demoMode = true;
    } else {
      throw err;
    }
  }

  const { cleanContent, suggested } = parseSuggestedObjectives(rawReply);
  const userMsg = { role: 'user' as const, content: req.message, timestamp: nowIso() };
  const assistantMsg = {
    role: 'assistant' as const,
    content: cleanContent,
    timestamp: nowIso(),
  };

  if (!conversation) {
    const id = generateId();
    const title = req.message.slice(0, 60) + (req.message.length > 60 ? '...' : '');
    conversation = {
      id,
      userId: req.userId,
      title,
      model,
      messages: [userMsg, assistantMsg],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await create(COLLECTIONS.conversations, id, conversation as unknown as Record<string, unknown>);
  } else {
    conversation.messages = [...conversation.messages, userMsg, assistantMsg];
    conversation.model = model;
    conversation.updatedAt = nowIso();
    await update(COLLECTIONS.conversations, conversation.id, {
      messages: conversation.messages,
      model,
      updatedAt: conversation.updatedAt,
    });
  }

  await logActivity(req.userId, 'chat', 'Mensagem no assistente IA', {
    entidade: 'conversation',
    entidadeId: conversation.id,
  });

  const response: ChatResponse = {
    conversationId: conversation.id,
    reply: cleanContent,
    model,
    usedRag: Boolean(ragContext),
    usedWebSearch: Boolean(webContext),
    ...(demoMode ? { demoMode: true } : {}),
  };

  if (suggested.length > 0) {
    response.suggestedObjectives = suggested;
  }

  if (invokedSkills.length > 0) {
    response.invokedSkills = invokedSkills.map((s) => s.slug);
  }

  return response;
}
