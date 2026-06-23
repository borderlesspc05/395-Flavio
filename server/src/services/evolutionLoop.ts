import { AppError } from '../utils/errors';
import { chatCompletion, getDefaultModel, isLlmConfigured } from './llm';
import { retrieveRelevantContext } from './rag';

const SYSTEM = `Você é estrategista do Magnus Mind no Evolution Loop (fechamento do ciclo Magnus Waves).

Com base no diagnóstico original, blueprint, difusão e resultados do ciclo, produza recomendações acionáveis em português do Brasil.

Regras:
- Sintetize com insight; não copie trechos literalmente.
- Cada prática deve ser específica ao contexto fornecido.
- "continuar": práticas com evidência clara de resultado.
- "ajustar": práticas com impacto parcial ou inconsistente.
- "abandonar": práticas sem resultado ou com custo maior que benefício.
- Inclua 2 a 4 itens por categoria quando houver base; arrays vazios só se não houver evidência.
- nextWave: recomende o foco da próxima onda (Onda 2 · Design) com título curto e foco temático (ex.: Comunicação Interna).

Responda APENAS com JSON válido (sem markdown):
{
  "summary": "síntese executiva em 2-3 frases",
  "continuar": [{"practice": "...", "rationale": "..."}],
  "ajustar": [{"practice": "...", "rationale": "..."}],
  "abandonar": [{"practice": "...", "rationale": "..."}],
  "nextWave": {
    "title": "Próxima onda recomendada",
    "focus": "tema central",
    "rationale": "por que este foco agora"
  }
}`;

function extractJsonObject(text: string): string | null {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  return candidate.slice(start, end + 1);
}

function normalizePractices(raw: unknown): { practice: string; rationale: string }[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (typeof item === 'string') return { practice: item, rationale: '' };
      if (item && typeof item === 'object') {
        const o = item as Record<string, unknown>;
        const practice = String(o.practice ?? o.title ?? o.label ?? '').trim();
        const rationale = String(o.rationale ?? o.reason ?? o.description ?? '').trim();
        if (!practice) return null;
        return { practice, rationale };
      }
      return null;
    })
    .filter((item): item is { practice: string; rationale: string } => Boolean(item))
    .slice(0, 5);
}

export async function suggestEvolutionLoop(
  userId: string,
  context: string
): Promise<{
  summary: string;
  continuar: { practice: string; rationale: string }[];
  ajustar: { practice: string; rationale: string }[];
  abandonar: { practice: string; rationale: string }[];
  nextWave: { title: string; focus: string; rationale: string };
}> {
  if (!isLlmConfigured()) {
    throw new AppError(
      503,
      'IA não configurada no servidor. Defina OPENROUTER_API_KEY ou OPENAI_API_KEY.',
      'LLM_NOT_CONFIGURED'
    );
  }

  const ragContext = await retrieveRelevantContext(
    userId,
    `${context.slice(0, 500)} evolution loop ciclo aprendizados dominio difusao blueprint`
  );

  const userContent = [
    context.slice(0, 14000),
    ragContext ? `\n\n## Contexto RAG — histórico do cliente\n${ragContext}` : '',
  ].join('');

  const reply = await chatCompletion({
    model: getDefaultModel(),
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: userContent },
    ],
    temperature: 0.35,
  });

  const jsonStr = extractJsonObject(reply);
  if (!jsonStr) {
    throw new AppError(502, 'Resposta da IA inválida. Tente novamente.', 'INVALID_AI_RESPONSE');
  }

  const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
  const nextRaw = parsed.nextWave as Record<string, unknown> | undefined;
  const focus = String(nextRaw?.focus ?? nextRaw?.theme ?? 'Evolução organizacional').trim();

  const result = {
    summary: String(parsed.summary ?? 'Ciclo analisado com base nas evidências disponíveis.').trim(),
    continuar: normalizePractices(parsed.continuar ?? parsed.keep ?? parsed.continue),
    ajustar: normalizePractices(parsed.ajustar ?? parsed.adjust),
    abandonar: normalizePractices(parsed.abandonar ?? parsed.abandon ?? parsed.drop),
    nextWave: {
      title: String(nextRaw?.title ?? 'Próxima onda recomendada').trim(),
      focus,
      rationale: String(
        nextRaw?.rationale ??
          `Com base nos resultados, recomendamos iniciar uma nova onda focada em ${focus}.`
      ).trim(),
    },
  };

  if (
    result.continuar.length === 0 &&
    result.ajustar.length === 0 &&
    result.abandonar.length === 0
  ) {
    throw new AppError(
      502,
      'A IA não retornou recomendações suficientes. Adicione mais evidências no Domínio e tente novamente.',
      'EMPTY_EVOLUTION_LOOP'
    );
  }

  return result;
}
