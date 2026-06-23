import { ActionCanvas, Objective, Report, ReportStats, TeamMember } from '../types';
import { generateId, nowIso } from '../utils/id';
import { listByUser, create, COLLECTIONS } from './storage';
import { chatCompletion, getDefaultModel, isLlmConfigured } from './llm';
import { logActivity, getActivities } from './activities';
import { loadDomainWaveReportContext } from './domainWaveContext';
import { retrieveRelevantContext } from './rag';
import { indexReportAfterSave } from './ragHooks';
import { AppError } from '../utils/errors';

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
  if (!isLlmConfigured()) {
    throw new AppError(
      503,
      'IA não configurada no servidor. Defina OPENROUTER_API_KEY ou OPENAI_API_KEY para gerar relatórios.',
      'LLM_NOT_CONFIGURED',
    );
  }

  const [objectives, team, actionCanvases, activities, domainContext] = await Promise.all([
    listByUser<Objective>(COLLECTIONS.objectives, userId),
    listByUser<TeamMember>(COLLECTIONS.teamMembers, userId),
    listByUser<ActionCanvas>(COLLECTIONS.actionCanvases, userId),
    getActivities(userId),
    loadDomainWaveReportContext(userId),
  ]);

  const closedCanvases = actionCanvases.filter((c) => c.fechado);

  const stats = computeStats(objectives, team);

  const recentActivities = [...activities]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 25);

  const activitySummary =
    recentActivities.length > 0
      ? recentActivities
          .map((a) => {
            const when = new Date(a.createdAt).toLocaleString('pt-BR');
            return `- [${when}] ${a.tipo}: ${a.descricao}`;
          })
          .join('\n')
      : '- nenhuma atividade registrada';

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

Histórico recente do usuário (${recentActivities.length} eventos):
${activitySummary}
`.trim();

  const ragQuery =
    'relatorio estrategico diagnostico planos action canvas objetivos aprendizados dominio evidencias impacto atrasos';
  const ragContext = await retrieveRelevantContext(userId, ragQuery);

  const prompt = `Com base nos dados abaixo, gere um relatório estratégico executivo em português brasileiro.
Inclua: resumo executivo, análise de progresso, leitura do histórico de atividades do usuário, síntese da Onda 4 — Domínio (quando houver), riscos, recomendações e próximos passos.
Use trechos reais do ciclo do cliente quando disponíveis no contexto RAG. Não invente evidências.
Use markdown com seções claras.

Dados:
${dataSummary}${domainContext ? `\n\n${domainContext}` : ''}${
    ragContext
      ? `\n\n## Contexto RAG — evidências do ciclo do cliente\n${ragContext}`
      : ''
  }`;

  const conteudo = await chatCompletion({
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

  indexReportAfterSave(report);

  return report;
}
