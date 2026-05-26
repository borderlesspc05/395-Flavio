/**
 * MM Blueprint — Onda 2 Design
 * Gate Zero, Caminho A (treinamento) e Caminho B (sistêmico)
 */

export type BlueprintPath = 'A' | 'B';

export type BlueprintStepId =
  | '2.0'
  | '2.1'
  | '2.2'
  | '2.3'
  | '2.1B'
  | '2.2B'
  | '2.3B'
  | 'final';

export interface BlueprintStep {
  id: BlueprintStepId;
  label: string;
  subtitle: string;
  path: BlueprintPath | 'both';
  order: number;
}

export const GATE_ZERO_RULE =
  'Treinamento nunca é ponto de partida. É consequência diagnóstica.';

export const PATH_A_SIGNALS = [
  'Gap de habilidade',
  'Gap de comportamento treinável',
  'Gap de liderança prática',
  'Gap de transferência para o trabalho',
  'Sistema minimamente funcional',
] as const;

export const PATH_B_SIGNALS = [
  'Gap estrutural',
  'Falha de processo',
  'Falta de clareza',
  'Decisão mal definida',
  'Excesso de fricção sistêmica',
  'Problema de contexto ou governança',
] as const;

export const BLUEPRINT_STEPS: BlueprintStep[] = [
  {
    id: '2.0',
    label: 'Gate Zero',
    subtitle: 'Decisão: Caminho A ou B',
    path: 'both',
    order: 0,
  },
  {
    id: '2.1',
    label: 'Outcome Forge',
    subtitle: 'Outcome Statement + Learning Objectives (ATD)',
    path: 'A',
    order: 1,
  },
  {
    id: '2.2',
    label: 'Build',
    subtitle: 'Desenho do programa de treinamento',
    path: 'A',
    order: 2,
  },
  {
    id: '2.3',
    label: 'Impact Evaluation',
    subtitle: '4 camadas de medição de impacto',
    path: 'A',
    order: 3,
  },
  {
    id: '2.1B',
    label: 'Outcome Forge (sistêmico)',
    subtitle: 'Resultado operacional / organizacional',
    path: 'B',
    order: 1,
  },
  {
    id: '2.2B',
    label: 'Build (sistêmico)',
    subtitle: 'Redesign estrutural, governança, processos',
    path: 'B',
    order: 2,
  },
  {
    id: '2.3B',
    label: 'Impact Evaluation (sistêmico)',
    subtitle: 'Evidência de estabilidade do sistema',
    path: 'B',
    order: 3,
  },
  {
    id: 'final',
    label: 'MM Blueprint — final result',
    subtitle: 'Pronto para Make the Move (Difusão)',
    path: 'both',
    order: 99,
  },
];

export function stepsForPath(path: BlueprintPath): BlueprintStep[] {
  return BLUEPRINT_STEPS.filter(
    (s) => s.path === 'both' || s.path === path,
  ).sort((a, b) => a.order - b.order);
}

/** Mapa Outcome Forge — Caminho A (ATD Module 3) */
export const OUTCOME_FORGE_CHAIN = [
  'INPUT_CLIENTE',
  'NECESSIDADE_ORGANIZACIONAL',
  'PERFORMANCE_SKILL_GAP',
  'OUTCOME_STATEMENT',
  'GATE_APRENDIZAGEM',
  'LEARNING_OBJECTIVES_BLOOM',
] as const;

export const OUTCOME_FORGE_RULES = [
  'Learning Objectives só após Outcome Statement validado',
  'Outcome: verbo + adjetivo + substantivo — resultado observável no trabalho',
  'Gap descreve capacidade ausente, nunca solução nem atitude abstrata',
  'Bloom: do nível mínimo necessário ao máximo relevante (sem inflacionar até Creating)',
  'Não misturar Outcome com Learning Objective',
] as const;

/** Seções do questionário Build — Caminho A */
export const BUILD_SECTIONS = [
  { id: 1, title: 'Identidade do programa' },
  { id: 2, title: 'Âncora no Outcome' },
  { id: 3, title: 'Learning Objectives (Bloom)' },
  { id: 4, title: 'Métodos instrucionais' },
  { id: 5, title: 'Mídia e formato' },
  { id: 6, title: 'Aplicação no trabalho' },
  { id: 7, title: 'Preview Impact Evaluation' },
] as const;

export const BUILD_CURATION_HINT =
  'Busque conteúdos em Universidades Corporativas, academias internas, trilhas existentes, ' +
  'materiais regulatórios, especialistas internos e recursos que a organização já confia. ' +
  'A IA desenha o programa; a curadoria é responsabilidade do cliente.';

/** 4 camadas — Impact Evaluation Caminho A */
export const IMPACT_LAYERS = [
  {
    id: 1,
    name: 'Percepção da experiência',
    timing: 'Final do programa',
    note: 'Alta satisfação não garante mudança de comportamento',
  },
  {
    id: 2,
    name: 'Percepção de aprendizagem',
    timing: 'Final do programa ou módulo',
    note: 'Mede consciência, não execução',
  },
  {
    id: 3,
    name: 'Aplicação no trabalho',
    timing: '30 a 90 dias após',
    note: 'Camada mais crítica para Magnus Waves',
  },
  {
    id: 4,
    name: 'Impacto organizacional',
    timing: 'Design agora; medição contínua',
    note: 'Perguntas de design, não apenas survey',
  },
] as const;

/** Tipos de solução — Caminho B Build */
export const SYSTEMIC_SOLUTION_TYPES = [
  'Redesign de processos',
  'Simplificação de fluxos',
  'Regras de decisão',
  'Clarificação de papéis e responsabilidades',
  'Ajuste de governança',
  'Redesign do trabalho',
  'Ferramentas / IA de suporte',
  'Playbooks operacionais',
  'Rotinas de gestão (rituais, cadência)',
] as const;

/** Prompt-base Gate Zero — IA recomenda, usuário confirma */
export const GATE_ZERO_AI_PROMPT = `Com base no Human-to-Business Canvas (etapas 1.1 a 1.5), analise se o problema predominante é:
- Caminho A (treinamento se aplica): gaps humanos treináveis com sistema minimamente funcional
- Caminho B (treinamento NÃO se aplica): gaps estruturais, processo, clareza, governança ou fricção sistêmica

Responda em JSON conceitual:
1) recommendedPath: "A" ou "B"
2) rationale: 3-5 frases citando campos do diagnóstico
3) pathASignals: lista de sinais encontrados
4) pathBSignals: lista de sinais encontrados
5) questionForUser: pergunta única para o usuário confirmar ou corrigir

Regra: ${GATE_ZERO_RULE}`;

/** Skill slugs sugeridos para BlueprintConfigPage */
export const BLUEPRINT_SKILL_SLUGS = {
  gateZero: 'blueprint-gate-zero',
  outcomeForgeA: 'outcome-forge',
  buildA: 'blueprint-build',
  impactA: 'impact-evaluation',
  outcomeForgeB: 'outcome-forge-systemic',
  buildB: 'blueprint-build-systemic',
  impactB: 'impact-evaluation-systemic',
} as const;

/** Contexto injetado no chat após confirmação do Gate Zero */
export function buildGateContextAppendix(
  path: BlueprintPath,
  meta?: { aiRecommendedPath?: BlueprintPath; rationale?: string }
): string {
  const label =
    path === 'A'
      ? 'A — Treinamento se aplica (Outcome Forge → Build → Impact Evaluation)'
      : 'B — Treinamento NÃO se aplica (Outcome / Build / Impact sistêmicos)';
  const lines = [
    '## Gate Zero confirmado (Onda 2 · MM Blueprint)',
    `Caminho selecionado: **${label}**`,
    GATE_ZERO_RULE,
  ];
  if (meta?.aiRecommendedPath) {
    lines.push(`Sugestão da IA nesta sessão: **${meta.aiRecommendedPath}**`);
  }
  if (meta?.rationale?.trim()) {
    lines.push(`Racional (referência): ${meta.rationale.trim()}`);
  }
  lines.push(
    'Conduza o MM Blueprint neste caminho até o resultado final, alinhado ao board Miro (2.1–2.3 ou 2.1B–2.3B).'
  );
  return lines.join('\n');
}
