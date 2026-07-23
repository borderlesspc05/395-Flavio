import { retrieveRelevantContextDetailed } from './rag';
import { dayHash } from '../utils/dailyInsight';
import { chatCompletion, getDefaultModel, isLlmConfigured } from './llm';

export type MidKpiId =
  | 'evolution-index'
  | 'action-velocity'
  | 'momentum-score'
  | 'business-impact'
  | 'sustainability-score';

export type MidKpiRagInsight = {
  kpiId: MidKpiId;
  detail: string;
  bullets: string[];
  sources: string[];
  usedRag: boolean;
  usedFrameworkRag: boolean;
};

const KPI_QUERIES: Record<MidKpiId, { label: string; query: string }> = {
  'evolution-index': {
    label: 'Evolution Index',
    query:
      'evolução organizacional diagnóstico baseline cultura liderança maturidade scans progresso ciclo',
  },
  'action-velocity': {
    label: 'Action Velocity',
    query:
      'execução action canvas entregas prazo iniciativas plano ritmo implementação responsabilidades',
  },
  'momentum-score': {
    label: 'Momentum Score',
    query:
      'participação equipe check-in engajamento consistência força transformação ritmo colaboração',
  },
  'business-impact': {
    label: 'Business Impact',
    query:
      'impacto negócio resultados indicadores transferência aprendizagem produtividade valor cliente',
  },
  'sustainability-score': {
    label: 'Sustainability Score',
    query:
      'sustentação domínio rotina responsável indicadores liderança crença equipe continuidade mudança',
  },
};

const ALL_KPI_IDS = Object.keys(KPI_QUERIES) as MidKpiId[];

function cleanLine(value: string): string {
  return value
    .replace(/\*\*/g, '')
    .replace(/^[-•*\d.)\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSources(context: string): string[] {
  const sources = new Set<string>();
  for (const match of context.matchAll(/^Fonte:\s*(.+)$/gm)) {
    const title = cleanLine(match[1] ?? '');
    if (title) sources.add(title);
  }
  for (const match of context.matchAll(/^###\s+(.+)$/gm)) {
    const title = cleanLine(match[1] ?? '');
    if (title && !title.toLowerCase().startsWith('trecho recuperado')) {
      sources.add(title);
    }
  }
  return [...sources].slice(0, 3);
}

function extractCandidates(context: string): string[] {
  const chunks = context
    .split(/\n---+\n|## Frameworks consultivos relevantes/g)
    .map((part) => part.trim())
    .filter(Boolean);

  const candidates: string[] = [];

  for (const chunk of chunks) {
    const body = chunk
      .replace(/^###.*$/gm, '')
      .replace(/^##.*$/gm, '')
      .replace(/^Fonte:.*$/gm, '')
      .replace(/^Onda:.*$/gm, '')
      .replace(/^Similaridade:.*$/gm, '')
      .replace(/^Tags:.*$/gm, '')
      .trim();

    const sentences = body
      .split(/(?<=[.!?])\s+|\n+/)
      .map(cleanLine)
      .filter((line) => line.length >= 42 && line.length <= 220);

    for (const sentence of sentences) {
      if (!candidates.some((existing) => existing === sentence)) {
        candidates.push(sentence);
      }
      if (candidates.length >= 8) return candidates;
    }
  }

  return candidates;
}

function pickDailyItems(items: string[], salt: string, count: number): string[] {
  if (items.length === 0) return [];
  if (items.length <= count) return items;
  const start = dayHash(salt) % items.length;
  const picked: string[] = [];
  for (let i = 0; i < items.length && picked.length < count; i += 1) {
    picked.push(items[(start + i) % items.length]);
  }
  return picked;
}

export async function buildMidKpiRagInsights(
  userId: string,
  kpiIds: MidKpiId[] = ALL_KPI_IDS,
): Promise<MidKpiRagInsight[]> {
  const uniqueIds = [...new Set(kpiIds.filter((id) => id in KPI_QUERIES))];

  const insights = await Promise.all(
    uniqueIds.map(async (kpiId) => {
      const { label, query } = KPI_QUERIES[kpiId];
      const retrieved = await retrieveRelevantContextDetailed(
        userId,
        `${label} ${query}`,
        4,
      );

      const candidates = extractCandidates(retrieved.context);
      let bullets = pickDailyItems(candidates, `mid-kpi-rag-${kpiId}`, 3);
      const sources = extractSources(retrieved.context);
      const usedRag = retrieved.usedVectorRag || retrieved.usedFrameworkRag;

      let detail =
        bullets[0] ??
        (usedRag
          ? `Encontrei contexto relevante na memória do ciclo para ${label}. Continue alimentando o diagnóstico e a execução.`
          : `Ainda sem trechos RAG suficientes para ${label}. Conclua scans, planos e check-ins para enriquecer a memória.`);

      if (isLlmConfigured() && retrieved.context.trim()) {
        try {
          const raw = await chatCompletion({
            model: getDefaultModel(),
            messages: [
              {
                role: 'system',
                content:
                  'Você é um gerente de projetos sênior. Responda somente JSON válido e não use frameworks ou recomendações genéricas.',
              },
              {
                role: 'user',
                content: `Analise o indicador ${label} usando apenas as evidências desta iniciativa.

Pergunta do indicador: ${query}

Produza:
- leitura: uma frase curta sobre o estado atual;
- causa: a principal causa desse estado;
- acao: uma única próxima decisão específica.

Cruze objetivo, critérios, execução, atrasos, bloqueios, riscos e aprendizados quando disponíveis. Não repita a nota e não escreva algo reutilizável em qualquer projeto.

Evidências:
${retrieved.context.slice(0, 9000)}

JSON: {"leitura":"...","causa":"...","acao":"..."}`,
              },
            ],
            temperature: 0.35,
          });
          const match = raw.match(/\{[\s\S]*\}/);
          const parsed = match
            ? (JSON.parse(match[0]) as { leitura?: string; causa?: string; acao?: string })
            : null;
          const generated = [parsed?.leitura, parsed?.causa, parsed?.acao]
            .map((item) => String(item ?? '').trim())
            .filter(Boolean);
          if (generated.length === 3) {
            detail = generated[0];
            bullets = generated.slice(1);
          }
        } catch (error) {
          console.warn(`[midKpiInsights] AI failed for ${kpiId}:`, error);
        }
      }

      return {
        kpiId,
        detail,
        bullets: bullets.length > 0 ? bullets : [detail],
        sources,
        usedRag,
        usedFrameworkRag: retrieved.usedFrameworkRag,
      } satisfies MidKpiRagInsight;
    }),
  );

  return insights;
}
