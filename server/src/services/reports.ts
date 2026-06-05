import { ActionCanvas, Objective, Report, ReportStats, TeamMember } from '../types';
import { generateId, nowIso } from '../utils/id';
import { listByUser, create, COLLECTIONS } from './storage';
import { chatCompletion, getDefaultModel, isLlmNotConfiguredError } from './llm';
import { env } from '../config/env';
import { logActivity } from './activities';

function computeStats(objectives: Objective[], team: TeamMember[]): ReportStats {
  const total = objectives.length;
  const completed = objectives.filter((o) => o.status === 'concluido').length;
  const inProgress = objectives.filter((o) => o.status === 'em_andamento').length;
  const aiObjectives = objectives.filter((o) => o.origem === 'ia').length;

  return {
    totalObjectives: total,
    objectivesCompleted: completed,
    objectivesInProgress: inProgress,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    teamSize: team.filter((m) => m.ativo !== false).length,
    aiObjectives,
  };
}

export async function generateReport(userId: string): Promise<Report> {
  const [objectives, team, actionCanvases] = await Promise.all([
    listByUser<Objective>(COLLECTIONS.objectives, userId),
    listByUser<TeamMember>(COLLECTIONS.teamMembers, userId),
    listByUser<ActionCanvas>(COLLECTIONS.actionCanvases, userId),
  ]);

  const closedCanvases = actionCanvases.filter((c) => c.fechado);

  const stats = computeStats(objectives, team);

  const dataSummary = `
Objetivos (${stats.totalObjectives} total):
- Concluídos: ${stats.objectivesCompleted}
- Em andamento: ${stats.objectivesInProgress}
- Taxa de conclusão: ${stats.completionRate}%
- Criados por IA: ${stats.aiObjectives}

Equipe: ${stats.teamSize} membros ativos

Detalhes dos objetivos:
${objectives
  .slice(0, 15)
  .map((o) => `- [${o.status}] ${o.titulo} (${o.categoria})`)
  .join('\n')}

Action Canvas encerrados (${closedCanvases.length}):
${closedCanvases
  .map((c) => {
    const n = c.entregas.filter((e) => e.entrega.trim()).length;
    return `- ${c.nomeIniciativa} | sign-off ${c.signOff} | ${n} entregas | owner ${c.owner}`;
  })
  .join('\n') || '- nenhum'}
`.trim();

  const prompt = `Com base nos dados abaixo, gere um relatório estratégico executivo em português brasileiro.
Inclua: resumo executivo, análise de progresso, riscos, recomendações e próximos passos.
Use markdown com seções claras.

Dados:
${dataSummary}`;

  let conteudo: string;
  try {
    conteudo = await chatCompletion({
      model: getDefaultModel(),
      messages: [
        {
          role: 'system',
          content:
            'Você é um consultor estratégico sênior. Produza relatórios concisos e acionáveis para executivos.',
        },
        { role: 'user', content: prompt },
      ],
      maxTokens: 3000,
    });
  } catch (err) {
    const e = err as { code?: string };
    if (isLlmNotConfiguredError(err)) {
      conteudo = buildFallbackReport(stats, objectives);
    } else {
      throw err;
    }
  }

  const resumo =
    conteudo.split('\n').find((l) => l.trim().length > 20)?.slice(0, 200) ??
    `Relatório com ${stats.totalObjectives} objetivos e ${stats.completionRate}% de conclusão.`;

  const id = generateId();
  const report: Report = {
    id,
    userId,
    titulo: `Relatório Estratégico — ${new Date().toLocaleDateString('pt-BR')}`,
    conteudo,
    resumo,
    stats,
    createdAt: nowIso(),
  };

  await create(COLLECTIONS.reports, id, report as unknown as Record<string, unknown>);
  await logActivity(userId, 'report', 'Relatório estratégico gerado', {
    entidade: 'report',
    entidadeId: id,
  });

  return report;
}

function buildFallbackReport(stats: ReportStats, objectives: Objective[]): string {
  return `# Relatório Estratégico (Modo Demonstração)

## Resumo Executivo
Plataforma Magnus Mind registra **${stats.totalObjectives}** objetivos estratégicos com taxa de conclusão de **${stats.completionRate}%**.

## Progresso
- Objetivos concluídos: ${stats.objectivesCompleted}
- Em andamento: ${stats.objectivesInProgress}
- Sugeridos por IA: ${stats.aiObjectives}
- Equipe ativa: ${stats.teamSize} membros

## Objetivos em Destaque
${objectives
  .slice(0, 5)
  .map((o) => `- **${o.titulo}** — ${o.status} (${o.categoria})`)
  .join('\n')}

## Recomendações
1. Priorizar objetivos em andamento com prazo próximo
2. Revisar OKRs no próximo ciclo de planejamento
3. Configurar OPENROUTER_API_KEY para análises enriquecidas por IA

---
*Relatório gerado automaticamente pelo Magnus Mind*
`;
}
