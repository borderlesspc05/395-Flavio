/** Adapta respostas da API em produção (Render) ao contrato esperado pelo frontend. */

type Raw = Record<string, unknown>;

export interface NormalizedAiModel {
  id: string;
  name: string;
}

export interface NormalizedChatResponse {
  conversationId: string;
  reply: string;
  suggestedObjectives?: unknown[];
  demoMode?: boolean;
}

export interface NormalizedConversation {
  id: string;
  title: string;
  model?: string;
  currentModelId?: string;
  messages: Array<{
    role: string;
    content: string;
    createdAt?: string;
    timestamp?: string;
  }>;
}

export interface NormalizedSuggestItem {
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade?: string | number;
  horizonte?: string;
  impacto?: string;
  responsavel?: string;
  insightOrigem?: string;
}

export interface ReportStatsShape {
  totalObjectives?: number;
  objectivesCompleted?: number;
  objectivesInProgress?: number;
  completionRate?: number;
  teamSize?: number;
  aiObjectives?: number;
}

export interface NormalizedReport {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  titulo?: string;
  conteudo?: string;
  resumo?: string;
  stats?: ReportStatsShape;
  content?: Record<string, unknown>;
}

function asRecord(v: unknown): Raw | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : null;
}

export function normalizeModels(raw: unknown): NormalizedAiModel[] {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((item) => {
    const m = asRecord(item) ?? {};
    return {
      id: String(m.id ?? ''),
      name: String(m.name ?? m.displayName ?? m.id ?? 'Modelo'),
    };
  });
}

export function normalizeChatResponse(raw: unknown): NormalizedChatResponse {
  const r = asRecord(raw) ?? {};
  if (r.conversationId != null && r.reply != null) {
    return {
      conversationId: String(r.conversationId),
      reply: String(r.reply),
      suggestedObjectives: Array.isArray(r.suggestedObjectives) ? r.suggestedObjectives : undefined,
      demoMode: r.demoMode === true,
    };
  }

  const conv = asRecord(r.conversation);
  const messages = Array.isArray(r.messages) ? r.messages : [];
  const assistants = messages
    .map((m) => asRecord(m))
    .filter((m): m is Raw => m?.role === 'assistant');
  const last = assistants[assistants.length - 1];

  return {
    conversationId: String(conv?.id ?? ''),
    reply: String(last?.content ?? ''),
    suggestedObjectives: Array.isArray(r.suggestedObjectives) ? r.suggestedObjectives : undefined,
    demoMode: r.demoMode === true,
  };
}

export function normalizeConversationDetail(raw: unknown): NormalizedConversation {
  const r = asRecord(raw) ?? {};
  const wrapped = asRecord(r.conversation);

  if (wrapped) {
    const messages = Array.isArray(r.messages) ? r.messages : [];
    const modelId = wrapped.currentModelId ?? wrapped.model;
    return {
      id: String(wrapped.id ?? ''),
      title: String(wrapped.title ?? 'Nova conversa'),
      model: modelId ? String(modelId) : undefined,
      currentModelId: modelId ? String(modelId) : undefined,
      messages: messages.map((m) => {
        const msg = asRecord(m) ?? {};
        return {
          role: String(msg.role ?? 'user'),
          content: String(msg.content ?? ''),
          createdAt: msg.createdAt ? String(msg.createdAt) : undefined,
          timestamp: msg.timestamp ? String(msg.timestamp) : undefined,
        };
      }),
    };
  }

  const messages = Array.isArray(r.messages) ? r.messages : [];
  return {
    id: String(r.id ?? ''),
    title: String(r.title ?? 'Nova conversa'),
    model: r.model ? String(r.model) : undefined,
    currentModelId: r.currentModelId ? String(r.currentModelId) : undefined,
    messages: messages.map((m) => {
      const msg = asRecord(m) ?? {};
      return {
        role: String(msg.role ?? 'user'),
        content: String(msg.content ?? ''),
        createdAt: msg.createdAt ? String(msg.createdAt) : undefined,
        timestamp: msg.timestamp ? String(msg.timestamp) : undefined,
      };
    }),
  };
}

export function normalizeConversationsList(raw: unknown): unknown[] {
  const list = Array.isArray(raw) ? raw : [];
  return list.map((item) => {
    const c = asRecord(item) ?? {};
    return {
      ...c,
      preview: c.preview ?? c.lastMessage ?? c.title,
      currentModelId: c.currentModelId ?? c.model,
      updatedAt: c.updatedAt ?? c.createdAt,
    };
  });
}

export function normalizeSuggestResponse(raw: unknown): { suggestions: NormalizedSuggestItem[] } {
  const r = asRecord(raw);
  const list = r?.suggestions ?? r?.objectives;
  const arr = Array.isArray(list) ? list : Array.isArray(raw) ? raw : [];

  const suggestions = arr.map((item) => {
    const o = asRecord(item) ?? {};
    return {
      titulo: String(o.titulo ?? ''),
      descricao: String(o.descricao ?? ''),
      categoria: String(o.categoria ?? 'Geral'),
      prioridade: o.prioridade as string | number | undefined,
      horizonte: o.horizonte ? String(o.horizonte) : undefined,
      impacto: o.impacto ? String(o.impacto) : o.impactoEstimado ? String(o.impactoEstimado) : undefined,
      responsavel: o.responsavel ? String(o.responsavel) : o.owner ? String(o.owner) : undefined,
      insightOrigem: o.insightOrigem ? String(o.insightOrigem) : undefined,
    };
  });

  return { suggestions };
}

function buildReportMarkdown(data: Raw, title: string): { conteudo: string; resumo: string } {
  const insights = Array.isArray(data.insights) ? data.insights : [];
  const objectives = Array.isArray(data.objectives) ? data.objectives : [];

  const resumoParts = insights
    .map((i) => {
      const ins = asRecord(i);
      return ins?.description ? String(ins.description) : ins?.title ? String(ins.title) : '';
    })
    .filter(Boolean);

  let resumo = resumoParts.join(' ').trim();
  if (resumo.length > 320) resumo = `${resumo.slice(0, 317)}...`;

  let conteudo = `# ${title}\n\n`;

  if (resumo) {
    conteudo += `## Resumo executivo\n\n${resumo}\n\n`;
  }

  if (insights.length > 0) {
    conteudo += `## Insights\n\n`;
    for (const item of insights) {
      const ins = asRecord(item);
      if (!ins) continue;
      conteudo += `### ${ins.title ?? 'Insight'}\n\n${ins.description ?? ''}\n\n`;
    }
  }

  if (objectives.length > 0) {
    conteudo += `## Objetivos\n\n`;
    for (const item of objectives) {
      const o = asRecord(item);
      if (!o) continue;
      conteudo += `- **${o.titulo}** (${o.status ?? '—'}) — ${o.descricao ?? ''}\n`;
    }
  }

  const stats = asRecord(data.statistics);
  const objStats = asRecord(stats?.objectives);
  if (objStats) {
    const total = Number(objStats.total ?? 0);
    const completed = Number(objStats.completed ?? 0);
    if (!resumo) {
      resumo = `Relatório com ${total} objetivo(s) e ${completed} concluído(s).`;
    }
    conteudo += `\n## Estatísticas\n\n`;
    conteudo += `- Total de objetivos: ${total}\n`;
    conteudo += `- Concluídos: ${completed}\n`;
    conteudo += `- Em andamento: ${Number(objStats.inProgress ?? 0)}\n`;
  }

  if (!conteudo.trim()) {
    conteudo = `# ${title}\n\nRelatório gerado com sucesso. Consulte as estatísticas na visualização.`;
  }
  if (!resumo) {
    resumo = 'Relatório estratégico consolidado com dados da plataforma.';
  }

  return { conteudo, resumo };
}

function statsFromRenderData(data: Raw): ReportStatsShape | undefined {
  const stats = asRecord(data.statistics);
  const objStats = asRecord(stats?.objectives);
  const teamStats = asRecord(stats?.team);
  if (!objStats && !teamStats) return undefined;

  const total = Number(objStats?.total ?? 0);
  const completed = Number(objStats?.completed ?? 0);
  const inProgress = Number(objStats?.inProgress ?? 0);
  const objectives = Array.isArray(data.objectives) ? data.objectives : [];
  const aiObjectives = objectives.filter((o) => asRecord(o)?.origem === 'ia').length;

  return {
    totalObjectives: total,
    objectivesCompleted: completed,
    objectivesInProgress: inProgress,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    teamSize: Number(teamStats?.active ?? teamStats?.total ?? 0),
    aiObjectives,
  };
}

export function normalizeReport(raw: unknown): NormalizedReport {
  const r = asRecord(raw) ?? {};
  const title = String(r.title ?? r.titulo ?? 'Relatório');
  const createdAt = String(r.createdAt ?? r.generatedAt ?? new Date().toISOString());

  if (r.conteudo) {
    return {
      id: String(r.id ?? ''),
      title,
      titulo: r.titulo ? String(r.titulo) : title,
      type: String(r.type ?? 'completo'),
      createdAt,
      conteudo: String(r.conteudo),
      resumo: r.resumo ? String(r.resumo) : undefined,
      stats: (r.stats as ReportStatsShape) || undefined,
      content: asRecord(r.content) ?? asRecord(r.data) ?? undefined,
    };
  }

  const data = asRecord(r.data);
  if (data) {
    const stats = (r.stats as ReportStatsShape) || statsFromRenderData(data);
    const { conteudo, resumo } = buildReportMarkdown(data, title);
    return {
      id: String(r.id ?? ''),
      title,
      titulo: title,
      type: String(r.type ?? 'completo'),
      createdAt,
      conteudo,
      resumo,
      stats,
      content: data,
    };
  }

  return {
    id: String(r.id ?? ''),
    title,
    titulo: title,
    type: String(r.type ?? 'completo'),
    createdAt,
    stats: (r.stats as ReportStatsShape) || undefined,
  };
}
