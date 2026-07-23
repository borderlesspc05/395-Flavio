import { AppError } from '../utils/errors';

import { chatCompletion, getDefaultModel, isLlmConfigured } from './llm';

import { retrieveRelevantContext } from './rag';



const SYSTEM = `Você é um consultor sênior em retrospectivas, transformação organizacional e melhoria contínua.

Analise todo o histórico da iniciativa: objetivo, critérios, comentários da Mobilização, checklist, percentuais, prazos, pendências, atrasos, riscos, impactos e reflexões existentes.
Raciocine internamente sobre resultado, fatores de sucesso, obstáculos, valor gerado, surpresas e práticas replicáveis antes de escrever.

Produza:
1) cinco respostas distintas para a retrospectiva, cada uma com um parágrafo curto, específico e consultivo;
2) exatamente cinco aprendizados executivos nas perspectivas: principal descoberta, principal gargalo, maior oportunidade, padrão observado e recomendação estratégica.

Não liste atividades, não procure culpados, não repita métricas sem interpretá-las e não use recomendações genéricas ou frameworks decorativos. Cada texto deve ser específico para esta iniciativa.

Responda APENAS com JSON válido:
{"responses":{"workedWell":"...","didNotWork":"...","wouldDoDifferently":"...","biggestSurprise":"...","practiceToReplicate":"..."},"learnings":["descoberta","gargalo","oportunidade","padrão","recomendação"]}`;



function extractJsonObject(text: string): string | null {

  const trimmed = text.trim();

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);

  const candidate = fence ? fence[1].trim() : trimmed;

  const start = candidate.indexOf('{');

  const end = candidate.lastIndexOf('}');

  if (start === -1 || end <= start) return null;

  return candidate.slice(start, end + 1);

}



export async function suggestDomainLearnings(

  userId: string,

  context: string

): Promise<{
  learnings: string[];
  responses: {
    workedWell: string;
    didNotWork: string;
    wouldDoDifferently: string;
    biggestSurprise: string;
    practiceToReplicate: string;
  };
}> {

  if (!isLlmConfigured()) {

    throw new AppError(

      503,

      'IA não configurada no servidor. Defina OPENROUTER_API_KEY ou OPENAI_API_KEY.',

      'LLM_NOT_CONFIGURED',

    );

  }



  const ragContext = await retrieveRelevantContext(

    userId,

    `${context.slice(0, 500)} aprendizados onda 4 dominio planos evidencias impacto`

  );



  const userContent = [

    context.slice(0, 12000),

    ragContext

      ? `\n\n## Contexto RAG — histórico do ciclo do cliente\n${ragContext}`

      : '',

  ].join('');



  const reply = await chatCompletion({

    model: getDefaultModel(),

    messages: [

      { role: 'system', content: SYSTEM },

      { role: 'user', content: userContent },

    ],

    temperature: 0.4,

  });



  const jsonStr = extractJsonObject(reply);

  if (!jsonStr) {

    throw new AppError(502, 'Resposta da IA inválida. Tente novamente.', 'INVALID_AI_RESPONSE');

  }



  const parsed = JSON.parse(jsonStr) as {
    learnings?: unknown;
    responses?: Record<string, unknown>;
  };

  const learnings = Array.isArray(parsed.learnings)

    ? parsed.learnings.map(String).filter(Boolean).slice(0, 5)

    : [];



  if (learnings.length === 0) {

    throw new AppError(502, 'A IA não retornou aprendizados. Tente novamente.', 'EMPTY_LEARNINGS');

  }



  while (learnings.length < 5) {

    learnings.push('Consolidar evidências adicionais para refinar este aprendizado.');

  }



  return {
    learnings,
    responses: {
      workedWell: String(parsed.responses?.workedWell ?? '').trim(),
      didNotWork: String(parsed.responses?.didNotWork ?? '').trim(),
      wouldDoDifferently: String(parsed.responses?.wouldDoDifferently ?? '').trim(),
      biggestSurprise: String(parsed.responses?.biggestSurprise ?? '').trim(),
      practiceToReplicate: String(parsed.responses?.practiceToReplicate ?? '').trim(),
    },
  };

}

