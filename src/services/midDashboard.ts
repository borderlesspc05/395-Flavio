import {
  getActiveWaveId,
  getWaveStatus,
  MAGNUS_WAVES,
  type SprintProgress,
} from '../constants/magnusWaves';
import { getDiagnosticCompletion } from '../constants/diagnosticFlow';
import { buildExecutiveKpis } from './midExecutiveKpis';
import type {
  ActionCanvas,
  InitialFormData,
  Objective,
  TeamMember,
} from '../types';
import type {
  MidDashboardData,
  MidExecutionRow,
  MidHealth,
  MidOverview,
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
  cycleId?: string | null;
  cycleLabel?: string | null;
  objectives: Objective[];
  canvases: ActionCanvas[];
  team: TeamMember[];
  reports: ReportLike[];
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

  const executiveKpis = buildExecutiveKpis({
    formData: input.formData,
    formComplete: input.formComplete,
    cycleId: input.cycleId ?? undefined,
    objectives,
    canvases: input.canvases,
    team: input.team,
    reports: input.reports,
  });

  return {
    overview: buildOverview(input, progress, healthPack),
    executiveKpis,
    execution: buildExecution(input),
    hasData: input.formComplete || total > 0 || input.canvases.length > 0,
  };
}

export function getWaveProgressForMid(progress: SprintProgress) {
  return MAGNUS_WAVES.map((wave) => ({
    ...wave,
    status: getWaveStatus(wave.id, progress),
  }));
}
