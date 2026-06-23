import { Objective, SuggestedObjective } from '../types';
import { env } from '../config/env';
import { COLLECTIONS, listByUser } from './storage';
import { chatCompletion, mockChatReply, getDefaultModel, isLlmNotConfiguredError } from './llm';
import { retrieveRelevantContext } from './rag';
import { buildMagnusWavesMemoryContext, MAGNUS_MEMORY_SYSTEM_PREAMBLE } from './magnusMemory';

const DEFAULT_SUGGESTIONS: SuggestedObjective[] = [
  {
    titulo: 'Converter o bloqueio principal em plano 4 WS',
    descricao:
      'Definir What, Why, Who e When da primeira mudanca priorizada pelo diagnostico para tirar a solucao do Blueprint e colocar em execucao.',
    categoria: '3.1 4 WS',
    prioridade: 1,
    horizonte: 'curto',
    impacto: 'Clareza de execucao e reducao de dispersao nas primeiras semanas.',
    responsavel: 'Lider sponsor',
    insightOrigem: 'Fallback local: complete o Design para gerar objetivos mais especificos.',
  },
  {
    titulo: 'Criar imprint operacional da solucao escolhida',
    descricao:
      'Transformar a decisao do MM Blueprint em ritual, artefato ou playbook que entre no fluxo real de trabalho.',
    categoria: '3.2 Imprint',
    prioridade: 2,
    horizonte: 'medio',
    impacto: 'Aumenta aderencia e evita que a solucao dependa apenas de memoria ou boa vontade.',
    responsavel: 'Dono do processo',
    insightOrigem: 'Fallback local: objetivo padrao de Difusao.',
  },
  {
    titulo: 'Instalar follow-up de evidencias do impacto',
    descricao:
      'Acompanhar aplicacao, barreiras e sinais de impacto do Blueprint em cadencia curta com decisao explicita de ajuste.',
    categoria: '3.3 Follow-up',
    prioridade: 3,
    horizonte: 'medio',
    impacto: 'Fecha o ciclo entre acao, aprendizagem e impacto mensuravel.',
    responsavel: 'PM da iniciativa',
    insightOrigem: 'Fallback local: objetivo padrao de Difusao.',
  },
];

function normalizeSuggestion(item: SuggestedObjective): SuggestedObjective | null {
  const titulo = String(item.titulo ?? '').trim();
  const descricao = String(item.descricao ?? '').trim();
  if (!titulo || !descricao) return null;
  const horizon = item.horizonte === 'curto' || item.horizonte === 'longo' ? item.horizonte : 'medio';
  return {
    titulo,
    descricao,
    categoria: String(item.categoria ?? '3.1 4 WS').trim(),
    prioridade: Number(item.prioridade ?? 2),
    horizonte: horizon,
    impacto: item.impacto ? String(item.impacto) : undefined,
    responsavel: item.responsavel ? String(item.responsavel) : undefined,
    insightOrigem: item.insightOrigem ? String(item.insightOrigem) : undefined,
  };
}

export async function suggestObjectives(userId: string, context?: string): Promise<SuggestedObjective[]> {
  const existing = await listByUser<Objective>(COLLECTIONS.objectives, userId);
  const magnusMemory = await buildMagnusWavesMemoryContext(userId);
  const memoryBlock = [
    MAGNUS_MEMORY_SYSTEM_PREAMBLE,
    magnusMemory.trim(),
    context?.trim() && context.trim() !== magnusMemory.trim() ? context.trim() : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const ragContext = await retrieveRelevantContext(
    userId,
    context ?? 'objetivos estrategicos planejamento difusao diagnostico aprendizados dominio action canvas'
  );

  const prompt = `Sugira 3 a 5 objetivos estrategicos novos para a etapa 3 - Difusao (Make the Move) de uma empresa.
Os objetivos devem nascer do diagnostico, MM Blueprint, Action Canvas encerrados, aprendizados do Dominio, relatorios anteriores e objetivos ja existentes — use a memoria e o contexto RAG abaixo.
Cubra, quando fizer sentido:
- 3.1 4 WS: objetivo de acao com What, Why, Who e When
- 3.2 Imprint: objetivo para incorporar a solucao no trabalho real
- 3.3 Follow-up: objetivo para medir aplicacao, barreiras e impacto

${memoryBlock ? `Memoria Magnus Waves:\n${memoryBlock}` : context ? `Contexto do usuario:\n${context}` : ''}
Objetivos existentes (evite duplicar): ${existing.map((o) => o.titulo).join(', ') || 'nenhum'}

Contexto RAG (diagnostico, planos, aprendizados, relatorios, frameworks):
${ragContext || 'nenhum trecho recuperado'}

Regras:
- Nao recomende treinamento como ponto de partida sem evidencia de gap treinavel.
- Cada objetivo precisa citar de onde veio em insightOrigem.
- Use prioridade 1 alta, 2 media, 3 baixa.
- Use horizonte "curto", "medio" ou "longo".

Responda APENAS com JSON array valido:
[{"titulo":"...","descricao":"...","categoria":"3.1 4 WS","prioridade":1,"horizonte":"curto","impacto":"...","responsavel":"...","insightOrigem":"..."}]`;

  try {
    const raw = await chatCompletion({
      model: getDefaultModel(),
      messages: [
        { role: 'system', content: 'Retorne somente JSON array, sem markdown.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
    });

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as SuggestedObjective[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .filter((o) => o && typeof o.titulo === 'string' && typeof o.descricao === 'string')
          .map(normalizeSuggestion)
          .filter((o): o is SuggestedObjective => Boolean(o))
          .slice(0, 5);
      }
    }
  } catch (err) {
    const e = err as { code?: string };
    if (!isLlmNotConfiguredError(err)) {
      console.warn('[suggest] AI failed:', err);
    }
    mockChatReply(context ?? 'sugestoes');
  }

  return DEFAULT_SUGGESTIONS;
}
