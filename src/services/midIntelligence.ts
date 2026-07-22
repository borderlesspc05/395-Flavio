import type {
  ActionCanvas,
  Objective,
  TeamMember,
  TeamMemberDevelopmentEntry,
} from '../types';
import type {
  MidHealth,
  MidHealthFactor,
  MidBriefing,
  MidBriefingSignal,
  MidNowAction,
  MidTimelineEvent,
} from '../types/mid';
import { pickDaily, rotateDaily } from '../utils/dailyInsight';
import { deliveryProgressWeight } from '../utils/deliveryChecklist';

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const;
const CHECKIN_STALE_DAYS = 15;

export interface MemberCheckInSummary {
  memberId: string;
  memberName: string;
  lastAt: string | null;
  latestScore?: number;
  trend?: TeamMemberDevelopmentEntry['trend'];
}

export interface MidIntelligenceInput {
  projectName: string;
  userDisplayName?: string | null;
  cycleCreatedAt?: string | Date | null;
  formComplete: boolean;
  formCompletedAt?: string | Date | null;
  objectives: Objective[];
  canvases: ActionCanvas[];
  team: TeamMember[];
  memberCheckIns?: MemberCheckInSummary[];
  reportsCount: number;
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDayMonth(date: Date): string {
  return `${date.getDate()} ${MONTHS_PT[date.getMonth()]}`;
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

function daysSince(date: Date | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function greetingFor(name?: string | null): string {
  const hour = new Date().getHours();
  const part =
    hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${part}, ${first}` : part;
}

function healthBand(score: number): { health: MidHealth; label: string } {
  if (score >= 85) return { health: 'green', label: 'Excelente' };
  if (score >= 70) return { health: 'green', label: 'Saudável' };
  if (score >= 45) return { health: 'yellow', label: 'Evolução em curso' };
  return { health: 'red', label: 'Atenção necessária' };
}

/** Health Score multi-fator (prazo, evolução, velocidade, check-ins, bloqueios, participação). */
export function computeProjectHealthScore(input: MidIntelligenceInput): {
  score: number;
  health: MidHealth;
  label: string;
  factors: MidHealthFactor[];
} {
  const deliveries = input.canvases.flatMap((c) => c.entregas.filter((e) => e.entrega?.trim()));
  const progressWeights = deliveries.map((e) => deliveryProgressWeight(e));
  const yellow = progressWeights.filter((w) => w >= 40 && w < 80).length;
  const red = progressWeights.filter((w) => w < 40).length;
  const totalDel = deliveries.length;

  const objs = input.objectives;
  const done = objs.filter((o) => o.status === 'concluido').length;
  const inProgress = objs.filter((o) => o.status === 'em_andamento').length;

  const now = Date.now();
  const overdue =
    objs.filter((o) => {
      if (!o.prazo || o.status === 'concluido') return false;
      const d = new Date(o.prazo);
      return !Number.isNaN(d.getTime()) && d.getTime() < now;
    }).length +
    deliveries.filter((e) => {
      if (deliveryProgressWeight(e) >= 80) return false;
      if (!e.prazo) return false;
      const d = new Date(e.prazo);
      return !Number.isNaN(d.getTime()) && d.getTime() < now;
    }).length;

  const prazoScore =
    totalDel + objs.length === 0
      ? input.formComplete
        ? 70
        : 35
      : clampScore(100 - overdue * 18 - yellow * 6);

  const evolucaoScore = input.formComplete
    ? objs.length === 0
      ? 55
      : clampScore((done / Math.max(objs.length, 1)) * 100)
    : 25;

  const velocidadeScore =
    totalDel === 0
      ? input.formComplete
        ? 50
        : 30
      : clampScore(
          progressWeights.reduce((a, b) => a + b, 0) / Math.max(totalDel, 1)
        );

  const checkIns = input.memberCheckIns ?? [];
  let checkinScore = 50;
  if (input.team.length === 0) {
    checkinScore = 40;
  } else if (checkIns.length > 0) {
    const fresh = checkIns.filter((c) => {
      const days = daysSince(toDate(c.lastAt));
      return days != null && days <= CHECKIN_STALE_DAYS;
    }).length;
    checkinScore = clampScore((fresh / input.team.length) * 100);
  } else {
    checkinScore = 35;
  }

  const bloqueiosScore =
    totalDel === 0 ? (input.formComplete ? 65 : 40) : clampScore(100 - red * 22 - yellow * 8);

  const participating = input.team.filter((m) => (m.performance ?? 0) > 0 || (m as { lastCheckInAt?: string }).lastCheckInAt).length;
  const withRecentCheckin = checkIns.filter((c) => c.lastAt).length;
  const participacaoScore =
    input.team.length === 0
      ? 45
      : clampScore(
          ((Math.max(participating, withRecentCheckin) / input.team.length) * 70 +
            (inProgress + done > 0 ? 30 : 10))
        );

  const factors: MidHealthFactor[] = [
    { id: 'prazo', label: 'Prazo', score: prazoScore },
    { id: 'evolucao', label: 'Evolução', score: evolucaoScore },
    { id: 'velocidade', label: 'Velocidade', score: velocidadeScore },
    { id: 'checkins', label: 'Check-ins', score: checkinScore },
    { id: 'bloqueios', label: 'Bloqueios', score: bloqueiosScore },
    { id: 'participacao', label: 'Participação', score: participacaoScore },
  ];

  const score = clampScore(
    factors.reduce((sum, f) => sum + f.score, 0) / factors.length
  );
  const { health, label } = healthBand(score);
  return { score, health, label, factors };
}

export function buildBriefing(input: MidIntelligenceInput, healthScore: number, healthLabel: string): MidBriefing {
  const deliveries = input.canvases.flatMap((c) => c.entregas.filter((e) => e.entrega?.trim()));
  const atRisk = deliveries.filter((e) => e.status === 'vermelho').length;
  const yellow = deliveries.filter((e) => e.status === 'amarelo').length;
  const checkIns = input.memberCheckIns ?? [];
  const staleMembers = input.team.length
    ? checkIns.length
      ? checkIns.filter((c) => {
          const days = daysSince(toDate(c.lastAt));
          return days == null || days > CHECKIN_STALE_DAYS;
        }).length
      : input.team.length
    : 0;
  const accelerated = checkIns.filter((c) => c.trend === 'improved').length;
  const openObjectives = input.objectives.filter((o) => o.status !== 'concluido').length;
  const doneObjectives = input.objectives.filter((o) => o.status === 'concluido').length;

  const signalPool: MidBriefingSignal[] = [
    {
      id: 'risk',
      tone: atRisk > 0 ? 'risk' : 'positive',
      text:
        atRisk > 0
          ? `${atRisk} iniciativa${atRisk > 1 ? 's' : ''} em risco`
          : 'Nenhuma iniciativa em risco crítico',
    },
    {
      id: 'checkins',
      tone: staleMembers > 0 ? 'attention' : 'positive',
      text:
        staleMembers > 0
          ? `${staleMembers} pessoa${staleMembers > 1 ? 's' : ''} sem check-in há mais de ${CHECKIN_STALE_DAYS} dias`
          : input.team.length > 0
            ? 'Check-ins da equipe em dia'
            : 'Equipe ainda não cadastrada',
    },
  ];

  if (yellow > 0) {
    signalPool.push({
      id: 'yellow',
      tone: 'attention',
      text: `${yellow} entrega${yellow > 1 ? 's' : ''} em atenção no Action Canvas`,
    });
  }
  if (openObjectives > 0) {
    signalPool.push({
      id: 'objectives',
      tone: openObjectives > doneObjectives ? 'attention' : 'positive',
      text: `${openObjectives} objetivo${openObjectives > 1 ? 's' : ''} em aberto no ciclo`,
    });
  }
  if (accelerated > 0) {
    signalPool.push({
      id: 'growth',
      tone: 'positive',
      text: `${accelerated} pessoa${accelerated > 1 ? 's' : ''} com tendência de evolução`,
    });
  }

  signalPool.push({
    id: 'today',
    tone: atRisk > 0 || staleMembers > 0 ? 'attention' : accelerated > 0 ? 'positive' : 'attention',
    text: pickDaily(
      atRisk > 0 || staleMembers > 0
        ? [
            'Recomendações de hoje pedem atenção',
            'Hoje o ciclo pede prioridade clara',
            'Sinais de hoje pedem foco imediato',
          ]
        : accelerated > 0
          ? [
              'Recomendações de hoje sob controle',
              'Hoje o ritmo está favorável',
              'Sinais de hoje apontam evolução',
            ]
          : [
              'Recomendações de hoje para revisar',
              'Hoje vale revisar o próximo movimento',
              'Há espaço para avançar no ciclo hoje',
            ],
      `briefing-today-${input.projectName}`,
    ),
  });

  const signals = rotateDaily(signalPool, `briefing-signals-${input.projectName}`).slice(0, 3);

  const commercial = input.team.find((m) =>
    /comercial|vendas|sales/i.test(`${m.role ?? ''} ${m.department ?? ''} ${m.name ?? ''}`),
  );
  const weakest = [...(input.memberCheckIns ?? [])]
    .filter((c) => typeof c.latestScore === 'number')
    .sort((a, b) => (a.latestScore ?? 100) - (b.latestScore ?? 100))[0];

  const recommendations: string[] = [];

  if (atRisk > 0) {
    recommendations.push(
      `Priorize desbloquear ${atRisk} entrega${atRisk > 1 ? 's' : ''} em risco no Action Canvas.`,
      `Hoje: trate primeiro o que está em vermelho — ${atRisk} item${atRisk > 1 ? 's' : ''} pedem desbloqueio.`,
      `Chame o responsável das entregas críticas antes de avançar novas frentes.`,
    );
  }
  if (staleMembers > 0) {
    recommendations.push(
      `Agende check-ins com quem está há mais de ${CHECKIN_STALE_DAYS} dias sem registro.`,
      `Hoje: reative ${staleMembers} pessoa${staleMembers > 1 ? 's' : ''} sem check-in recente.`,
      `Um ritual curto de acompanhamento reduz o gap de participação da equipe.`,
    );
  }
  if (yellow > 0) {
    recommendations.push(
      `Reforce evidência e prazo nas ${yellow} entrega${yellow > 1 ? 's' : ''} em amarelo.`,
      `Hoje: converta atenção em progresso nas entregas amarelas do canvas.`,
    );
  }
  if (openObjectives > 0) {
    recommendations.push(
      `Avance pelo menos 1 dos ${openObjectives} objetivos ainda abertos.`,
      `Escolha um objetivo crítico e defina a próxima evidência até o fim do dia.`,
    );
  }
  if (commercial) {
    recommendations.push(`Priorize reunião com ${commercial.name || 'Equipe Comercial'}.`);
  }
  if (weakest) {
    recommendations.push(
      `Reforce acompanhamento com ${weakest.memberName}.`,
      `Hoje: um check-in rápido com ${weakest.memberName} pode destravar evolução.`,
    );
  }
  if (!input.formComplete) {
    recommendations.push('Conclua o diagnóstico para liberar o restante das ondas.');
  }
  if (healthScore < 50) {
    recommendations.push(
      `Health Score em ${healthScore}: foque no fator mais fraco antes de abrir novas iniciativas.`,
      `Hoje o projeto pede contenção — estabilize ritmo antes de acelerar.`,
    );
  } else if (healthScore >= 70) {
    recommendations.push(
      `Health Score ${healthScore}: consolide o que está funcionando e documente o padrão.`,
      `Bom momento para registrar aprendizados e replicar o que gerou tração.`,
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'Revise o Health Score e priorize o próximo movimento do ciclo.',
      'Escolha uma ação curta e visível para manter o ritmo do projeto hoje.',
      'Olhe o Execution Tracker e avance a entrega mais sensível do ciclo.',
    );
  }

  const recommendation = pickDaily(recommendations, `briefing-reco-${input.projectName}-${healthScore}`);

  return {
    greeting: greetingFor(input.userDisplayName),
    summaryLabel: 'Hoje encontramos',
    signals,
    recommendation,
    healthScore,
    healthLabel,
  };
}

export function buildNowActions(input: MidIntelligenceInput): MidNowAction[] {
  const actions: MidNowAction[] = [];
  const redOwner = input.canvases
    .flatMap((c) => c.entregas.filter((e) => e.status === 'vermelho' && e.responsavel?.trim()))
    .map((e) => e.responsavel!.trim())[0];

  if (redOwner) {
    actions.push({
      id: 'talk',
      title: `Converse com ${redOwner}`,
      reason: 'Há entregas em vermelho sob responsabilidade dela/dele.',
      route: '/dashboard/equipe',
    });
  } else if (input.team[0]?.name) {
    actions.push({
      id: 'talk',
      title: `Converse com ${input.team[0].name}`,
      reason: 'Um alinhamento rápido reduz atrito no início do ciclo.',
      route: '/dashboard/equipe',
    });
  }

  actions.push({
    id: 'comms',
    title: 'Reforce a comunicação',
    reason: 'Ritual curto de status evita surpresas no Health Score.',
    route: '/dashboard/equipe',
  });

  actions.push({
    id: 'checkpoint',
    title: 'Agende um checkpoint',
    reason: 'Checkpoint semanal sustentam ritmo e participação.',
    route: '/dashboard/objetivos',
  });

  const lateObj = input.objectives.find((o) => {
    if (!o.prazo || o.status === 'concluido') return false;
    const d = new Date(o.prazo);
    return !Number.isNaN(d.getTime()) && d.getTime() < Date.now();
  });
  if (lateObj) {
    actions.push({
      id: 'schedule',
      title: 'Revise o cronograma',
      reason: `"${lateObj.titulo}" passou do prazo.`,
      route: '/dashboard/objetivos',
    });
  } else {
    actions.push({
      id: 'schedule',
      title: 'Revise o cronograma',
      reason: 'Garanta dono e prazo em cada entrega crítica.',
      route: '/dashboard/objetivos',
    });
  }

  actions.push({
    id: 'priority',
    title: 'Priorize a etapa 3',
    reason: 'Difusão (Action Canvas) é onde a execução gira o jogo.',
    route: '/dashboard/objetivos',
  });

  return actions.slice(0, 5);
}

export function buildSprintTimeline(input: MidIntelligenceInput, health: MidHealth): MidTimelineEvent[] {
  const events: MidTimelineEvent[] = [];
  const created =
    toDate(input.cycleCreatedAt) ??
    toDate(input.formCompletedAt) ??
    toDate(input.canvases[0]?.createdAt) ??
    new Date();

  const push = (id: string, date: Date, title: string, tone: MidTimelineEvent['tone']) => {
    events.push({
      id,
      isoDate: date.toISOString().slice(0, 10),
      dateLabel: formatDayMonth(date),
      title,
      tone,
    });
  };

  push('created', created, 'Projeto criado', 'neutral');

  if (input.team.length > 0) {
    push('team', addDays(created, 1), 'Equipe adicionada', 'positive');
  }

  const firstCheckin = [...(input.memberCheckIns ?? [])]
    .map((c) => toDate(c.lastAt))
    .filter((d): d is Date => Boolean(d))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  if (firstCheckin) {
    push('checkin', firstCheckin, 'Primeiro check-in', 'positive');
  } else {
    push('checkin-pending', addDays(created, 3), 'Primeiro check-in ainda em aberto', 'attention');
  }

  if (health === 'yellow' || health === 'red') {
    push('momentum', addDays(created, 6), 'Momentum caiu', 'attention');
  }

  if (input.objectives.length > 0 || input.canvases.length > 0) {
    push('plan', addDays(created, 8), 'Plano revisado', 'neutral');
  }

  const red = input.canvases.flatMap((c) => c.entregas).some((e) => e.status === 'vermelho');
  if (red || health === 'red') {
    push('risk', addDays(created, 11), 'IA detectou risco', 'risk');
  }

  if (health === 'green') {
    push('recovered', addDays(created, 13), 'Projeto recuperado', 'positive');
  } else if (input.reportsCount > 0) {
    push('report', addDays(created, 12), 'Relatório de Domínio gerado', 'ai');
  } else {
    push('ai-watch', addDays(created, 10), 'IA monitorando sinais do ciclo', 'ai');
  }

  const seen = new Set<string>();
  return events
    .filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    })
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate))
    .slice(0, 8);
}
