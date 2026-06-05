import { AppError, isAppError } from '../utils/errors';
import { chatCompletion, getDefaultModel, isLlmNotConfiguredError } from './llm';

export type BlueprintPath = 'A' | 'B';

export interface BlueprintGateParsed {
  recommendedPath: BlueprintPath;
  rationale: string;
  pathASignals: string[];
  pathBSignals: string[];
  questionForUser: string;
}

const GATE_SYSTEM = `Você é o classificador Gate Zero do Magnus Mind (Onda 2 · MM Blueprint).

Regra de ouro: treinamento nunca é ponto de partida; é consequência diagnóstica.

Caminho A — treinamento se aplica quando predominam: gap de habilidade, comportamento treinável, liderança prática, transferência para o trabalho, sistema minimamente funcional.

Caminho B — treinamento NÃO se aplica quando predominam: gap estrutural, falha de processo, falta de clareza, decisão mal definida, fricção sistêmica, governança ou contexto.

Responda APENAS com um objeto JSON válido (sem markdown, sem texto antes ou depois), neste formato exato:
{"recommendedPath":"A","rationale":"texto em português","pathASignals":["..."],"pathBSignals":["..."],"questionForUser":"uma pergunta curta para o líder confirmar ou corrigir"}

recommendedPath deve ser exatamente "A" ou "B".`;

function extractJsonObject(text: string): string | null {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  return candidate.slice(start, end + 1);
}

function parseGateJson(raw: string): BlueprintGateParsed | null {
  const jsonStr = extractJsonObject(raw);
  if (!jsonStr) return null;
  try {
    const o = JSON.parse(jsonStr) as Record<string, unknown>;
    const path = o.recommendedPath === 'A' || o.recommendedPath === 'B' ? o.recommendedPath : null;
    if (!path) return null;
    const rationale = typeof o.rationale === 'string' ? o.rationale : '';
    const pathASignals = Array.isArray(o.pathASignals)
      ? o.pathASignals.map(String).filter(Boolean)
      : [];
    const pathBSignals = Array.isArray(o.pathBSignals)
      ? o.pathBSignals.map(String).filter(Boolean)
      : [];
    const questionForUser =
      typeof o.questionForUser === 'string' ? o.questionForUser : 'Qual caminho você confirma para o MM Blueprint?';
    return { recommendedPath: path, rationale, pathASignals, pathBSignals, questionForUser };
  } catch {
    return null;
  }
}

function mockGateJson(diagnosticPreview: string): BlueprintGateParsed {
  const lower = diagnosticPreview.toLowerCase();
  const structural =
    lower.includes('processo') ||
    lower.includes('sistema') ||
    lower.includes('governança') ||
    lower.includes('estrutur') ||
    lower.includes('fricção') ||
    lower.includes('friccao');
  const path: BlueprintPath = structural ? 'B' : 'A';
  return {
    recommendedPath: path,
    rationale:
      '[Modo demonstração — configure OPENROUTER_API_KEY] Classificação heurística rápida a partir de palavras-chave no diagnóstico. Confirme manualmente o caminho correto.',
    pathASignals: path === 'A' ? ['Heurística: foco em performance humana'] : [],
    pathBSignals: path === 'B' ? ['Heurística: indícios de tema sistêmico'] : [],
    questionForUser: 'Este resultado é apenas demonstração. Qual caminho (A ou B) faz sentido para o seu caso?',
  };
}

export interface BlueprintGateRequest {
  diagnosticContext: string;
}

export interface BlueprintGateResponse {
  reply: string;
  parsed: BlueprintGateParsed;
}

export async function runBlueprintGateSuggestion(
  req: BlueprintGateRequest
): Promise<BlueprintGateResponse> {
  const ctx = req.diagnosticContext.trim();
  if (!ctx) {
    throw new AppError(400, 'diagnosticContext is required');
  }

  const userContent = `Diagnóstico do cliente (Magnus Waves 1.1–1.5):\n\n${ctx}\n\nClassifique em JSON conforme instruções.`;

  let raw: string;
  try {
    raw = await chatCompletion({
      model: getDefaultModel(),
      messages: [
        { role: 'system', content: GATE_SYSTEM },
        { role: 'user', content: userContent },
      ],
      temperature: 0.35,
      maxTokens: 900,
    });
  } catch (err) {
    if (isAppError(err) && isLlmNotConfiguredError(err)) {
      const parsed = mockGateJson(ctx);
      return {
        reply: JSON.stringify(parsed, null, 2),
        parsed,
      };
    }
    throw err;
  }

  let parsed = parseGateJson(raw);
  if (!parsed) {
    parsed = mockGateJson(ctx);
    parsed.rationale = `${parsed.rationale} (A resposta da IA não veio em JSON válido; use a heurística de fallback.)`;
  }

  return { reply: raw.trim(), parsed };
}
