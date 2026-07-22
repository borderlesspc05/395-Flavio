export type DiagnosticFieldValue = string | string[];

export interface InitialFormData {
  organizacao: string;
  produtoServico: string;
  estagioNegocio: string;
  fatoresExternos: string;
  mudancasRecentes: string;
  [key: string]: DiagnosticFieldValue;
}

export type BusinessStage = 'Crescimento' | 'Estabilização' | 'Transformação' | 'Crise' | 'Reinvenção';

export const STAGE_DESCRIPTIONS: Record<string, string> = {
  Crescimento: 'Seu negócio está em fase de expansão e desenvolvimento de mercado',
  Estabilização: 'Seu negócio está em fase de consolidação e otimização',
  Transformação: 'Seu negócio está em processo de mudança e adaptação',
  Crise: 'Seu negócio está enfrentando desafios que exigem atenção imediata',
  Reinvenção: 'Seu negócio está se reinventando para novos mercados ou modelos',
};

export const BUSINESS_STAGES: BusinessStage[] = [
  'Crescimento',
  'Estabilização',
  'Transformação',
  'Crise',
  'Reinvenção',
];

export type DeliveryStatus = 'verde' | 'amarelo' | 'vermelho';
export type ActionCanvasSignOff = 'pendente' | 'sim' | 'nao';

export type ChecklistProgress = 0 | 25 | 50 | 75 | 100;

export interface DeliveryChecklistItem {
  id: string;
  texto: string;
  done?: boolean;
  responsavel?: string;
  progresso?: ChecklistProgress;
  prazo?: string;
}

export interface ActionCanvasDelivery {
  id: string;
  entrega: string;
  /** Sponsor da execução (campo legado `responsavel`). */
  responsavel: string;
  prazo: string;
  status: DeliveryStatus;
  /** @deprecated Removido da UI de Execução; mantido por compatibilidade. */
  evidencia: string;
  /** @deprecated Preferir checklistItems */
  checklist?: string[];
  /** Check-list de ações estruturado (Execução) */
  checklistItems?: DeliveryChecklistItem[];
}

export type RiskImpact = 'alto' | 'medio' | 'baixo';
export type RiskProbability = 'alta' | 'media' | 'baixa';
export type RiskStatus = 'nao_iniciado' | 'em_andamento' | 'mitigado' | 'monitorando';

export interface ActionCanvasRisk {
  id: string;
  risco: string;
  /** Plano / ação a tomar */
  acaoTomar: string;
  impacto?: RiskImpact;
  probabilidade?: RiskProbability;
  responsavel?: string;
  status?: RiskStatus;
}

/** Rascunho sugerido pela IA antes de criar no backend */
export interface SuggestedActionCanvasDraft {
  nomeIniciativa: string;
  objetivoEspecifico: string;
  owner: string;
  sponsor: string;
  prazoFinal: string;
  /** Até 3 critérios de sucesso (“Como saberemos que deu certo?”) */
  successCriteria?: string[];
  inheritedFromCycle?: boolean;
  mobilizationNotes?: string;
  entregas: Array<{
    entrega: string;
    responsavel: string;
    prazo: string;
    status?: DeliveryStatus;
    evidencia?: string;
    checklist?: string[];
  }>;
  riscos: Array<{ risco: string; acaoTomar: string }>;
  insightOrigem?: string;
}

export interface ActionCanvas {
  id: string;
  nomeIniciativa: string;
  objetivoEspecifico: string;
  owner: string;
  sponsor: string;
  prazoFinal: string;
  successCriteria?: string[];
  inheritedFromCycle?: boolean;
  mobilizationNotes?: string;
  entregas: ActionCanvasDelivery[];
  riscos: ActionCanvasRisk[];
  signOff: ActionCanvasSignOff;
  fechado: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type ObjectiveStatus = 'nao_iniciado' | 'em_andamento' | 'concluido';
export type ObjectivePriority = 'alta' | 'media' | 'baixa';
export type ObjectiveHorizon = 'curto' | 'medio' | 'longo';

export interface Objective {
  id: string;
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade: ObjectivePriority;
  status: ObjectiveStatus;
  horizonte: ObjectiveHorizon;
  prazo?: string;
  responsavel?: string;
  impacto?: string;
  origem?: 'ia' | 'manual';
  insightOrigem?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role?: string;
  department?: string;
  phone?: string;
  location?: string;
  hireDate?: string;
  status: 'active' | 'on-leave' | 'remote';
  skills?: string[];
  performance?: number;
  projectsCompleted?: number;
  userId?: string;
}

export type DevelopmentTrend = 'improved' | 'declined' | 'stable';

export interface TeamMemberDevelopmentEntry {
  id: string;
  memberId: string;
  score: number;
  notes?: string;
  trend: DevelopmentTrend;
  delta?: number;
  cycleId?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  executedActions?: Array<{
    tool: string;
    ok: boolean;
    summary: string;
    entityId?: string;
    error?: string;
  }>;
}

export interface Conversation {
  id: string;
  title: string;
  preview?: string;
  messageCount?: number;
  currentModelId?: string;
  updatedAt?: string;
}

export interface Report {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  stats?: Record<string, unknown>;
  content?: Record<string, unknown>;
}

export interface Activity {
  id: string;
  type: string;
  title: string;
  description?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
  relatedId?: string;
}

export const PRIORITY_LABELS: Record<ObjectivePriority, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};
