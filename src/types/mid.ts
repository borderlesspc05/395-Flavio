import type { WaveId } from '../constants/magnusWaves';

export type MidHealth = 'green' | 'yellow' | 'red';
export type MidSignal = MidHealth;

export type MidTrend = 'up' | 'down' | 'flat';

export type MidKpiBand = 'attention' | 'evolving' | 'mature' | 'low' | 'steady' | 'strong';

export interface MidExecutiveKpi {
  id: string;
  question: string;
  title: string;
  icon: 'rocket' | 'bolt' | 'wave' | 'chart' | 'shield';
  score: number;
  label: string;
  band: MidKpiBand;
  trend: MidTrend;
  trendValue: string;
  meta: string[];
  detail: string;
}

export interface MidOverview {
  projectName: string;
  owner: string;
  sponsor: string;
  statusLabel: string;
  currentWave: WaveId;
  currentWaveLabel: string;
  progressPercent: number;
  health: MidHealth;
  healthLabel: string;
  healthFactors: MidHealthFactor[];
}

export interface MidHealthFactor {
  id: string;
  label: string;
  score: number;
}

export interface MidBriefingSignal {
  id: string;
  tone: 'risk' | 'attention' | 'positive';
  text: string;
}

export interface MidBriefing {
  greeting: string;
  summaryLabel: string;
  signals: MidBriefingSignal[];
  recommendation: string;
  healthScore: number;
  healthLabel: string;
}

export interface MidNowAction {
  id: string;
  title: string;
  reason: string;
  route?: string;
}

export interface MidExecutionRow {
  id: string;
  delivery: string;
  owner: string;
  status: 'verde' | 'amarelo' | 'vermelho' | 'pendente';
  statusLabel: string;
  evidence: string;
  nextAction: string;
  source: string;
  deadline?: string;
  priority?: 'critica' | 'alta' | 'media' | 'baixa';
}

export interface MidTimelineEvent {
  id: string;
  isoDate: string;
  dateLabel: string;
  title: string;
  tone: 'neutral' | 'positive' | 'attention' | 'risk' | 'ai';
}

export interface MidDashboardData {
  overview: MidOverview;
  executiveKpis: MidExecutiveKpi[];
  execution: MidExecutionRow[];
  timeline: MidTimelineEvent[];
  briefing: MidBriefing;
  nowActions: MidNowAction[];
  hasData: boolean;
}
