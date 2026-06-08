import type { EmployeeProfile } from '../types/employeeProfile';

const MOCK_BY_ID: Record<string, EmployeeProfile> = {
  demo: {
    memberId: 'demo',
    name: 'Ana Costa',
    email: 'ana.costa@empresa.com',
    role: 'Analista de Difusão',
    department: 'People Sprint',
    location: 'São Paulo · Remoto',
    hireDate: '2024-03-12',
    status: 'remote',
    skills: ['Facilitação', 'OKRs', 'Comunicação', 'Action Canvas'],
    performance: 82,
    projectsCompleted: 14,
    cycleLabel: 'Ciclo 2 — Q2 2026',
    leaderName: 'Líder Magnus',
    companyName: 'Borderless',
    invitedAt: '2026-06-02T10:00:00.000Z',
    highlights: [
      'Objetivo concluído: Mapear jornada do colaborador na Difusão',
      'Entrega no ritmo: Workshop de alinhamento (Iniciativa People Sprint)',
      'Feedback positivo do sponsor no fechamento do sprint',
    ],
    improvements: [
      'Avançar objetivo: Publicar playbook de onboarding — impacto em retenção',
      'Atenção na entrega: Evidências do ritual semanal — reforçar prazo',
      'Desbloquear entrega: Sincronizar com sponsor o plano de mentoria',
    ],
    objectives: [
      {
        id: 'obj-1',
        title: 'Mapear jornada do colaborador na Difusão',
        status: 'concluido',
        impact: 'Base para rituais de desenvolvimento',
      },
      {
        id: 'obj-2',
        title: 'Publicar playbook de onboarding',
        status: 'em_andamento',
        impact: 'Reduzir tempo de ramp-up em 20%',
      },
      {
        id: 'obj-3',
        title: 'Estruturar ritual de feedback quinzenal',
        status: 'pendente',
        impact: 'Cultura de melhoria contínua',
      },
    ],
    deliveries: [
      {
        id: 'del-1',
        initiative: 'People Sprint',
        title: 'Workshop de alinhamento',
        status: 'verde',
        evidence: 'Ata + fotos do mural',
        dueDate: '15/05/2026',
      },
      {
        id: 'del-2',
        initiative: 'Difusão Magnus',
        title: 'Evidências do ritual semanal',
        status: 'amarelo',
        evidence: 'Pendente upload no canvas',
        dueDate: '28/05/2026',
      },
      {
        id: 'del-3',
        initiative: 'Mentoria interna',
        title: 'Plano de mentoria com sponsor',
        status: 'vermelho',
        dueDate: '05/06/2026',
      },
    ],
    leaderMessage:
      'Ana, obrigado por conduzir a Difusão com clareza neste ciclo. Seu perfil reúne o que evoluiu e o que pede atenção — use como guia na próxima semana e alinhe comigo o que precisar de desbloqueio.',
  },
};

function buildDefaultProfile(memberId: string): EmployeeProfile {
  const base = MOCK_BY_ID.demo;
  return {
    ...base,
    memberId,
    name: memberId === 'demo' ? base.name : `Colaborador · ${memberId.slice(0, 8)}`,
    email: 'colaborador@empresa.com',
  };
}

export function getMockEmployeeProfile(memberId?: string): EmployeeProfile {
  const id = memberId?.trim() || 'demo';
  return MOCK_BY_ID[id] ?? buildDefaultProfile(id);
}
