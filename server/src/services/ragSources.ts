import type { ActionCanvas, ConsultantFramework, Objective, Report } from '../types';
import type { RagSourceDocument } from './ragTypes';

function stringify(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 0);
  } catch {
    return String(value);
  }
}

function formatDiagnosticFields(form: Record<string, unknown>): string {
  const skip = new Set([
    'domainWaveData',
    'organizationalScanData',
    'completedAt',
    'draftUpdatedAt',
    'updatedAt',
    'userId',
    'id',
  ]);
  const lines: string[] = [];
  for (const [key, value] of Object.entries(form)) {
    if (skip.has(key)) continue;
    if (value == null || value === '') continue;
    const text = Array.isArray(value) ? value.join(', ') : String(value);
    if (text.trim()) lines.push(`- ${key}: ${text.trim()}`);
  }
  return lines.join('\n');
}

export function initialFormToRagDoc(
  form: Record<string, unknown> & { id?: string; userId: string }
): RagSourceDocument {
  const scans = form.organizationalScanData ?? form.scans ?? {};
  return {
    userId: form.userId,
    organizationId: (form.organizationId as string | null) ?? null,
    wave: 'diagnostico',
    source: 'initialForms',
    sourceId: form.id ?? form.userId,
    title: 'Diagnóstico inicial',
    text: `
Diagnóstico inicial do cliente (Magnus Waves — Onda 1).

Organização: ${form.organizacao ?? ''}
Produto/Serviço: ${form.produtoServico ?? ''}
Estágio do negócio: ${form.estagioNegocio ?? ''}
Fatores externos: ${form.fatoresExternos ?? ''}
Mudanças recentes: ${form.mudancasRecentes ?? ''}

Campos do diagnóstico:
${formatDiagnosticFields(form)}

Scans organizacionais: ${stringify(scans)}
    `.trim(),
    metadata: {
      updatedAt: form.updatedAt ?? form.draftUpdatedAt ?? null,
      completedAt: form.completedAt ?? null,
    },
    updatedAt:
      typeof form.updatedAt === 'string'
        ? form.updatedAt
        : typeof form.draftUpdatedAt === 'string'
          ? form.draftUpdatedAt
          : null,
  };
}

export function domainWaveDataToRagDoc(params: {
  userId: string;
  domainWaveData: unknown;
  organizationId?: string | null;
}): RagSourceDocument | null {
  let data: Record<string, unknown>;
  if (typeof params.domainWaveData === 'string') {
    if (!params.domainWaveData.trim()) return null;
    try {
      data = JSON.parse(params.domainWaveData) as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (params.domainWaveData && typeof params.domainWaveData === 'object') {
    data = params.domainWaveData as Record<string, unknown>;
  } else {
    return null;
  }

  const learning = (data.learning ?? {}) as Record<string, unknown>;
  const impactByPlanId = data.impactByPlanId ?? {};
  const sustainability = data.sustainability ?? {};

  const hasContent =
    Object.values(learning).some((v) => (Array.isArray(v) ? v.length > 0 : String(v ?? '').trim())) ||
    Object.keys(impactByPlanId as object).length > 0 ||
    Object.values(sustainability as Record<string, unknown>).some((v) => v != null);

  if (!hasContent) return null;

  return {
    userId: params.userId,
    organizationId: params.organizationId ?? null,
    wave: 'dominio',
    source: 'domainWaveData',
    sourceId: `${params.userId}:domainWave`,
    title: 'Aprendizados Onda 4 — Domínio',
    text: `
Dados da Onda 4 — Domínio (Magnus Mind).

Reflexões:
- O que funcionou bem: ${learning.workedWell ?? ''}
- O que não funcionou: ${learning.didNotWork ?? ''}
- O que faríamos diferente: ${learning.wouldDoDifferently ?? ''}
- Maior surpresa: ${learning.biggestSurprise ?? ''}
- Prática a replicar: ${learning.practiceToReplicate ?? ''}
- Top aprendizados (IA): ${stringify(learning.aiTopLearnings ?? [])}

Impacto por plano: ${stringify(impactByPlanId)}
Radar de sustentação: ${stringify(sustainability)}
    `.trim(),
    metadata: {
      updatedAt: data.updatedAt ?? null,
    },
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : null,
  };
}

export function actionCanvasToRagDoc(
  canvas: ActionCanvas & { organizationId?: string | null }
): RagSourceDocument {
  const entregas = canvas.entregas
    .filter((e) => e.entrega.trim())
    .map(
      (e) =>
        `- [${e.status}] ${e.entrega} | responsável: ${e.responsavel || '—'} | prazo: ${e.prazo || '—'}${e.evidencia ? ` | evidência: ${e.evidencia}` : ''}`
    )
    .join('\n');

  const riscos = canvas.riscos
    .filter((r) => r.risco.trim())
    .map((r) => `- ${r.risco} → ação: ${r.acaoTomar || '—'}`)
    .join('\n');

  return {
    userId: canvas.userId,
    organizationId: canvas.organizationId ?? null,
    wave: 'difusao',
    source: 'actionCanvases',
    sourceId: canvas.id,
    title: canvas.nomeIniciativa || 'Action Canvas',
    text: `
Action Canvas da Onda de Difusão.

Iniciativa: ${canvas.nomeIniciativa || ''}
Objetivo específico: ${canvas.objetivoEspecifico || ''}
Status: ${canvas.fechado ? `encerrado (sign-off ${canvas.signOff})` : 'em andamento'}
Owner: ${canvas.owner || ''}
Sponsor: ${canvas.sponsor || ''}
Prazo final: ${canvas.prazoFinal || ''}

Entregas:
${entregas || '- nenhuma entrega registrada'}

Riscos:
${riscos || '- nenhum risco registrado'}
    `.trim(),
    metadata: {
      status: canvas.fechado ? 'fechado' : 'aberto',
      signOff: canvas.signOff,
      createdAt: canvas.createdAt,
      updatedAt: canvas.updatedAt,
    },
    updatedAt: canvas.updatedAt,
  };
}

export function objectiveToRagDoc(
  objective: Objective & { organizationId?: string | null }
): RagSourceDocument {
  return {
    userId: objective.userId,
    organizationId: objective.organizationId ?? null,
    wave: 'difusao',
    source: 'objectives',
    sourceId: objective.id,
    title: objective.titulo,
    text: `
Objetivo estratégico (Onda 3 — Difusão).

Título: ${objective.titulo}
Descrição: ${objective.descricao}
Categoria: ${objective.categoria}
Status: ${objective.status}
Origem: ${objective.origem}
Prioridade: ${objective.prioridade ?? '—'}
Horizonte: ${objective.horizonte ?? '—'}
Responsável: ${objective.responsavel ?? '—'}
Impacto esperado: ${objective.impacto ?? '—'}
Insight de origem: ${objective.insightOrigem ?? '—'}
Prazo: ${objective.prazo ?? '—'}
    `.trim(),
    metadata: {
      status: objective.status,
      categoria: objective.categoria,
      createdAt: objective.createdAt,
      updatedAt: objective.updatedAt,
    },
    updatedAt: objective.updatedAt,
  };
}

export function reportToRagDoc(
  report: Report & { organizationId?: string | null }
): RagSourceDocument {
  return {
    userId: report.userId,
    organizationId: report.organizationId ?? null,
    wave: 'reports',
    source: 'reports',
    sourceId: report.id,
    title: report.titulo,
    text: `
Relatório estratégico gerado.

Título: ${report.titulo}
Resumo: ${report.resumo}
Estatísticas: ${stringify(report.stats)}

Conteúdo:
${report.conteudo}
    `.trim(),
    metadata: {
      createdAt: report.createdAt,
    },
    updatedAt: report.createdAt,
  };
}

export function frameworkToRagDoc(
  framework: ConsultantFramework & { userId?: string | null },
  indexUserId: string
): RagSourceDocument {
  return {
    userId: indexUserId,
    organizationId: null,
    wave: 'frameworks',
    source: 'consultantFrameworks',
    sourceId: framework.id,
    title: framework.titulo,
    text: `
Framework consultivo.

Título: ${framework.titulo}
Conteúdo: ${framework.conteudo}
Tags: ${(framework.tags ?? []).join(', ')}
    `.trim(),
    metadata: {
      tags: framework.tags ?? [],
      createdAt: framework.createdAt,
      frameworkOwnerId: framework.userId ?? null,
    },
    updatedAt: framework.createdAt,
  };
}
