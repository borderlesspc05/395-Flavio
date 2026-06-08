export type EmployeeDeliveryStatus = 'verde' | 'amarelo' | 'vermelho';

export interface EmployeeObjective {
  id: string;
  title: string;
  status: 'pendente' | 'em_andamento' | 'concluido';
  impact?: string;
}

export interface EmployeeDelivery {
  id: string;
  initiative: string;
  title: string;
  status: EmployeeDeliveryStatus;
  evidence?: string;
  dueDate?: string;
}

export interface EmployeeProfile {
  memberId: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  location?: string;
  hireDate?: string;
  status: 'active' | 'remote' | 'on-leave';
  skills: string[];
  performance: number;
  projectsCompleted: number;
  cycleLabel: string;
  leaderName: string;
  companyName: string;
  invitedAt: string;
  highlights: string[];
  improvements: string[];
  objectives: EmployeeObjective[];
  deliveries: EmployeeDelivery[];
  leaderMessage: string;
}
