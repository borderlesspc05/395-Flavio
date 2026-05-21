/** Fluxo oficial do Miro — MM People Sprint 90+ / Magnus Waves™ */

import type { InitialFormData } from '../types';

export type WaveId = 'diagnostico' | 'design' | 'difusao' | 'dominio';

export interface WaveStep {
  id: string;
  label: string;
  description?: string;
}

export interface MagnusWave {
  id: WaveId;
  number: number;
  label: string;
  subtitle: string;
  steps: WaveStep[];
  route: string;
  miroRef: string;
}

export const MAGNUS_WAVES: MagnusWave[] = [
  {
    id: 'diagnostico',
    number: 1,
    label: 'Diagnóstico',
    subtitle: 'Human-to-Business Canvas™',
    miroRef: 'Canvas desenhado ao final das 5 etapas',
    route: '/dashboard/initial-form',
    steps: [
      { id: '1.1', label: 'Decoding', description: 'Decodificar contexto e valor' },
      { id: '1.2', label: 'Gap Scan', description: 'Onde está vs. onde precisa chegar' },
      { id: '1.3', label: 'System Scan', description: 'Problemas de sistema' },
      { id: '1.4', label: 'Team Scan', description: 'Dinâmica e gaps humanos' },
      { id: '1.5', label: 'Solution Pick', description: 'Escolha da solução certa' },
    ],
  },
  {
    id: 'design',
    number: 2,
    label: 'Design',
    subtitle: 'MM Blueprint',
    miroRef: 'Caminho A: Outcome Forge → Build → Impact Evaluation',
    route: '/dashboard/consultoria-ia',
    steps: [
      { id: '2.0', label: 'MM Blueprint', description: 'Estruturar a solução na ordem certa' },
      { id: '2.1', label: 'Outcome Forge', description: 'Definir resultados esperados' },
      { id: '2.2', label: 'Build', description: 'Montar plano e prioridades' },
      { id: '2.3', label: 'Impact Evaluation', description: 'Avaliar impacto antes de mover' },
    ],
  },
  {
    id: 'difusao',
    number: 3,
    label: 'Difusão',
    subtitle: 'Make the Move',
    miroRef: '4 WS → Imprint → Follow-up',
    route: '/dashboard/objetivos',
    steps: [
      { id: '3.0', label: 'Make the Move', description: 'Tirar do papel e colocar em movimento' },
      { id: '3.1', label: '4 WS', description: 'Workshops / ritmo de execução' },
      { id: '3.2', label: 'Imprint', description: 'Imprimir comportamento na rotina' },
      { id: '3.3', label: 'Follow-up', description: 'Acompanhar com dono e prazo' },
    ],
  },
  {
    id: 'dominio',
    number: 4,
    label: 'Domínio',
    subtitle: 'Magnus Intelligence Dashboard (MID)',
    miroRef: 'Kirkpatrick 4 + loop contínuo',
    route: '/dashboard/relatorios',
    steps: [
      { id: '4.0', label: 'MID', description: 'Dashboard de inteligência' },
      { id: '4.1', label: 'Dashboard', description: 'Avaliação Kirkpatrick nível 4' },
      { id: '4.2', label: 'Continuous Loop', description: 'Não satisfeito? Retomar passo 1' },
    ],
  },
];

/** Campos do formulário → etapas do canvas (Miro) */
export const DIAGNOSTIC_FIELD_STEPS: {
  field: keyof InitialFormData;
  stepId: string;
  label: string;
  hint: string;
}[] = [
  {
    field: 'organizacao',
    stepId: '1.1',
    label: '1.1 Decoding',
    hint: 'Organização, mercado e posicionamento',
  },
  {
    field: 'produtoServico',
    stepId: '1.1',
    label: '1.1 Decoding (valor)',
    hint: 'Produto ou serviço que gera valor',
  },
  {
    field: 'estagioNegocio',
    stepId: '1.2',
    label: '1.2 Gap Scan',
    hint: 'Onde o negócio está hoje',
  },
  {
    field: 'fatoresExternos',
    stepId: '1.3',
    label: '1.3 System Scan',
    hint: 'Fatores externos e de sistema',
  },
  {
    field: 'mudancasRecentes',
    stepId: '1.4',
    label: '1.4 Team Scan → 1.5 Solution Pick',
    hint: 'Mudanças recentes e o que exige nova forma de operar',
  },
];

export interface SprintProgress {
  formComplete: boolean;
  objectivesTotal: number;
  reportsCount: number;
}

export type WaveStatus = 'locked' | 'active' | 'complete';

export function getWaveStatus(waveId: WaveId, progress: SprintProgress): WaveStatus {
  const { formComplete, objectivesTotal, reportsCount } = progress;

  switch (waveId) {
    case 'diagnostico':
      return formComplete ? 'complete' : 'active';
    case 'design':
      if (!formComplete) return 'locked';
      return objectivesTotal > 0 ? 'complete' : 'active';
    case 'difusao':
      if (!formComplete) return 'locked';
      return objectivesTotal > 0 ? 'active' : 'locked';
    case 'dominio':
      if (!formComplete) return 'locked';
      return reportsCount > 0 ? 'complete' : objectivesTotal > 0 ? 'active' : 'locked';
    default:
      return 'locked';
  }
}

export function getActiveWaveId(progress: SprintProgress): WaveId {
  if (!progress.formComplete) return 'diagnostico';
  if (progress.reportsCount > 0) return 'dominio';
  if (progress.objectivesTotal > 0) return 'difusao';
  return 'design';
}
