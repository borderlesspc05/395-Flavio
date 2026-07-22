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
  responsavel: string;
  prazo: string;
  status: DeliveryStatus;
  evidencia: string;
  checklist?: string[];
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

export interface ActionCanvas {
  id: string;
  userId: string;
  cycleId?: string;
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
  createdAt: string;
  updatedAt: string;
}

export type ObjectiveStatus = 'pendente' | 'em_andamento' | 'concluido' | 'cancelado';
export type ObjectiveOrigin = 'manual' | 'ia';

export interface Objective {
  id: string;
  userId: string;
  cycleId?: string;
  titulo: string;
  descricao: string;
  categoria: string;
  status: ObjectiveStatus;
  origem: ObjectiveOrigin;
  prioridade?: number;
  horizonte?: 'curto' | 'medio' | 'longo';
  prazo?: string;
  responsavel?: string;
  impacto?: string;
  insightOrigem?: string;
  createdAt: string;
  updatedAt: string;
}

export type TeamMemberStatus = 'active' | 'on-leave' | 'remote';
export type DevelopmentTrend = 'improved' | 'declined' | 'stable';

export interface TeamMember {
  id: string;
  userId: string;
  nome: string;
  cargo: string;
  email?: string;
  telefone?: string;
  departamento?: string;
  localizacao?: string;
  dataContratacao?: string;
  status?: TeamMemberStatus;
  skills?: string[];
  performance?: number;
  /** Token opaco para o portal do colaborador (só tarefas atribuídas). */
  portalToken?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMemberDevelopmentEntry {
  id: string;
  userId: string;
  memberId: string;
  score: number;
  notes?: string;
  trend: DevelopmentTrend;
  delta?: number;
  cycleId?: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  userId: string;
  tipo: string;
  descricao: string;
  entidade?: string;
  entidadeId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  model: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  id: string;
  userId: string;
  titulo: string;
  conteudo: string;
  resumo: string;
  stats: ReportStats;
  createdAt: string;
}

export interface ReportStats {
  totalObjectives: number;
  objectivesCompleted: number;
  objectivesInProgress: number;
  completionRate: number;
  teamSize: number;
  aiObjectives: number;
}

export interface ConsultantFramework {
  id: string;
  userId?: string;
  titulo: string;
  conteudo: string;
  tags?: string[];
  createdAt: string;
}

export interface AiModel {
  id: string;
  name: string;
}

export interface SuggestedObjective {
  titulo: string;
  descricao: string;
  categoria: string;
  prioridade?: number;
  horizonte?: 'curto' | 'medio' | 'longo';
  impacto?: string;
  responsavel?: string;
  insightOrigem?: string;
}

/**
 * Configurações persistidas do agente Magnus Mind para cada usuário.
 * Quando ativadas, sobrescrevem partes do SYSTEM_PROMPT base no chat.
 */
export interface AgentSettings {
  id: string;
  userId: string;
  enabled: boolean;
  personaOverride?: string;
  rules?: string;
  tone?: string;
  responseFormat?: string;
  forbidden?: string;
  preferredModel?: string;
  updatedAt: string;
}

/**
 * Skill = comando invocável via `/slug` na mensagem.
 * Quando o usuário menciona /slug, o conteúdo da skill é injetado
 * no contexto e o agente passa a se comportar conforme aquele preset.
 */
export interface AgentSkill {
  id: string;
  userId: string;
  slug: string;
  title: string;
  description?: string;
  content: string;
  tags?: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
