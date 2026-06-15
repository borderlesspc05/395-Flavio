import {
  getActiveWaveId,
  getWaveStatus,
  MAGNUS_WAVES,
  type SprintProgress,
} from '../constants/magnusWaves';
import { getDiagnosticCompletion } from '../constants/diagnosticFlow';
import type {
  ActionCanvas,
  InitialFormData,
  Objective,
  TeamMember,
} from '../types';
import type {
  MidDashboardData,
  MidEvolutionItem,
  MidExecutionRow,
  MidHealth,
  MidHumanRow,
  MidInsightBlock,
  MidMetricRow,
  MidOverview,
  MidSignal,
} from '../types/mid';

interface ReportLike {
  resumo?: string;
  stats?: {
    completionRate?: number;
    objectivesCompleted?: number;
    totalObjectives?: number;
    teamSize?: number;
  };
}

interface BuildMidInput {
  formData: InitialFormData | null;
  formComplete: boolean;
  cycleLabel?: string | null;
  objectives: Objective[];
  canvases: ActionCanvas[];
  team: TeamMember[];
  reports: ReportLike[];
}

function parseScore(value: unknown): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) return Math.min(100, Math.max(0, value));
  if (typeof value === 'string') {
    const n = parseInt(value.replace(/\D/g, ''), 10);
    if (!Number.isNaN(n)) return Math.min(100, Math.max(0, n));
  }
  return null;
}

function engagementToPercent(value: unknown): number {
  const v = String(value ?? '').toLowerCase();
  if (v.includes('alto')) return 78;
  if (v.includes('median')) return 52;
  if (v.includes('baixo')) return 28;
  return 45;
}

function signalFromDelta(delta: number, invert = false): MidSignal {
  const d = invert ? -delta : delta;
  if (d >= 8) return 'green';
  if (d >= -5) return 'yellow';
  return 'red';
}

function signalFromRate(rate: number): MidSignal {
  if (rate >= 70) return 'green';
  if (rate >= 40) return 'yellow';
  return 'red';
}

function formatDelta(before: number, current: number, suffix = '%'): string {
  const delta = current - before;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${Math.round(delta)}${suffix}`;
}

function statusLabel(progress: SprintProgress): string {
  if (!progress.formComplete) return 'Diagnóstico em andamento';
  if (progress.reportsCount > 0) return 'Domínio ativo — evolução contínua';
  if (progress.objectivesTotal > 0) return 'Difusão em execução';
  return 'Design — definição de caminho';
}

function computeHealth(
  diagnosticPercent: number,
  objectiveRate: number,
  deliveryGreenRate: number,
  formComplete: boolean
): { health: MidHealth; label: string; progress: number } {
  if (!formComplete) {
    const p = Math.round(diagnosticPercent * 0.6);
    return { health: p >= 50 ? 'yellow' : 'red', label: 'Diagnóstico incompleto', progress: p };
  }

  const progress = Math.round(
    diagnosticPercent * 0.2 + objectiveRate * 0.35 + deliveryGreenRate * 0.35 + 10
  );
  const clamped = Math.min(100, Math.max(0, progress));

  let health: MidHealth = 'yellow';
  let label = 'Evolução em curso';

  if (clamped >= 72 && deliveryGreenRate >= 55) {
    health = 'green';
    label = 'Execução saudável';
  } else if (clamped < 45 || deliveryGreenRate < 25) {
    health = 'red';
    label = 'Atenção — fricção na execução';
  }

  return { health, label, progress: clamped };
}

function pickOwner(canvases: ActionCanvas[], team: TeamMember[]): string {
  const fromCanvas = canvases.find((c) => c.owner?.trim())?.owner?.trim();
  if (fromCanvas) return fromCanvas;
  const lead = team.find((m) => /lead|gestor|dono|owner/i.test(m.role ?? ''));
  if (lead?.name) return lead.name;
  return team[0]?.name ?? 'A definir';
}

function pickSponsor(canvases: ActionCanvas[], team: TeamMember[]): string {
  const fromCanvas = canvases.find((c) => c.sponsor?.trim())?.sponsor?.trim();
  if (fromCanvas) return fromCanvas;
  return team.find((m) => /sponsor|diretor|ceo/i.test(m.role ?? ''))?.name ?? 'A definir';
}

function buildOverview(
  input: BuildMidInput,
  progress: SprintProgress,
  healthPack: ReturnType<typeof computeHealth>
): MidOverview {
  const waveId = getActiveWaveId(progress);
  const wave = MAGNUS_WAVES.find((w) => w.id === waveId)!;

  const cycleName = input.cycleLabel?.trim();
  return {
    projectName: cycleName || 'People Sprint Magnus Mind',
    owner: pickOwner(input.canvases, input.team),
    sponsor: pickSponsor(input.canvases, input.team),
    statusLabel: statusLabel(progress),
    currentWave: waveId,
    currentWaveLabel: `Onda ${wave.number} · ${wave.label}`,
    progressPercent: healthPack.progress,
    health: healthPack.health,
    healthLabel: healthPack.label,
  };
}

function buildBusinessImpact(
  input: BuildMidInput,
  objectiveRate: number,
  deliveryGreenRate: number,
  latestReport?: ReportLike
): MidMetricRow[] {
  const form = input.formData ?? ({} as InitialFormData);
  const transferBase = parseScore(form.transferReadinessScore) ?? 48;
  const learningBase = parseScore(form.learningEffectivenessScore) ?? 50;
  const systemFriction = parseScore(form.systemFrictionScore) ?? 55;

  const transferCurrent = Math.min(
    100,
    Math.round(transferBase + objectiveRate * 0.35 + deliveryGreenRate * 0.2)
  );
  const learningCurrent = Math.min(100, Math.round(learningBase + objectiveRate * 0.25));
  const efficiencyCurrent = Math.min(100, Math.round(100 - systemFriction * 0.4 + deliveryGreenRate * 0.45));

  const reportRate = latestReport?.stats?.completionRate ?? objectiveRate;

  return [
    {
      id: 'kpi-primary',
      label: 'Execução estratégica',
      before: `${Math.round(objectiveRate * 0.4)}%`,
      current: `${Math.round(reportRate)}%`,
      variation: formatDelta(Math.round(objectiveRate * 0.4), Math.round(reportRate)),
      signal: signalFromRate(reportRate),
      isPrimary: true,
    },
    {
      id: 'transfer',
      label: 'Transfer Readiness',
      before: `${transferBase}`,
      current: `${transferCurrent}`,
      variation: formatDelta(transferBase, transferCurrent, ' pts'),
      signal: signalFromDelta(transferCurrent - transferBase),
    },
    {
      id: 'learning',
      label: 'Learning Effectiveness',
      before: `${learningBase}`,
      current: `${learningCurrent}`,
      variation: formatDelta(learningBase, learningCurrent, ' pts'),
      signal: signalFromDelta(learningCurrent - learningBase),
    },
    {
      id: 'efficiency',
      label: 'Eficiência operacional',
      before: `${Math.max(0, 100 - systemFriction)}%`,
      current: `${efficiencyCurrent}%`,
      variation: formatDelta(Math.max(0, 100 - systemFriction), efficiencyCurrent),
      signal: signalFromRate(efficiencyCurrent),
    },
  ];
}

function buildHumanImpact(
  input: BuildMidInput,
  objectiveRate: number,
  deliveryGreenRate: number
): MidHumanRow[] {
  const form = input.formData ?? ({} as InitialFormData);
  const engagementBefore = engagementToPercent(form.nivelEngajamentoEquipes);
  const engagementCurrent = Math.min(95, Math.round(engagementBefore + deliveryGreenRate * 0.25));

  const totalCanvases = input.canvases.length || 1;
  const signOffYes = input.canvases.filter((c) => c.signOff === 'sim').length;
  const adhesionBefore = Math.round((signOffYes / Math.max(totalCanvases, 1)) * 60);
  const adhesionCurrent = Math.min(100, Math.round(adhesionBefore + deliveryGreenRate * 0.35));

  const teamInvolved = new Set(
    input.canvases.flatMap((c) =>
      c.entregas.map((e) => e.responsavel?.trim()).filter(Boolean)
    )
  ).size;
  const participationBefore = Math.min(40, input.team.length * 8);
  const participationCurrent = Math.min(100, participationBefore + teamInvolved * 12);

  const perceivedBefore = 42;
  const perceivedCurrent = Math.min(92, Math.round(perceivedBefore + objectiveRate * 0.4));

  const culturalBefore = 38;
  const culturalCurrent = Math.min(90, Math.round(culturalBefore + signOffYes * 15));

  return [
    {
      id: 'adhesion',
      label: 'Adesão às iniciativas',
      before: `${adhesionBefore}%`,
      current: `${adhesionCurrent}%`,
      satisfaction: signalFromRate(adhesionCurrent),
    },
    {
      id: 'behavior',
      label: 'Comportamento observado',
      before: deliveryGreenRate < 30 ? 'Irregular' : 'Em formação',
      current: deliveryGreenRate >= 60 ? 'Consistente' : deliveryGreenRate >= 35 ? 'Emergente' : 'Irregular',
      satisfaction: signalFromRate(deliveryGreenRate),
    },
    {
      id: 'participation',
      label: 'Participação',
      before: `${participationBefore}%`,
      current: `${participationCurrent}%`,
      satisfaction: signalFromRate(participationCurrent),
    },
    {
      id: 'sentiment',
      label: 'Sentimento',
      before: engagementBefore < 50 ? 'Cauteloso' : 'Construtivo',
      current: engagementCurrent >= 70 ? 'Engajado' : engagementCurrent >= 50 ? 'Construtivo' : 'Cauteloso',
      satisfaction: signalFromRate(engagementCurrent),
    },
    {
      id: 'perceived',
      label: 'Mudança percebida',
      before: `${perceivedBefore}%`,
      current: `${perceivedCurrent}%`,
      satisfaction: signalFromRate(perceivedCurrent),
    },
    {
      id: 'cultural',
      label: 'Influência cultural',
      before: `${culturalBefore}%`,
      current: `${culturalCurrent}%`,
      satisfaction: signalFromRate(culturalCurrent),
    },
  ];
}

function deliveryStatusLabel(status: MidExecutionRow['status']): string {
  switch (status) {
    case 'verde':
      return 'No ritmo';
    case 'amarelo':
      return 'Atenção';
    case 'vermelho':
      return 'Travado';
    default:
      return 'Pendente';
  }
}

function buildExecution(input: BuildMidInput): MidExecutionRow[] {
  const rows: MidExecutionRow[] = [];

  for (const canvas of input.canvases) {
    for (const entrega of canvas.entregas) {
      if (!entrega.entrega?.trim()) continue;
      const status = entrega.status ?? 'pendente';
      rows.push({
        id: `${canvas.id}-${entrega.id}`,
        delivery: entrega.entrega,
        owner: entrega.responsavel?.trim() || canvas.owner || '—',
        status,
        statusLabel: deliveryStatusLabel(status),
        evidence: entrega.evidencia?.trim() || 'Registrar evidência no follow-up',
        nextAction:
          status === 'vermelho'
            ? 'Desbloquear com sponsor — revisar risco'
            : status === 'amarelo'
              ? 'Reforçar ritmo e evidência até o prazo'
              : status === 'verde'
                ? 'Consolidar e repetir o padrão'
                : 'Definir dono e primeira evidência',
        source: canvas.nomeIniciativa || 'Action Canvas',
      });
    }
  }

  for (const obj of input.objectives.filter((o) => o.status !== 'concluido').slice(0, 6)) {
    const status: MidExecutionRow['status'] =
      obj.status === 'em_andamento' ? 'amarelo' : 'pendente';
    rows.push({
      id: `obj-${obj.id}`,
      delivery: obj.titulo,
      owner: obj.responsavel?.trim() || '—',
      status,
      statusLabel: obj.status === 'em_andamento' ? 'Em andamento' : 'Não iniciado',
      evidence: obj.impacto?.trim() || 'Impacto ainda não documentado',
      nextAction:
        obj.prioridade === 'alta'
          ? 'Priorizar na próxima cadência de follow-up'
          : 'Avançar após destravar entregas críticas',
      source: 'Objetivo estratégico',
    });
  }

  return rows.slice(0, 12);
}

function buildInsights(input: BuildMidInput, deliveryGreenRate: number): MidInsightBlock[] {
  const closed = input.canvases.filter((c) => c.fechado && c.signOff === 'sim');
  const redDeliveries = input.canvases.flatMap((c) =>
    c.entregas.filter((e) => e.status === 'vermelho' && e.entrega.trim())
  );
  const completedHigh = input.objectives.filter(
    (o) => o.status === 'concluido' && o.prioridade === 'alta'
  );
  const latestResumo = input.reports[0]?.resumo?.trim();

  const worked =
    closed.length > 0
      ? `${closed.length} iniciativa(s) com sign-off positivo e entregas verdes (${deliveryGreenRate}% no ritmo).`
      : 'Ainda sem iniciativas encerradas — registre sign-off no Action Canvas para gerar aprendizado.';

  const blocked =
    redDeliveries.length > 0
      ? `${redDeliveries.length} entrega(s) em vermelho precisam de desbloqueio com owner e sponsor.`
      : input.objectives.filter((o) => o.status === 'nao_iniciado').length > 3
        ? 'Objetivos parados — falta ritmo de follow-up semanal.'
        : 'Sem bloqueios críticos registrados; mantenha cadência de evidências.';

  const impact =
    completedHigh.length > 0
      ? `Objetivos de alta prioridade concluídos: ${completedHigh.map((o) => o.titulo).slice(0, 2).join(', ')}.`
      : input.objectives[0]?.impacto
        ? `Impacto esperado em foco: ${input.objectives[0].impacto.slice(0, 120)}.`
        : 'Documente impacto nos objetivos para o MID refletir resultado humano + negócio.';

  return [
    { question: 'O que funcionou?', answer: worked },
    { question: 'O que travou?', answer: blocked },
    { question: 'O que gerou maior impacto?', answer: impact },
    {
      question: 'O que repetir?',
      answer:
        deliveryGreenRate >= 50
          ? 'Ritmo de entregas com evidência + sign-off antes de escalar nova iniciativa.'
          : 'Retomar diagnóstico de causa antes de abrir novas frentes paralelas.',
    },
    {
      question: 'O que ajustar?',
      answer:
        redDeliveries.length > 0
          ? 'Reduzir WIP: uma entrega vermelha por vez, com próxima ação explícita.'
          : latestResumo
            ? latestResumo.slice(0, 200)
            : 'Gerar relatório Domínio para consolidar inteligência organizacional.',
    },
  ];
}

function buildEvolution(input: BuildMidInput, progress: SprintProgress): MidEvolutionItem[] {
  const items: MidEvolutionItem[] = [];
  const waveId = getActiveWaveId(progress);

  if (!progress.formComplete) {
    items.push({
      label: 'Completar Diagnóstico',
      priority: 'alta',
      description: 'Sem verdade diagnóstica, o MID não evolui — finalize o Human-to-Business Canvas.',
      route: '/dashboard/initial-form',
    });
  } else if (waveId === 'design') {
    items.push({
      label: 'Confirmar Gate Zero',
      priority: 'alta',
      description: 'Definir Caminho A ou B no MM Blueprint antes de escalar execução.',
      route: '/dashboard/minha-equipe?tab=consultoria',
    });
  } else if (waveId === 'difusao') {
    items.push({
      label: 'Fechar ciclo de Difusão',
      priority: 'alta',
      description: 'Encerrar Action Canvas com sign-off e evidências para alimentar o Domínio.',
      route: '/dashboard/objetivos',
    });
  } else {
    items.push({
      label: 'Continuous Loop',
      priority: 'media',
      description: 'Revisar aprendizados e decidir se retoma Onda 1 ou sobe nível de maturidade.',
      route: '/dashboard/historico',
    });
  }

  const openHigh = input.objectives
    .filter((o) => o.status !== 'concluido' && o.prioridade === 'alta')
    .slice(0, 2);
  for (const obj of openHigh) {
    items.push({
      label: obj.titulo,
      priority: 'alta',
      description: obj.descricao.slice(0, 140),
      route: '/dashboard/objetivos',
    });
  }

  if (progress.reportsCount === 0 && progress.objectivesTotal > 0) {
    items.push({
      label: 'Gerar relatório Domínio',
      priority: 'media',
      description: 'Consolidar execução em inteligência — Kirkpatrick 4 + narrativa estratégica.',
      route: '/dashboard/relatorios',
    });
  }

  return items.slice(0, 5);
}

export function buildMidDashboard(input: BuildMidInput): MidDashboardData {
  const objectives = input.objectives;
  const total = objectives.length;
  const done = objectives.filter((o) => o.status === 'concluido').length;
  const objectiveRate = total ? Math.round((done / total) * 100) : 0;

  const allDeliveries = input.canvases.flatMap((c) =>
    c.entregas.filter((e) => e.entrega?.trim())
  );
  const greenCount = allDeliveries.filter((e) => e.status === 'verde').length;
  const deliveryGreenRate = allDeliveries.length
    ? Math.round((greenCount / allDeliveries.length) * 100)
    : 0;

  const diagnostic = input.formData
    ? getDiagnosticCompletion(input.formData)
    : { percent: 0, requiredPercent: 0 };
  const diagnosticPercent = input.formComplete
    ? diagnostic.requiredPercent || diagnostic.percent
    : diagnostic.percent;

  const progress: SprintProgress = {
    formComplete: input.formComplete,
    objectivesTotal: total,
    reportsCount: input.reports.length,
  };

  const healthPack = computeHealth(
    diagnosticPercent,
    objectiveRate,
    deliveryGreenRate,
    input.formComplete
  );

  const latestReport = input.reports[0];

  return {
    overview: buildOverview(input, progress, healthPack),
    businessImpact: buildBusinessImpact(input, objectiveRate, deliveryGreenRate, latestReport),
    humanImpact: buildHumanImpact(input, objectiveRate, deliveryGreenRate),
    execution: buildExecution(input),
    insights: buildInsights(input, deliveryGreenRate),
    evolution: buildEvolution(input, progress),
    hasData: input.formComplete || total > 0 || input.canvases.length > 0,
  };
}

export function getWaveProgressForMid(progress: SprintProgress) {
  return MAGNUS_WAVES.map((wave) => ({
    ...wave,
    status: getWaveStatus(wave.id, progress),
  }));
}
