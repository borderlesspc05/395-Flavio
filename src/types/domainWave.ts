export type PlanExecutionStatus = 'concluido' | 'parcial' | 'nao_iniciado';
export type PlanDeadlineStatus = 'no_prazo' | 'atrasado' | 'na';

export type ImpactRating = 1 | 2 | 3 | 4 | 5;

export const IMPACT_RATING_OPTIONS: { value: ImpactRating; label: string }[] = [
  { value: 1, label: 'Muito abaixo do esperado' },
  { value: 2, label: 'Abaixo do esperado' },
  { value: 3, label: 'Conforme esperado' },
  { value: 4, label: 'Acima do esperado' },
  { value: 5, label: 'Muito acima do esperado' },
];

export const SUSTAINABILITY_QUESTIONS = [
  { id: 'routineIncorporated', label: 'A mudança foi incorporada na rotina?' },
  { id: 'clearOwner', label: 'Existe responsável claro?' },
  { id: 'indicatorsTracked', label: 'Existem indicadores acompanhando?' },
  { id: 'leadershipSupport', label: 'A liderança apoia a continuidade?' },
  { id: 'teamBelief', label: 'A equipe acredita na mudança?' },
] as const;

export type SustainabilityQuestionId = (typeof SUSTAINABILITY_QUESTIONS)[number]['id'];

export interface DomainPlanRow {
  id: string;
  name: string;
  status: PlanExecutionStatus;
  prazo: PlanDeadlineStatus;
  responsavel: string;
}

export interface DomainPlanMetrics {
  executionPercent: number;
  completedPercent: number;
  latePercent: number;
  actionVelocity: number;
  totalPlans: number;
}

export interface DomainPlanImpact {
  impactRating: ImpactRating | null;
  evidence: string;
}

export interface DomainLearningFields {
  workedWell: string;
  didNotWork: string;
  wouldDoDifferently: string;
  biggestSurprise: string;
  practiceToReplicate: string;
  aiTopLearnings: string[];
  aiGeneratedAt?: string;
}

export interface DomainSustainabilityRatings {
  routineIncorporated: number | null;
  clearOwner: number | null;
  indicatorsTracked: number | null;
  leadershipSupport: number | null;
  teamBelief: number | null;
}

export interface DomainSustainabilityScore {
  average: number;
  score: number;
  band: 'green' | 'yellow' | 'red';
  label: string;
}

export type CycleNextStep = 'new_cycle' | 'undecided' | 'paused';

export interface DomainCycleFeedback {
  /** Satisfação geral com o ciclo (1–5). */
  rating: number | null;
  /** Texto livre: o que a pessoa achou do ciclo. */
  comment: string;
  /** Intenção declarada quanto ao próximo movimento. */
  nextStep: CycleNextStep | null;
  submittedAt?: string;
}

export interface DomainWaveData {
  impactByPlanId: Record<string, DomainPlanImpact>;
  learning: DomainLearningFields;
  sustainability: DomainSustainabilityRatings;
  cycleFeedback?: DomainCycleFeedback;
  updatedAt?: string;
}

export function createEmptyDomainWaveData(): DomainWaveData {
  return {
    impactByPlanId: {},
    learning: {
      workedWell: '',
      didNotWork: '',
      wouldDoDifferently: '',
      biggestSurprise: '',
      practiceToReplicate: '',
      aiTopLearnings: [],
    },
    sustainability: {
      routineIncorporated: null,
      clearOwner: null,
      indicatorsTracked: null,
      leadershipSupport: null,
      teamBelief: null,
    },
  };
}
