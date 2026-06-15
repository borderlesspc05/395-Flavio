import { Conversation, SuggestedObjective } from '../types';
import { generateId, nowIso } from '../utils/id';
import {
  chatCompletion,
  chatCompletionWithTools,
  mockChatReply,
  getDefaultModel,
  isLlmConfigured,
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
  AGENT_TOOLS,
  buildProjectSnapshot,
  executeAgentTool,
  getToolResultPayload,
  type AgentActionRecord,
} from './agentTools';
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

const AGENT_AUTONOMY_PROMPT = `
## Autonomia de execução no projeto
Você pode criar, alterar e excluir itens do projeto do usuário quando ele solicitar explicitamente.
Use as ferramentas disponíveis para executar ações reais — não apenas descreva o que faria.
Antes de atualizar ou excluir, use list_* se precisar localizar o id correto.
Escopo das ferramentas: objetivos, Action Canvas, membros da equipe e nome do projeto/ciclo.
Após executar ações, confirme de forma clara o que foi feito.
Não exclua nem altere itens sem pedido claro do usuário.
Se faltar informação para criar algo, pergunte antes ou use valores razoáveis e informe na resposta.`;

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
  cycleId?: string;
  diagnosticContext?: string;
  gateContext?: string;
  suggestObjectives?: boolean;
}

export interface ChatResponse {
  conversationId: string;
  reply: string;
  model: string;
  suggestedObjectives?: SuggestedObjective[];
  executedActions?: AgentActionRecord[];
  usedWebSearch?: boolean;
  usedRag?: boolean;
  invokedSkills?: string[];
  /** true quando caiu no mock por falta de chave de IA */
  demoMode?: boolean;
}

const MAX_TOOL_ROUNDS = 6;

async function runAgentChat(params: {
  model: string;
  messages: ChatCompletionMessage[];
  userId: string;
  cycleId?: string;
}): Promise<{ reply: string; executedActions: AgentActionRecord[] }> {
  const executedActions: AgentActionRecord[] = [];
  const messages = [...params.messages];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const result = await chatCompletionWithTools({
      model: params.model,
      messages,
      tools: AGENT_TOOLS,
      temperature: 0.4,
    });

    if (result.toolCalls.length === 0) {
      return {
        reply: result.content?.trim() || 'Pronto.',
        executedActions,
      };
    }

    messages.push({
      role: 'assistant',
      content: result.content,
      tool_calls: result.toolCalls.map((call) => ({
        id: call.id,
        type: 'function',
        function: { name: call.name, arguments: call.arguments },
      })),
    });

    for (const call of result.toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.arguments || '{}') as Record<string, unknown>;
      } catch {
        args = {};
      }

      const actionRecord = await executeAgentTool(params.userId, call.name, args, params.cycleId);
      executedActions.push(actionRecord);

      let data: unknown = null;
      if (call.name === 'list_objectives') {
        data = await getToolResultPayload(params.userId, call.name, args, params.cycleId);
      } else if (call.name === 'list_action_canvases') {
        data = await getToolResultPayload(params.userId, call.name, args, params.cycleId);
      } else if (call.name === 'list_team_members') {
        data = await getToolResultPayload(params.userId, call.name, args, params.cycleId);
      }

      messages.push({
        role: 'tool',
        tool_call_id: call.id,
        content: JSON.stringify({
          ok: actionRecord.ok,
          summary: actionRecord.summary,
          error: actionRecord.error,
          entityId: actionRecord.entityId,
          data,
        }),
      });
    }
  }

  const final = await chatCompletion({
    model: params.model,
    messages: [
      ...messages,
      {
        role: 'user',
        content: 'Resuma em português o que foi executado no projeto e o próximo passo recomendado.',
      },
    ],
    temperature: 0.5,
  });

  return { reply: final.trim(), executedActions };
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

  const systemParts = [SYSTEM_PROMPT, AGENT_AUTONOMY_PROMPT];
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
  const projectSnapshot = await buildProjectSnapshot(req.userId, req.cycleId);
  systemParts.push(`\n\n## Estado atual do projeto\n${projectSnapshot}`);
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

  const useAgentTools = isLlmConfigured();

  let rawReply: string;
  let executedActions: AgentActionRecord[] = [];
  let demoMode = false;
  try {
    if (useAgentTools) {
      const agentResult = await runAgentChat({
        model,
        messages,
        userId: req.userId,
        cycleId: req.cycleId,
      });
      rawReply = agentResult.reply;
      executedActions = agentResult.executedActions;
    } else {
      rawReply = await chatCompletion({ model, messages });
    }
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

  if (executedActions.length > 0) {
    response.executedActions = executedActions;
  }

  if (invokedSkills.length > 0) {
    response.invokedSkills = invokedSkills.map((s) => s.slug);
  }

  return response;
}
