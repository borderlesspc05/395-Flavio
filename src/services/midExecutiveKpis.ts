import type { ActionCanvas, InitialFormData, Objective, TeamMember } from '../types';
import type { MidExecutiveKpi, MidTrend } from '../types/mid';
import { computeEvolutionIndex, getEvolutionBand, getEvolutionLabel } from '../utils/evolutionIndex';
import { computeSustainabilityScore } from '../utils/domainWave';
import { pickDaily, rotateDaily } from '../utils/dailyInsight';
import { parseDomainWaveData } from './domainWaveStorage';
import { ensureMidScanBaseline, getMidScanBaseline } from './midBaseline';
import { deliveryProgressWeight } from '../utils/deliveryChecklist';

interface ReportLike {
  stats?: {
    completionRate?: number;
    objectivesCompleted?: number;
    totalObjectives?: number;
    teamSize?: number;
  };
}

export interface BuildExecutiveKpisInput {
  formData: InitialFormData | null;
  formComplete: boolean;
  cycleId?: string;
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

function trendFromDelta(delta: number, threshold = 2): MidTrend {
  if (delta > threshold) return 'up';
  if (delta < -threshold) return 'down';
  return 'flat';
}

function formatTrend(delta: number): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}%`;
}

function velocityBand(score: number): { band: MidExecutiveKpi['band']; label: string } {
  if (score >= 80) return { band: 'strong', label: 'Alta Performance' };
  if (score >= 50) return { band: 'steady', label: 'Execução Consistente' };
  return { band: 'low', label: 'Execução Baixa' };
}

function momentumBand(score: number): { band: MidExecutiveKpi['band']; label: string; waves: number } {
  if (score >= 85) return { band: 'strong', label: 'Transformação acelerada', waves: 4 };
  if (score >= 70) return { band: 'steady', label: 'Forte movimento', waves: 3 };
  if (score >= 50) return { band: 'attention', label: 'Ganhando tração', waves: 2 };
  return { band: 'low', label: 'Perdendo força', waves: 1 };
}

function businessBand(score: number): { band: MidExecutiveKpi['band']; label: string } {
  if (score >= 80) return { band: 'strong', label: 'Alto impacto' };
  if (score >= 60) return { band: 'steady', label: 'Impacto moderado' };
  return { band: 'low', label: 'Baixo impacto' };
}

function isOnTime(prazo?: string): boolean {
  if (!prazo) return true;
  const due = new Date(prazo);
  if (Number.isNaN(due.getTime())) return true;
  return due.getTime() >= Date.now();
}

type ActionState = 'on_time' | 'late' | 'in_progress' | 'not_started';

function classifyAction(status: string | undefined, prazo?: string): ActionState {
  if (status === 'verde' || status === 'concluido') {
    return isOnTime(prazo) ? 'on_time' : 'late';
  }
  if (status === 'amarelo' || status === 'em_andamento') return 'in_progress';
  return 'not_started';
}

function actionWeight(state: ActionState): number {
  switch (state) {
    case 'on_time':
      return 100;
    case 'late':
      return 80;
    case 'in_progress':
      return 50;
    default:
      return 0;
  }
}

function computeActionVelocity(canvases: ActionCanvas[], objectives: Objective[]) {
  const weighted: number[] = [];

  for (const canvas of canvases) {
    for (const entrega of canvas.entregas) {
      if (!entrega.entrega?.trim()) continue;
      weighted.push(deliveryProgressWeight(entrega));
    }
  }

  for (const obj of objectives) {
    weighted.push(actionWeight(classifyAction(obj.status === 'concluido' ? 'verde' : obj.status, obj.prazo)));
  }

  const total = weighted.length;
  if (total === 0) return { score: 0, total: 0, completed: 0 };

  const score = Math.round(weighted.reduce((a, b) => a + b, 0) / total);
  const completed = weighted.filter((w) => w >= 80).length;
  return { score, total, completed };
}

function computeParticipation(canvases: ActionCanvas[], objectives: Objective[], team: TeamMember[]) {
  const activeOwners = new Set<string>();
  for (const canvas of canvases) {
    if (canvas.owner?.trim()) activeOwners.add(canvas.owner.trim().toLowerCase());
    for (const e of canvas.entregas) {
      if (e.responsavel?.trim()) activeOwners.add(e.responsavel.trim().toLowerCase());
      for (const item of e.checklistItems ?? []) {
        if (item.responsavel?.trim()) activeOwners.add(item.responsavel.trim().toLowerCase());
      }
    }
  }
  for (const obj of objectives) {
    if (obj.responsavel?.trim()) activeOwners.add(obj.responsavel.trim().toLowerCase());
  }

  const invited = Math.max(team.length, 1);
  const active = Math.min(invited, activeOwners.size);
  return Math.round((active / invited) * 100);
}

function computeConsistency(canvases: ActionCanvas[], objectives: Objective[], reports: ReportLike[]) {
  const weeks = new Set<string>();
  const mark = (iso?: string) => {
    if (!iso) return;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return;
    weeks.add(`${d.getFullYear()}-W${Math.ceil((d.getDate() + 1) / 7)}-${d.getMonth()}`);
  };

  for (const canvas of canvases) {
    mark(canvas.updatedAt);
    mark(canvas.createdAt);
  }
  for (const obj of objectives) {
    mark(obj.updatedAt);
    mark(obj.createdAt);
  }
  if (reports.length > 0) weeks.add('report');

  const streak = weeks.size;
  if (streak >= 4) return 90;
  if (streak === 3) return 75;
  if (streak === 2) return 55;
  if (streak === 1) return 30;
  return 0;
}

function computeBusinessImpact(
  form: InitialFormData,
  objectiveRate: number,
  deliveryGreenRate: number,
  reportRate: number
) {
  const transfer = parseScore(form.transferReadinessScore) ?? 50;
  const learning = parseScore(form.learningEffectivenessScore) ?? 50;
  const systemFriction = parseScore(form.systemFrictionScore) ?? 50;
  const productivityProxy = Math.min(100, Math.round(100 - systemFriction * 0.35 + deliveryGreenRate * 0.4));

  const evolutions = [
    objectiveRate * 0.35,
    Math.max(0, transfer - 50) * 0.5,
    Math.max(0, learning - 50) * 0.45,
    Math.max(0, productivityProxy - 45) * 0.4,
    Math.max(0, reportRate - 40) * 0.55,
  ];

  const avgEvolution = evolutions.reduce((a, b) => a + b, 0) / evolutions.length;
  const score = Math.min(100, Math.max(0, Math.round(50 + avgEvolution * 2.4)));

  return {
    score,
    avgEvolution: Math.round(avgEvolution * 10) / 10,
    indicators: [
      { label: 'Execução', evolution: `${Math.round(objectiveRate)}%` },
      { label: 'Transferência', evolution: `${Math.round(Math.max(0, transfer - 50))}%` },
      { label: 'Aprendizagem', evolution: `${Math.round(Math.max(0, learning - 50))}%` },
      { label: 'Produtividade', evolution: `${Math.round(Math.max(0, productivityProxy - 45))}%` },
    ],
  };
}

export function buildExecutiveKpis(input: BuildExecutiveKpisInput): MidExecutiveKpi[] {
  const form = input.formData ?? ({} as InitialFormData);
  const evolution = input.formData ? computeEvolutionIndex(input.formData) : null;
  const currentScore = evolution?.score ?? 0;

  const baseline = input.formComplete
    ? ensureMidScanBaseline(input.cycleId, currentScore)
    : getMidScanBaseline(input.cycleId) ?? currentScore;

  const evolutionDelta =
    baseline > 0 ? ((currentScore - baseline) / baseline) * 100 : 0;
  const evolutionTrend = trendFromDelta(evolutionDelta);
  const evolutionBand = evolution?.band ?? getEvolutionBand(currentScore);

  const velocity = computeActionVelocity(input.canvases, input.objectives);
  const velocityMeta = velocityBand(velocity.score);

  const participation = computeParticipation(input.canvases, input.objectives, input.team);
  const consistency = computeConsistency(input.canvases, input.objectives, input.reports);
  const momentumRaw =
    participation * 0.25 +
    currentScore * 0.25 +
    velocity.score * 0.25 +
    consistency * 0.25;
  const momentumScore = Math.round(momentumRaw * 10) / 10;
  const momentumMeta = momentumBand(momentumScore);

  const totalObjectives = input.objectives.length;
  const doneObjectives = input.objectives.filter((o) => o.status === 'concluido').length;
  const objectiveRate = totalObjectives ? Math.round((doneObjectives / totalObjectives) * 100) : 0;

  const allDeliveries = input.canvases.flatMap((c) => c.entregas.filter((e) => e.entrega?.trim()));
  const greenCount = allDeliveries.filter((e) => deliveryProgressWeight(e) >= 80).length;
  const deliveryGreenRate = allDeliveries.length
    ? Math.round((greenCount / allDeliveries.length) * 100)
    : 0;
  const reportRate = input.reports[0]?.stats?.completionRate ?? objectiveRate;

  const business = computeBusinessImpact(form, objectiveRate, deliveryGreenRate, reportRate);
  const businessMeta = businessBand(business.score);

  const domainData = input.formData ? parseDomainWaveData(input.formData.domainWaveData) : null;
  const sustainability = domainData
    ? computeSustainabilityScore(domainData.sustainability)
    : null;

  const sustainabilityKpi: MidExecutiveKpi = sustainability
    ? {
        id: 'sustainability-score',
        question: 'A mudança vai sobreviver?',
        title: 'Sustainability Score',
        icon: 'shield',
        score: sustainability.score,
        label: sustainability.label,
        band:
          sustainability.band === 'green'
            ? 'strong'
            : sustainability.band === 'yellow'
              ? 'attention'
              : 'low',
        trend: 'flat',
        trendValue:
          sustainability.band === 'green' ? '🟢 Forte' : sustainability.band === 'yellow' ? '🟡 Atenção' : '🔴 Risco',
        meta: rotateDaily(
          [
            `Média ${sustainability.average}/5`,
            'Onda 4 — Domínio',
            'Radar de Sustentação',
            `Leitura de hoje: ${sustainability.label}`,
          ],
          'kpi-sustainability-meta',
        ).slice(0, 3),
        detail: pickDaily(
          [
            `Score ${sustainability.score}/100 — a sustentação depende de rotina, dono e indicadores vivos.`,
            `Hoje o radar aponta "${sustainability.label}". Reforce o que mantém a mudança viva após o ciclo.`,
            `Média ${sustainability.average}/5 nos critérios de Domínio. Um foco diário aqui protege o resultado.`,
            'Prevê se a transformação permanecerá viva após o projeto, com base em rotina, dono, indicadores, liderança e crença da equipe.',
          ],
          `kpi-sustainability-${sustainability.score}`,
        ),
      }
    : {
        id: 'sustainability-score',
        question: 'A mudança vai sobreviver?',
        title: 'Sustainability Score',
        icon: 'shield',
        score: 0,
        label: 'Preencher no Domínio',
        band: 'attention',
        trend: 'flat',
        trendValue: 'Onda 4',
        meta: rotateDaily(
          ['Radar de Sustentação', '5 critérios (1–5)', '/dashboard/relatorios', 'Ainda sem leitura de Domínio'],
          'kpi-sustainability-empty-meta',
        ).slice(0, 3),
        detail: pickDaily(
          [
            'Ainda sem dados de Domínio. Preencha o radar para projetar se a mudança sobrevive ao ciclo.',
            'Hoje: avance a Onda 4 e registre rotina, responsável e indicadores de sustentação.',
            'Avalie rotina, responsável, indicadores, liderança e crença da equipe na Onda 4 para alimentar este score.',
          ],
          'kpi-sustainability-empty',
        ),
      };

  return [
    {
      id: 'evolution-index',
      question: 'Estamos evoluindo?',
      title: 'Evolution Index',
      icon: 'rocket',
      score: currentScore,
      label: evolution?.label ?? getEvolutionLabel(evolutionBand),
      band: evolutionBand,
      trend: evolutionTrend,
      trendValue: formatTrend(evolutionDelta),
      meta: rotateDaily(
        [
          `Baseline ${baseline}`,
          `Atual ${currentScore}`,
          `Evolução ${formatTrend(evolutionDelta)}`,
          `Leitura de hoje: ${evolution?.label ?? getEvolutionLabel(evolutionBand)}`,
        ],
        `kpi-evolution-meta-${currentScore}`,
      ).slice(0, 3),
      detail: pickDaily(
        [
          `De ${baseline} para ${currentScore} (${formatTrend(evolutionDelta)}). O diagnóstico mostra se o ciclo está avançando de verdade.`,
          `Hoje o índice está em ${currentScore}/100. Compare com o baseline e escolha um movimento que aumente a tração.`,
          currentScore < baseline
            ? 'A leitura de hoje aponta retração frente ao baseline — revise o que travou desde o diagnóstico.'
            : 'Há ganho frente ao baseline. Consolide o padrão que gerou essa evolução.',
          'Mede o quanto a organização evoluiu em relação ao diagnóstico inicial, com base nos scans consolidados.',
        ],
        `kpi-evolution-${currentScore}-${baseline}`,
      ),
    },
    {
      id: 'action-velocity',
      question: 'Estamos executando?',
      title: 'Action Velocity',
      icon: 'bolt',
      score: velocity.score,
      label: velocityMeta.label,
      band: velocityMeta.band,
      trend: trendFromDelta(velocity.score - 50),
      trendValue: `${velocity.completed}/${velocity.total} ações`,
      meta: rotateDaily(
        [
          `${velocity.total} ações planejadas`,
          `${velocity.completed} concluídas`,
          'Ponderação por prazo',
          velocity.total === 0
            ? 'Sem ações registradas ainda'
            : `${Math.round((velocity.completed / Math.max(velocity.total, 1)) * 100)}% convertidas`,
        ],
        `kpi-velocity-meta-${velocity.score}`,
      ).slice(0, 3),
      detail: pickDaily(
        [
          velocity.total === 0
            ? 'Ainda não há ações no ciclo. Crie entregas no Action Canvas para medir velocidade real.'
            : `Hoje: ${velocity.completed} de ${velocity.total} ações avançaram. Priorize o que está perto do prazo.`,
          `Velocidade em ${velocity.score}/100 (${velocityMeta.label}). O peso por status e prazo define este número.`,
          velocity.score < 50
            ? 'Execução baixa hoje — desbloqueie uma entrega amarela ou vermelha antes de abrir novas.'
            : 'Ritmo de execução saudável. Documente o que manteve as ações no prazo.',
          'Velocidade de execução dos planos criados, com peso por status e prazo.',
        ],
        `kpi-velocity-${velocity.score}-${velocity.completed}`,
      ),
    },
    {
      id: 'momentum-score',
      question: 'Estamos ganhando força?',
      title: 'Momentum Score',
      icon: 'wave',
      score: Math.round(momentumScore),
      label: momentumMeta.label,
      band: momentumMeta.band,
      trend: trendFromDelta(momentumScore - 55),
      trendValue: '🌊'.repeat(momentumMeta.waves),
      meta: rotateDaily(
        [
          `Participação ${participation}%`,
          `Execução ${velocity.score}%`,
          `Consistência ${consistency}%`,
          `Status de hoje: ${momentumMeta.label}`,
        ],
        `kpi-momentum-meta-${Math.round(momentumScore)}`,
      ).slice(0, 3),
      detail: pickDaily(
        [
          `Momentum em ${Math.round(momentumScore)}/100. Participação ${participation}%, execução ${velocity.score}%, consistência ${consistency}%.`,
          `Leitura de hoje: "${momentumMeta.label}". Ajuste o fator mais fraco para recuperar força.`,
          participation < 40
            ? 'Participação baixa puxa o momentum. Ative donos e check-ins curtos esta semana.'
            : 'A equipe está presente. Use a consistência para sustentar o ritmo sem picos.',
          'Força da transformação em andamento: participação, evolução, execução e consistência.',
        ],
        `kpi-momentum-${Math.round(momentumScore)}-${participation}`,
      ),
    },
    {
      id: 'business-impact',
      question: 'Estamos gerando resultados?',
      title: 'Business Impact',
      icon: 'chart',
      score: business.score,
      label: businessMeta.label,
      band: businessMeta.band,
      trend: trendFromDelta(business.avgEvolution),
      trendValue: formatTrend(business.avgEvolution),
      meta: rotateDaily(
        [
          ...business.indicators.map((i) => `${i.label} ${i.evolution}`),
          `Impacto de hoje: ${businessMeta.label}`,
        ],
        `kpi-business-meta-${business.score}`,
      ).slice(0, 3),
      detail: pickDaily(
        [
          `Impacto em ${business.score}/100 com evolução média ${formatTrend(business.avgEvolution)}. Olhe execução, transferência e aprendizagem.`,
          `Hoje o negócio lê "${businessMeta.label}". Escolha um indicador fraco e avance evidência nele.`,
          business.score < 60
            ? 'Baixo impacto ainda. Conecte entregas a resultado de negócio visível nesta semana.'
            : 'Há sinal de impacto. Consolide a evidência para o próximo checkpoint.',
          'Média ponderada da evolução dos indicadores de negócio selecionados para o ciclo.',
        ],
        `kpi-business-${business.score}`,
      ),
    },
    sustainabilityKpi,
  ];
}
