import axios from 'axios';
import { env } from '../config/env';
import { AppError } from '../utils/errors';

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: LlmToolCallWire[];
  tool_call_id?: string;
}

export interface LlmToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LlmToolCallWire {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LlmToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface ChatCompletionOptions {
  model?: string;
  messages: ChatCompletionMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: LlmToolDefinition[];
}

export interface ChatCompletionResult {
  content: string | null;
  toolCalls: LlmToolCall[];
}

export type LlmProvider = 'openai' | 'openrouter';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const OPENAI_MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
  { id: 'gpt-4.1', name: 'GPT-4.1' },
];

const OPENROUTER_MODELS = [
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B' },
];

export function resolveLlmProvider(): LlmProvider | null {
  const forced = env.ai.provider;
  if (forced === 'openai' && env.openai.apiKey) return 'openai';
  if (forced === 'openrouter' && env.openrouter.apiKey) return 'openrouter';
  if (forced === 'openai' || forced === 'openrouter') return null;

  if (env.openai.apiKey) return 'openai';
  if (env.openrouter.apiKey) return 'openrouter';
  return null;
}

export function isLlmConfigured(): boolean {
  return resolveLlmProvider() !== null;
}

export function getLlmStatus() {
  const provider = resolveLlmProvider();
  return {
    configured: provider !== null,
    provider: provider ?? 'none',
    defaultModel:
      provider === 'openai'
        ? env.openai.defaultModel
        : provider === 'openrouter'
          ? env.openrouter.defaultModel
          : null,
  };
}

export function getAiModels() {
  const provider = resolveLlmProvider();
  if (provider === 'openai') return OPENAI_MODELS;
  if (provider === 'openrouter') return OPENROUTER_MODELS;
  return OPENAI_MODELS;
}

export function getDefaultModel(): string {
  const provider = resolveLlmProvider();
  if (provider === 'openai') return env.openai.defaultModel;
  if (provider === 'openrouter') return env.openrouter.defaultModel;
  return env.openai.defaultModel;
}

/** Modelo rápido para JSON estruturado (solution pick, sugestões em lote). */
export function getFastStructuredModel(): string {
  const provider = resolveLlmProvider();
  if (provider === 'openai') return 'gpt-4o-mini';
  if (provider === 'openrouter') return 'openai/gpt-4o-mini';
  return getDefaultModel();
}

/** Compat: rotas antigas importam AI_MODELS de openrouter */
export const AI_MODELS = getAiModels();

/** Converte IDs OpenRouter (openai/gpt-4o) para OpenAI nativo quando necessário */
export function normalizeModelForProvider(model: string | undefined, provider: LlmProvider): string {
  const fallback =
    provider === 'openai' ? env.openai.defaultModel : env.openrouter.defaultModel;
  const raw = (model?.trim() || fallback).trim();

  if (provider === 'openai') {
    if (raw.includes('/')) return raw.split('/').pop() ?? env.openai.defaultModel;
    return raw;
  }

  if (!raw.includes('/')) {
    const known = OPENROUTER_MODELS.find((m) => m.id.endsWith(`/${raw}`));
    if (known) return known.id;
    return `openai/${raw}`;
  }
  return raw;
}

function parseToolCalls(raw: unknown): LlmToolCall[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const call = item as {
        id?: string;
        function?: { name?: string; arguments?: string };
      };
      if (!call.id || !call.function?.name) return null;
      return {
        id: call.id,
        name: call.function.name,
        arguments: call.function.arguments ?? '{}',
      };
    })
    .filter((item): item is LlmToolCall => item !== null);
}

function parseCompletionResponse(data: unknown): ChatCompletionResult {
  const message = (data as { choices?: Array<{ message?: unknown }> })?.choices?.[0]?.message as
    | {
        content?: string | null;
        tool_calls?: unknown;
      }
    | undefined;

  return {
    content: typeof message?.content === 'string' ? message.content : message?.content ?? null,
    toolCalls: parseToolCalls(message?.tool_calls),
  };
}

async function callOpenAiCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
  const apiKey = env.openai.apiKey?.trim();
  if (!apiKey) {
    throw new AppError(503, 'OpenAI API key not configured. Set OPENAI_API_KEY.', 'LLM_NOT_CONFIGURED');
  }

  const model = normalizeModelForProvider(options.model, 'openai');
  const body: Record<string, unknown> = {
    model,
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 4096,
  };
  if (options.tools?.length) {
    body.tools = options.tools;
    body.tool_choice = 'auto';
  }

  const response = await axios.post(OPENAI_URL, body, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: env.chatTimeout,
  });

  const result = parseCompletionResponse(response.data);
  if (!result.content && result.toolCalls.length === 0) {
    throw new AppError(502, 'Empty response from OpenAI', 'OPENAI_EMPTY');
  }
  return result;
}

async function callOpenRouterCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResult> {
  const apiKey = env.openrouter.apiKey?.trim();
  if (!apiKey) {
    throw new AppError(
      503,
      'OpenRouter API key not configured. Set OPENROUTER_API_KEY.',
      'LLM_NOT_CONFIGURED'
    );
  }

  const model = normalizeModelForProvider(options.model, 'openrouter');
  const body: Record<string, unknown> = {
    model,
    messages: options.messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 4096,
  };
  if (options.tools?.length) {
    body.tools = options.tools;
    body.tool_choice = 'auto';
  }

  const response = await axios.post(OPENROUTER_URL, body, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': env.openrouter.siteUrl,
      'X-Title': env.openrouter.appName,
      'Content-Type': 'application/json',
    },
    timeout: env.chatTimeout,
  });

  const result = parseCompletionResponse(response.data);
  if (!result.content && result.toolCalls.length === 0) {
    throw new AppError(502, 'Empty response from OpenRouter', 'OPENROUTER_EMPTY');
  }
  return result;
}

async function callOpenAi(options: ChatCompletionOptions): Promise<string> {
  const result = await callOpenAiCompletion(options);
  if (result.toolCalls.length > 0) {
    throw new AppError(502, 'Unexpected tool calls in text-only completion', 'OPENAI_TOOL_CALL');
  }
  if (!result.content) {
    throw new AppError(502, 'Empty response from OpenAI', 'OPENAI_EMPTY');
  }
  return result.content;
}

async function callOpenRouter(options: ChatCompletionOptions): Promise<string> {
  const result = await callOpenRouterCompletion(options);
  if (result.toolCalls.length > 0) {
    throw new AppError(502, 'Unexpected tool calls in text-only completion', 'OPENROUTER_TOOL_CALL');
  }
  if (!result.content) {
    throw new AppError(502, 'Empty response from OpenRouter', 'OPENROUTER_EMPTY');
  }
  return result.content;
}

function mapAuthError(msg: string, provider: LlmProvider): AppError {
  const label = provider === 'openai' ? 'OpenAI' : 'OpenRouter';
  const envVar = provider === 'openai' ? 'OPENAI_API_KEY' : 'OPENROUTER_API_KEY';
  return new AppError(
    503,
    `${label}: chave ausente ou rejeitada. Defina ${envVar} no ambiente do servidor.`,
    'LLM_NOT_CONFIGURED'
  );
}

export async function chatCompletion(options: ChatCompletionOptions): Promise<string> {
  const provider = resolveLlmProvider();
  if (!provider) {
    throw new AppError(
      503,
      'Nenhum provedor de IA configurado. Defina OPENAI_API_KEY ou OPENROUTER_API_KEY.',
      'LLM_NOT_CONFIGURED'
    );
  }

  try {
    if (provider === 'openai') return await callOpenAi(options);
    return await callOpenRouter(options);
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (axios.isAxiosError(err)) {
      const body = err.response?.data as { error?: { message?: string } } | undefined;
      const bodyMsg =
        typeof body?.error?.message === 'string'
          ? body.error.message
          : typeof err.response?.data === 'object' &&
              err.response?.data !== null &&
              'message' in err.response.data
            ? String((err.response.data as { message?: string }).message)
            : '';
      const msg = bodyMsg || err.message;
      const lower = msg.toLowerCase();
      if (
        err.response?.status === 401 ||
        lower.includes('missing authentication') ||
        lower.includes('invalid api key') ||
        lower.includes('no auth') ||
        lower.includes('incorrect api key')
      ) {
        throw mapAuthError(msg, provider);
      }
      throw new AppError(
        err.response?.status ?? 502,
        `${provider === 'openai' ? 'OpenAI' : 'OpenRouter'} error: ${msg}`,
        provider === 'openai' ? 'OPENAI_ERROR' : 'OPENROUTER_ERROR'
      );
    }
    throw err;
  }
}

export async function chatCompletionWithTools(
  options: ChatCompletionOptions
): Promise<ChatCompletionResult> {
  const provider = resolveLlmProvider();
  if (!provider) {
    throw new AppError(
      503,
      'Nenhum provedor de IA configurado. Defina OPENAI_API_KEY ou OPENROUTER_API_KEY.',
      'LLM_NOT_CONFIGURED'
    );
  }

  try {
    if (provider === 'openai') return await callOpenAiCompletion(options);
    return await callOpenRouterCompletion(options);
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (axios.isAxiosError(err)) {
      const body = err.response?.data as { error?: { message?: string } } | undefined;
      const bodyMsg =
        typeof body?.error?.message === 'string'
          ? body.error.message
          : typeof err.response?.data === 'object' &&
              err.response?.data !== null &&
              'message' in err.response.data
            ? String((err.response.data as { message?: string }).message)
            : '';
      const msg = bodyMsg || err.message;
      const lower = msg.toLowerCase();
      if (
        err.response?.status === 401 ||
        lower.includes('missing authentication') ||
        lower.includes('invalid api key') ||
        lower.includes('no auth') ||
        lower.includes('incorrect api key')
      ) {
        throw mapAuthError(msg, provider);
      }
      throw new AppError(
        err.response?.status ?? 502,
        `${provider === 'openai' ? 'OpenAI' : 'OpenRouter'} error: ${msg}`,
        provider === 'openai' ? 'OPENAI_ERROR' : 'OPENROUTER_ERROR'
      );
    }
    throw err;
  }
}

/** Fallback quando não há chave — resposta heurística para desenvolvimento offline */
export function mockChatReply(userMessage: string, context?: string): string {
  const preview = userMessage.slice(0, 120);
  const lower = userMessage.toLowerCase();
  let angle: string;
  if (/trein|capacita|curso|aprend|habilidade/.test(lower)) {
    angle =
      'Antes de priorizar treinamento, confirme se o gap é de habilidade ou de sistema, contexto ou gestão — o MM Blueprint ancora na causa certa.';
  } else if (/sistema|processo|autom|ferrament|fluxo|bottleneck|gargalo/.test(lower)) {
    angle =
      'Para fricção sistêmica, descreva handoffs, decisões e onde o trabalho se perde; o desenho costuma passar por governança e fluxo, não só conteúdo.';
  } else if (/okr|objetiv|meta|prioridade|trimestre/.test(lower)) {
    angle =
      'Para OKRs ou metas, conecte resultado mensurável a poucas iniciativas com dono e ritmo de revisão — evite lista longa sem decisão.';
  } else if (/equipe|lider|gestão|people|talento|cultura/.test(lower)) {
    angle =
      'Para pessoas e liderança, combine papéis claros, feedback e ambiente psicológico; sem isso, mudanças técnicas raramente sustentam.';
  } else if (/roadmap|blueprint|design|onda\s*2/.test(lower)) {
    angle =
      'No Design (Onda 2), use o diagnóstico 1.1–1.5 como fonte primária e deixe explícito o que não fazer agora, além do que avançar.';
  } else {
    angle =
      'Consolide o diagnóstico em decisões SE-ENTÃO e um recorte 30–90 dias; poucas frentes paralelas costumam vencer dispersão.';
  }
  return (
    `[Modo demonstração — configure OPENAI_API_KEY ou OPENROUTER_API_KEY no servidor para respostas reais do modelo.]\n\n` +
    `Sobre a sua pergunta: "${preview}${userMessage.length > 120 ? '...' : ''}"\n\n` +
    (context?.trim()
      ? `Há trechos de frameworks no contexto (~${context.length} caracteres) que orientariam uma resposta completa.\n\n`
      : '') +
    angle
  );
}

export function isLlmNotConfiguredError(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  return code === 'LLM_NOT_CONFIGURED' || code === 'OPENROUTER_NOT_CONFIGURED';
}
