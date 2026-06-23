/** Fluxo oficial do Miro - MM People Sprint 90+ / Magnus Waves */

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
    subtitle: 'Human-to-Business Canvas',
    miroRef: 'Canvas desenhado ao final das 5 etapas',
    route: '/dashboard/scans',
    steps: [
      { id: '1.1', label: 'Decoding', description: 'Decodificar contexto e valor' },
      { id: '1.2', label: 'Gap Scan', description: 'Onde está versus onde precisa chegar' },
      { id: '1.3', label: 'System Scan', description: 'Processos, dados, decisões e fricções' },
      { id: '1.4', label: 'Team Scan', description: 'Gaps humanos, gestão e colaboração' },
      { id: '1.5', label: 'Solution Pick', description: 'Escolha da solução certa' },
    ],
  },
  {
    id: 'design',
    number: 2,
    label: 'Design',
    subtitle: 'MM Blueprint',
    miroRef: 'Gate Zero -> Caminho A ou B -> final result -> Make the Move',
    route: '/dashboard/design',
    steps: [
      { id: '2.0', label: 'Planos de ação', description: 'Templates pré-preenchidos do Solution Pick' },
      { id: '2.1', label: 'Validação', description: 'Revise e valide cada plano' },
      { id: '2.2', label: 'Enriquecimento IA', description: 'Chat opcional para detalhar ações' },
      { id: '2.3', label: 'Concluir Design', description: 'Envia planos para a Difusão' },
    ],
  },
  {
    id: 'difusao',
    number: 3,
    label: 'Difusão',
    subtitle: 'Make the Move',
    miroRef: '4 WS -> Imprint -> Follow-up',
    route: '/dashboard/objetivos',
    steps: [
      { id: '3.0', label: 'Action Canvas', description: 'Iniciativa, execução, risco e sign-off' },
      { id: '3.1', label: '4 WS', description: 'Workshops e ritmo de execução' },
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
    stepId: '1.1',
    label: '1.1 Decoding (estágio)',
    hint: 'Estágio atual do negócio',
  },
  {
    field: 'desafioPrincipal',
    stepId: '1.1',
    label: '1.1 Need Statement',
    hint: 'Dor real que motivou a jornada',
  },
  {
    field: 'desiredStateFuncionamento',
    stepId: '1.2',
    label: '1.2 Gap Scan',
    hint: 'Estado desejado versus estado atual',
  },
  {
    field: 'processosCriticos',
    stepId: '1.3',
    label: '1.3 System Scan',
    hint: 'Processos e fricções sistêmicas',
  },
  {
    field: 'hipotesesTeamScan',
    stepId: '1.4',
    label: '1.4 Team Scan',
    hint: 'Causas humanas prováveis',
  },
  {
    field: 'solucaoSelecionadaDesign',
    stepId: '1.5',
    label: '1.5 Solution Pick',
    hint: 'Solução selecionada para o Design',
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
      return 'active';
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
