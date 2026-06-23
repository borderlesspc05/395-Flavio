import { listFrameworks } from './storage';
import { ConsultantFramework } from '../types';
import { searchUserRagContext } from './ragSearch';

const DEFAULT_FRAMEWORKS: Omit<ConsultantFramework, 'id' | 'createdAt'>[] = [
  {
    titulo: 'OKR — Objectives and Key Results',
    conteudo:
      'Defina 3-5 objetivos ambiciosos por ciclo. Cada objetivo tem 2-4 resultados-chave mensuráveis. Revise semanalmente. Alinhe objetivos da empresa → times → indivíduos.',
    tags: ['estratégia', 'metas'],
  },
  {
    titulo: 'SWOT Analysis',
    conteudo:
      'Mapeie Forças, Fraquezas, Oportunidades e Ameaças. Use para priorizar iniciativas e mitigar riscos. Cruze forças com oportunidades para vantagens competitivas.',
    tags: ['análise', 'planejamento'],
  },
  {
    titulo: 'Balanced Scorecard',
    conteudo:
      'Quatro perspectivas: Financeira, Clientes, Processos Internos, Aprendizado e Crescimento. Traduza visão em objetivos e indicadores em cada perspectiva.',
    tags: ['gestão', 'kpis'],
  },
];

function scoreFramework(query: string, framework: { titulo?: string; conteudo?: string; tags?: string[] }): number {
  const q = query.toLowerCase();
  const text = `${framework.titulo ?? ''} ${framework.conteudo ?? ''} ${(framework.tags ?? []).join(' ')}`.toLowerCase();
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  return words.reduce((acc, w) => (text.includes(w) ? acc + 1 : acc), 0);
}

export type RetrieveContextResult = {
  context: string;
  vectorChunkCount: number;
  usedVectorRag: boolean;
  usedFrameworkRag: boolean;
};

async function retrieveFrameworkContext(
  userId: string,
  query: string,
  topK = 3
): Promise<string> {
  let frameworks = (await listFrameworks(userId)) as unknown as ConsultantFramework[];

  if (frameworks.length === 0) {
    frameworks = DEFAULT_FRAMEWORKS.map((f, i) => ({
      ...f,
      id: `default_${i}`,
      createdAt: new Date().toISOString(),
    }));
  }

  const ranked = frameworks
    .map((f) => ({ f, score: scoreFramework(query, f) }))
    .sort((a, b) => b.score - a.score);

  const selected = ranked.slice(0, topK).map((r) => r.f);
  if (selected.length === 0) return '';

  return selected
    .map(
      (f) =>
        `### ${f.titulo}\n${f.conteudo}${f.tags?.length ? `\nTags: ${f.tags.join(', ')}` : ''}`
    )
    .join('\n\n');
}

export async function retrieveRelevantContext(
  userId: string,
  query: string,
  topK = 5
): Promise<string> {
  const result = await retrieveRelevantContextDetailed(userId, query, topK);
  return result.context;
}

export async function retrieveRelevantContextDetailed(
  userId: string,
  query: string,
  topK = 5
): Promise<RetrieveContextResult> {
  const parts: string[] = [];

  const vectorSearch = await searchUserRagContext(userId, query, topK);
  if (vectorSearch.context) {
    parts.push(`
## Contexto recuperado do ciclo do cliente

${vectorSearch.context}
`.trim());
  }

  const frameworkContext = await retrieveFrameworkContext(userId, query, 3);
  if (frameworkContext) {
    parts.push(`
## Frameworks consultivos relevantes

${frameworkContext}
`.trim());
  }

  return {
    context: parts.join('\n\n'),
    vectorChunkCount: vectorSearch.chunkCount,
    usedVectorRag: vectorSearch.chunkCount > 0,
    usedFrameworkRag: Boolean(frameworkContext),
  };
}

export async function seedDefaultFrameworks(userId: string): Promise<void> {
  const existing = await listFrameworks(userId);
  if (existing.length > 0) return;

  const { create, COLLECTIONS } = await import('./storage');
  const { generateId, nowIso } = await import('../utils/id');

  for (const fw of DEFAULT_FRAMEWORKS) {
    const id = generateId();
    await create(COLLECTIONS.consultantFrameworks, id, {
      ...fw,
      userId: null,
      createdAt: nowIso(),
    });
  }
}
