import {
  getActiveWaveId,
  getWaveStatus,
  MAGNUS_WAVES,
  type SprintProgress,
} from '../constants/magnusWaves';
import { buildExecutiveKpis } from './midExecutiveKpis';
import type {
  ActionCanvas,
  InitialFormData,
  Objective,
  TeamMember,
} from '../types';
import {
  buildBriefing,
  buildNowActions,
  buildSprintTimeline,
  computeProjectHealthScore,
  type MemberCheckInSummary,
  type MidIntelligenceInput,
} from './midIntelligence';
import type {
  MidDashboardData,
  MidExecutionRow,
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
  createdAt?: string;
}

export interface BuildMidInput {
  formData: InitialFormData | null;
  formComplete: boolean;
  formCompletedAt?: string | Date | null;
  cycleId?: string | null;
  cycleLabel?: string | null;
  cycleCreatedAt?: string | Date | null;
  userDisplayName?: string | null;
  memberCheckIns?: MemberCheckInSummary[];
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
  health: {
    score: number;
    health: MidOverview['health'];
    label: string;
    factors: MidOverview['healthFactors'];
  }
): MidOverview {
  const waveId = getActiveWaveId(progress);
  const wave = MAGNUS_WAVES.find((w) => w.id === waveId)!;

  const cycleName = input.cycleLabel?.trim();
  return {
    projectName: cycleName || 'People Sprint',
    owner: pickOwner(input.canvases, input.team),
    sponsor: pickSponsor(input.canvases, input.team),
    statusLabel: statusLabel(progress),
    currentWave: waveId,
    currentWaveLabel: `Onda ${wave.number} · ${wave.label}`,
    progressPercent: health.score,
    health: health.health,
    healthLabel: health.label,
    healthFactors: health.factors,
  };
}

function buildExecution(input: BuildMidInput): MidExecutionRow[] {
  const rows: MidExecutionRow[] = [];

  for (const canvas of input.canvases) {
    for (const entrega of canvas.entregas) {
      for (const item of entrega.checklistItems ?? []) {
        if (!item.texto?.trim() || item.done || item.progresso === 100) continue;
        const overdue = item.prazo
          ? new Date(item.prazo).getTime() < Date.now()
          : false;
        const status: MidExecutionRow['status'] = overdue
          ? 'vermelho'
          : (item.progresso ?? 0) >= 50
            ? 'amarelo'
            : 'pendente';
        rows.push({
          id: `${canvas.id}-${entrega.id}-${item.id}`,
          delivery: item.texto,
          owner: item.responsavel?.trim() || entrega.responsavel?.trim() || canvas.owner || '—',
          status,
          statusLabel: overdue ? 'Atrasada' : `${item.progresso ?? 0}% concluída`,
          evidence: `${entrega.entrega} · ${item.prioridade ?? 'média'} prioridade`,
          nextAction: overdue
            ? `Regularizar “${item.texto}” antes de iniciar novas atividades dependentes.`
            : (item.progresso ?? 0) === 0
              ? `Confirmar responsável e iniciar “${item.texto}”.`
              : `Concluir a próxima evidência de “${item.texto}” até o prazo.`,
          source: canvas.nomeIniciativa || 'Action Canvas',
          deadline: item.prazo || entrega.prazo,
          priority: item.prioridade ?? 'media',
        });
      }
    }
  }
  const priorityRank = { critica: 0, alta: 1, media: 2, baixa: 3 };
  return rows
    .sort((left, right) => {
      const statusRank = { vermelho: 0, amarelo: 1, pendente: 2, verde: 3 };
      const byStatus = statusRank[left.status] - statusRank[right.status];
      if (byStatus) return byStatus;
      const byPriority =
        priorityRank[left.priority ?? 'media'] - priorityRank[right.priority ?? 'media'];
      if (byPriority) return byPriority;
      return (left.deadline || '9999').localeCompare(right.deadline || '9999');
    })
    .slice(0, 5);
}

function toIntelligenceInput(input: BuildMidInput): MidIntelligenceInput {
  return {
    projectName: input.cycleLabel?.trim() || 'People Sprint',
    userDisplayName: input.userDisplayName,
    cycleCreatedAt: input.cycleCreatedAt,
    formComplete: input.formComplete,
    formCompletedAt: input.formCompletedAt,
    objectives: input.objectives,
    canvases: input.canvases,
    team: input.team,
    memberCheckIns: input.memberCheckIns,
    reportsCount: input.reports.length,
  };
}

export function buildMidDashboard(input: BuildMidInput): MidDashboardData {
  const objectives = input.objectives;
  const total = objectives.length;
  const hasData =
    input.formComplete ||
    total > 0 ||
    input.canvases.length > 0 ||
    input.team.length > 0 ||
    input.reports.length > 0 ||
    (input.memberCheckIns?.length ?? 0) > 0;

  const progress: SprintProgress = {
    formComplete: input.formComplete,
    objectivesTotal: total,
    reportsCount: input.reports.length,
  };

  const intel = toIntelligenceInput(input);
  const healthPack = hasData
    ? computeProjectHealthScore(intel)
    : {
        score: 0,
        health: 'yellow' as const,
        label: 'Aguardando dados',
        factors: [],
      };
  const briefing = buildBriefing(intel, healthPack.score, healthPack.label);
  const nowActions = hasData ? buildNowActions(intel) : [];
  const timeline = hasData ? buildSprintTimeline(intel, healthPack.health) : [];

  const executiveKpis = hasData
    ? buildExecutiveKpis({
        formData: input.formData,
        formComplete: input.formComplete,
        cycleId: input.cycleId ?? undefined,
        objectives,
        canvases: input.canvases,
        team: input.team,
        reports: input.reports,
      })
    : [];

  return {
    overview: buildOverview(input, progress, healthPack),
    executiveKpis,
    execution: buildExecution(input),
    timeline,
    briefing,
    nowActions,
    hasData,
  };
}

export function getWaveProgressForMid(progress: SprintProgress) {
  return MAGNUS_WAVES.map((wave) => ({
    ...wave,
    status: getWaveStatus(wave.id, progress),
  }));
}
