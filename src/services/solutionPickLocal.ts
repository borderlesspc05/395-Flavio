import type { SuggestedSolutionAction } from '../types/solutionPick';
import { enrichObjetivoEspecifico } from '../utils/enrichObjetivoEspecifico';
import { buildSolutionActionDetalhes } from '../utils/solutionActionDetails';

function defaultPrazo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function desiredDeliveryCount(index: number): number {
  return (index % 3) + 1;
}

function buildVariableEntregas(titulo: string, index: number) {
  const templates = [
    {
      entrega: `Planejar escopo: ${titulo}`,
      responsavel: 'Owner',
      prazo: defaultPrazo(14),
      status: 'amarelo' as const,
      evidencia: 'Documento de alinhamento',
    },
    {
      entrega: 'Executar piloto e medir resultado',
      responsavel: 'Equipe núcleo',
      prazo: defaultPrazo(35),
      status: 'amarelo' as const,
    },
    {
      entrega: 'Consolidar aprendizados e padronizar rotina',
      responsavel: 'Sponsor executivo',
      prazo: defaultPrazo(55),
      status: 'amarelo' as const,
    },
  ];
  return templates.slice(0, desiredDeliveryCount(index));
}

const SAMPLES: Array<{
  titulo: string;
  descricao: string;
  score: number;
  categoria: SuggestedSolutionAction['categoria'];
  rationale: string;
}> = [
  {
    titulo: 'Treinar a equipe em resolução de problemas',
    descricao: 'Programa prático de problem solving alinhado aos gaps do Team Scan.',
    score: 88,
    categoria: 'pessoas',
    rationale: 'Alto impacto quando o gap humano envolve autonomia e método de decisão.',
  },
  {
    titulo: 'Redesenhar o ritual semanal de prioridades',
    descricao: 'Cadência fixa de decisão com sponsor e donos de entrega.',
    score: 81,
    categoria: 'processo',
    rationale: 'Estabiliza execução quando há dispersão entre áreas.',
  },
  {
    titulo: 'Plano de contingência para gargalo crítico',
    descricao: 'Ações de 14 dias para o processo que mais gera erro ou atraso.',
    score: 84,
    categoria: 'processo',
    rationale: 'Alto score quando há vermelho recorrente no System Scan.',
  },
  {
    titulo: 'Mentoria para gestores de primeira linha',
    descricao: 'Coaching em feedback, delegação e remoção de bloqueios.',
    score: 79,
    categoria: 'pessoas',
    rationale: 'Priorize quando Management Enablement Score estiver baixo.',
  },
  {
    titulo: 'Padronizar onboarding de novos talentos',
    descricao: 'Trilha de 30 dias com buddy, checklists e evidências.',
    score: 74,
    categoria: 'estrutura',
    rationale: 'Reduz tempo de ramp-up e erros recorrentes.',
  },
  {
    titulo: 'Revisar indicadores e metas do time',
    descricao: 'Reancorar métricas com o desired state do Gap Scan.',
    score: 76,
    categoria: 'processo',
    rationale: 'Conecta esforço diário ao resultado de negócio.',
  },
  {
    titulo: 'Automatizar relatório operacional diário',
    descricao: 'Dashboard simples alimentado pelas fontes já existentes.',
    score: 70,
    categoria: 'tecnologia',
    rationale: 'Diminui carga cognitiva e retrabalho manual.',
  },
  {
    titulo: 'Workshop de alinhamento cross-funcional',
    descricao: 'Sessão para destravar handoffs entre áreas críticas.',
    score: 67,
    categoria: 'comunicacao',
    rationale: 'Útil quando o gap está na colaboração entre silos.',
  },
  {
    titulo: 'Comprar equipamento crítico para atendimento',
    descricao: 'Substituir ferramenta que gera fila e retrabalho no front.',
    score: 62,
    categoria: 'tecnologia',
    rationale: 'Quick win operacional se o System Scan apontar fricção de ferramentas.',
  },
  {
    titulo: 'Fazer uma palestra motivacional',
    descricao: 'Sessão de engajamento para alinhar narrativa e energia da equipe.',
    score: 35,
    categoria: 'comunicacao',
    rationale: 'Baixa probabilidade de impacto sustentável isoladamente — use com cautela.',
  },
];

export function localSolutionPickFallback(): {
  suggestions: SuggestedSolutionAction[];
  companySummary: string;
  companySituation: string;
  demoMode: true;
  localFallback: true;
} {
  const suggestions: SuggestedSolutionAction[] = SAMPLES.map((s, i) => {
    const prazoFinal = defaultPrazo(60 + i * 7);
    const entregas = buildVariableEntregas(s.titulo, i);

    const riscos = [
      {
        risco: 'Baixa adesão das partes envolvidas',
        acaoTomar: 'Ritual semanal de decisão com sponsor',
      },
    ];
    const objetivoEspecifico = enrichObjetivoEspecifico(s.descricao, {
      titulo: s.titulo,
      descricao: s.descricao,
      rationale: s.rationale,
      categoria: s.categoria,
      prazoFinal,
      entregas,
    });

    const action: SuggestedSolutionAction = {
      id: `sol-local-${i + 1}`,
      titulo: s.titulo,
      descricao: s.descricao,
      score: s.score,
      categoria: s.categoria,
      rationale: s.rationale,
      detalhes: '',
      draft: {
        nomeIniciativa: s.titulo,
        objetivoEspecifico,
        owner: 'Líder da iniciativa',
        sponsor: 'Sponsor executivo',
        prazoFinal,
        entregas,
        riscos,
        insightOrigem: s.rationale,
      },
    };
    action.detalhes = buildSolutionActionDetalhes(action);
    return action;
  });

  return {
    suggestions,
    companySummary:
      'Resumo executivo indisponível offline. As sugestões abaixo são de demonstração até a API responder, mas o espaço já está preparado para uma síntese consultiva em dois parágrafos, conectando dores, prioridades e implicações para o negócio.\n\nQuando o backend voltar a responder, o Sprint vai substituir este fallback por uma análise baseada nas evidências do diagnóstico completo, incluindo Decoding, Gap Scan, System Scan, Team Scan e Solution Pick.',
    companySituation:
      'Servidor de IA indisponível ou sem conexão. Neste modo, não é possível consolidar automaticamente o que a empresa está vivendo, mas o bloco final será composto por dois parágrafos com sintomas, tensões e riscos organizacionais.\n\nVocê pode selecionar ações de exemplo para testar o fluxo ou tentar atualizar quando o backend estiver ativo. Assim que a API responder, esta leitura será refeita com base no contexto real da empresa.',
    demoMode: true,
    localFallback: true,
  };
}

export function isApiUnreachableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string; response?: { status?: number } };
  if (e.code === 'ECONNABORTED' || e.code === 'ERR_NETWORK') return true;
  if (e.message?.includes('Network Error')) return true;
  if (e.message?.includes('ECONNREFUSED')) return true;
  return false;
}
