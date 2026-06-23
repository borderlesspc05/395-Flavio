import { AppError } from '../utils/errors';

import { chatCompletion, getDefaultModel, isLlmConfigured } from './llm';

import { retrieveRelevantContext } from './rag';



const SYSTEM = `Você é analista de inteligência organizacional do Magnus Mind (Onda 4 — Domínio).



Com base no contexto de execução, reflexões do ciclo e trechos recuperados do histórico do cliente, extraia exatamente 5 aprendizados acionáveis em português do Brasil.



Regras:

- Cada aprendizado em uma frase clara, específica e baseada nas evidências fornecidas.

- Foque em padrões (o que funcionou, o que travou, o que surpreendeu).

- Não repita o texto do usuário literalmente; sintetize com insight.

- Priorize evidências do RAG vetorial quando disponíveis.



Responda APENAS com JSON válido (sem markdown):

{"learnings":["aprendizado 1","aprendizado 2","aprendizado 3","aprendizado 4","aprendizado 5"]}`;



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

): Promise<{ learnings: string[] }> {

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



  const parsed = JSON.parse(jsonStr) as { learnings?: unknown };

  const learnings = Array.isArray(parsed.learnings)

    ? parsed.learnings.map(String).filter(Boolean).slice(0, 5)

    : [];



  if (learnings.length === 0) {

    throw new AppError(502, 'A IA não retornou aprendizados. Tente novamente.', 'EMPTY_LEARNINGS');

  }



  while (learnings.length < 5) {

    learnings.push('Consolidar evidências adicionais para refinar este aprendizado.');

  }



  return { learnings };

}

