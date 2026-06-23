import type { ActionCanvas, Objective } from '../types';
import type {
  DomainPlanMetrics,
  DomainPlanRow,
  DomainSustainabilityRatings,
  DomainSustainabilityScore,
  DomainWaveData,
  PlanDeadlineStatus,
  PlanExecutionStatus,
} from '../types/domainWave';
import { SUSTAINABILITY_QUESTIONS } from '../types/domainWave';

function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  const due = new Date(dateStr);
  if (Number.isNaN(due.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function derivePlanStatus(canvas: ActionCanvas): PlanExecutionStatus {
  if (canvas.fechado && canvas.signOff === 'sim') return 'concluido';

  const deliveries = canvas.entregas.filter((e) => e.entrega?.trim());
  if (deliveries.length === 0) return 'nao_iniciado';

  const greens = deliveries.filter((e) => e.status === 'verde').length;
  if (greens === deliveries.length) return 'concluido';

  const started = deliveries.some((e) => e.status === 'verde' || e.status === 'amarelo');
  if (started) return 'parcial';

  return 'nao_iniciado';
}

function deriveDeadlineStatus(
  status: PlanExecutionStatus,
  prazoFinal?: string,
  deliveries?: ActionCanvas['entregas'],
): PlanDeadlineStatus {
  if (status === 'nao_iniciado') return 'na';
  if (status === 'concluido') {
    const anyLate = deliveries?.some((e) => e.prazo && isOverdue(e.prazo) && e.status !== 'verde');
    return anyLate ? 'atrasado' : 'no_prazo';
  }
  return isOverdue(prazoFinal) ? 'atrasado' : 'no_prazo';
}

export function derivePlansFromWave3(
  canvases: ActionCanvas[],
  objectives: Objective[] = [],
): DomainPlanRow[] {
  const rows: DomainPlanRow[] = canvases.map((canvas) => {
    const status = derivePlanStatus(canvas);
    return {
      id: canvas.id,
      name: canvas.nomeIniciativa?.trim() || 'Plano sem nome',
      status,
      prazo: deriveDeadlineStatus(status, canvas.prazoFinal, canvas.entregas),
      responsavel: canvas.owner?.trim() || '—',
    };
  });

  for (const obj of objectives) {
    if (rows.some((r) => normalizeTitle(r.name) === normalizeTitle(obj.titulo))) continue;
    const status: PlanExecutionStatus =
      obj.status === 'concluido' ? 'concluido' : obj.status === 'em_andamento' ? 'parcial' : 'nao_iniciado';
    rows.push({
      id: `obj-${obj.id}`,
      name: obj.titulo,
      status,
      prazo: deriveDeadlineStatus(status, obj.prazo),
      responsavel: obj.responsavel?.trim() || '—',
    });
  }

  return rows;
}

function normalizeTitle(value: string) {
  return value.trim().toLowerCase();
}

function actionWeight(status: PlanExecutionStatus, prazo: PlanDeadlineStatus): number {
  if (status === 'concluido') return prazo === 'atrasado' ? 80 : 100;
  if (status === 'parcial') return 50;
  return 0;
}

export function computePlanMetrics(plans: DomainPlanRow[]): DomainPlanMetrics {
  const total = plans.length;
  if (total === 0) {
    return { executionPercent: 0, completedPercent: 0, latePercent: 0, actionVelocity: 0, totalPlans: 0 };
  }

  const completed = plans.filter((p) => p.status === 'concluido').length;
  const late = plans.filter((p) => p.prazo === 'atrasado').length;
  const inMotion = plans.filter((p) => p.status !== 'nao_iniciado').length;

  const weights = plans.map((p) => actionWeight(p.status, p.prazo));
  const actionVelocity = Math.round(weights.reduce((a, b) => a + b, 0) / weights.length);

  return {
    executionPercent: Math.round((inMotion / total) * 100),
    completedPercent: Math.round((completed / total) * 100),
    latePercent: Math.round((late / total) * 100),
    actionVelocity,
    totalPlans: total,
  };
}

export function computeSustainabilityScore(
  ratings: DomainSustainabilityRatings,
): DomainSustainabilityScore | null {
  const values = SUSTAINABILITY_QUESTIONS.map((q) => ratings[q.id]).filter(
    (v): v is number => typeof v === 'number' && v >= 1 && v <= 5,
  );

  if (values.length === 0) return null;

  const average = values.reduce((a, b) => a + b, 0) / values.length;
  const score = Math.round((average / 5) * 100);

  let band: DomainSustainabilityScore['band'] = 'red';
  let label = 'Risco';

  if (average >= 4) {
    band = 'green';
    label = 'Forte';
  } else if (average >= 2.5) {
    band = 'yellow';
    label = 'Atenção';
  }

  return { average: Math.round(average * 10) / 10, score, band, label };
}

export function planStatusLabel(status: PlanExecutionStatus): string {
  switch (status) {
    case 'concluido':
      return 'Concluído';
    case 'parcial':
      return 'Parcial';
    default:
      return 'Não iniciado';
  }
}

export function planDeadlineLabel(prazo: PlanDeadlineStatus): string {
  switch (prazo) {
    case 'no_prazo':
      return 'No prazo';
    case 'atrasado':
      return 'Atrasado';
    default:
      return '—';
  }
}

export function buildDomainLearningsContext(
  plans: DomainPlanRow[],
  metrics: DomainPlanMetrics,
  data: DomainWaveData,
): string {
  const lines = [
    'Onda 4 — Domínio · Learning & Insights',
    `Planos: ${metrics.totalPlans} | Execução: ${metrics.executionPercent}% | Concluídos: ${metrics.completedPercent}% | Atrasados: ${metrics.latePercent}% | Action Velocity: ${metrics.actionVelocity}`,
    '',
    'O que funcionou bem:',
    data.learning.workedWell || '(não preenchido)',
    '',
    'O que não funcionou:',
    data.learning.didNotWork || '(não preenchido)',
    '',
    'O que faríamos diferente:',
    data.learning.wouldDoDifferently || '(não preenchido)',
    '',
    'Maior surpresa:',
    data.learning.biggestSurprise || '(não preenchido)',
    '',
    'Prática a replicar:',
    data.learning.practiceToReplicate || '(não preenchido)',
  ];

  for (const plan of plans.filter((p) => p.status === 'concluido')) {
    const impact = data.impactByPlanId[plan.id];
    if (impact?.evidence) {
      lines.push('', `Evidência (${plan.name}):`, impact.evidence);
    }
  }

  return lines.join('\n');
}
