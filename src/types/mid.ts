import type { WaveId } from '../constants/magnusWaves';

export type MidHealth = 'green' | 'yellow' | 'red';
export type MidSignal = MidHealth;

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
}

export interface MidMetricRow {
  id: string;
  label: string;
  before: string;
  current: string;
  variation: string;
  signal: MidSignal;
  isPrimary?: boolean;
}

export interface MidHumanRow {
  id: string;
  label: string;
  before: string;
  current: string;
  satisfaction: MidSignal;
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
}

export interface MidInsightBlock {
  question: string;
  answer: string;
}

export interface MidEvolutionItem {
  label: string;
  priority: 'alta' | 'media' | 'baixa';
  description: string;
  route?: string;
}

export interface MidDashboardData {
  overview: MidOverview;
  businessImpact: MidMetricRow[];
  humanImpact: MidHumanRow[];
  execution: MidExecutionRow[];
  insights: MidInsightBlock[];
  evolution: MidEvolutionItem[];
  hasData: boolean;
}
