import { retrieveRelevantContextDetailed } from './rag';
import { dayHash } from '../utils/dailyInsight';

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
      const bullets = pickDailyItems(candidates, `mid-kpi-rag-${kpiId}`, 3);
      const sources = extractSources(retrieved.context);
      const usedRag = retrieved.usedVectorRag || retrieved.usedFrameworkRag;

      const detail =
        bullets[0] ??
        (usedRag
          ? `Encontrei contexto relevante na memória do ciclo para ${label}. Continue alimentando o diagnóstico e a execução.`
          : `Ainda sem trechos RAG suficientes para ${label}. Conclua scans, planos e check-ins para enriquecer a memória.`);

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
