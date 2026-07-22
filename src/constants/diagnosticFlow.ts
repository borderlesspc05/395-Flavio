import type { DiagnosticFieldValue, InitialFormData } from '../types';
import { ORGANIZATIONAL_SCANS } from './organizationalScans';
import { parseOrganizationalScanData } from '../services/organizationalScanStorage';
import { buildOrganizationalScanContext, getScanStatus } from '../utils/organizationalScans';

export type DiagnosticPhaseId = 'decoding' | 'gapScan' | 'systemScan' | 'teamScan' | 'solutionPick';
export type DiagnosticFieldType = 'textarea' | 'text' | 'single' | 'multi' | 'scale';
export type DiagnosticLens = 'performer' | 'manager';

export interface DiagnosticField {
  id: string;
  prompt: string;
  type?: DiagnosticFieldType;
  options?: string[];
  required?: boolean;
  placeholder?: string;
  minLabel?: string;
  maxLabel?: string;
  lenses?: DiagnosticLens[];
}

export interface DiagnosticBlock {
  id: string;
  title: string;
  source?: string;
  description?: string;
  outputForAI: string;
  fields: DiagnosticField[];
}

export interface DiagnosticPhase {
  id: DiagnosticPhaseId;
  step: string;
  shortTitle: string;
  title: string;
  subtitle: string;
  goal: string;
  principle?: string;
  blocks: DiagnosticBlock[];
  deliverables: string[];
}

export const DIAGNOSTIC_LENSES: { id: DiagnosticLens; label: string; hint: string }[] = [
  { id: 'performer', label: 'Performer', hint: 'Executores e Subject Matter Experts' },
  { id: 'manager', label: 'Manager', hint: 'Gestores, decisores e stakeholders' },
];

const businessImpactOptions = ['Receita', 'Eficiência', 'Qualidade', 'Experiência do cliente', 'Tempo', 'Custo'];
const problemTypeOptions = ['Estratégia', 'Pessoas / Cultura', 'Processos', 'Performance / Indicadores', 'Liderança', 'Tecnologia / IA'];
const resultLinkOptions = ['Crescimento', 'Eficiência', 'Experiência do cliente', 'Engajamento das equipes', 'Rentabilidade', 'Inovação'];
const stageOptions = ['Crescimento', 'Estabilização', 'Transformação', 'Crise', 'Reinvenção'];
const decisionStyleOptions = ['Intuitivas', 'Baseadas em dados', 'Reativas', 'Estratégicas'];
const yesPartialNoOptions = ['Sim', 'Parcialmente', 'Não'];
const ratingField = (id: string, prompt: string, required = false): DiagnosticField => ({
  id,
  prompt,
  type: 'scale',
  required,
  minLabel: '1',
  maxLabel: '5',
});

const withTeamLenses = (fields: DiagnosticField[]): DiagnosticField[] =>
  fields.map((field) => ({ ...field, lenses: ['performer', 'manager'] }));

export const DIAGNOSTIC_PHASES: DiagnosticPhase[] = [
  {
    id: 'decoding',
    step: '1.1',
    shortTitle: 'Decoding',
    title: 'Business Decoding',
    subtitle: 'Autoconsultoria guiada por IA',
    goal:
      'Criar clareza estratégica sobre o negócio, desafios reais, prioridades, valor esperado e contexto organizacional.',
    blocks: [
      {
        id: 'contexto-negocio',
        title: 'Bloco 1 - Contexto do Negócio',
        source: 'Background, Organizational Context, Business Need',
        outputForAI: 'Mapa completo do negócio, mercado, maturidade e mudanças recentes.',
        fields: [
          {
            id: 'organizacao',
            prompt: 'Como você descreveria sua organização hoje?',
            placeholder: 'Segmento, tamanho, mercado, maturidade, regiões atendidas...',
            required: true,
          },
          {
            id: 'produtoServico',
            prompt: 'Qual é o principal produto ou serviço que gera valor para o cliente?',
            required: true,
          },
          {
            id: 'estagioNegocio',
            prompt: 'Em qual estágio o negócio se encontra atualmente?',
            type: 'single',
            options: stageOptions,
            required: true,
          },
          {
            id: 'fatoresExternos',
            prompt: 'Quais fatores externos mais impactam o negócio hoje?',
            placeholder: 'Mercado, concorrência, tecnologia, pessoas, regulação...',
            required: true,
          },
          {
            id: 'mudancasRecentes',
            prompt: 'O que mudou recentemente que exige repensar a forma de operar ou liderar?',
            required: true,
          },
        ],
      },
      {
        id: 'desafio-central',
        title: 'Bloco 2 - Desafio Central / Need Statement',
        source: 'Clarify Business Need',
        outputForAI: 'Dor real versus dor percebida e impacto caso nada mude.',
        fields: [
          {
            id: 'desafioPrincipal',
            prompt: 'Qual é o principal problema ou desafio que motivou você a buscar a Sprint?',
            required: true,
          },
          {
            id: 'desafioRelacionadoA',
            prompt: 'Esse desafio é mais relacionado a quê?',
            type: 'multi',
            options: problemTypeOptions,
            required: true,
          },
          {
            id: 'riscoNaoResolver12m',
            prompt: 'O que acontece se esse problema não for resolvido nos próximos 12 meses?',
            required: true,
          },
          {
            id: 'impactadosDesafio',
            prompt: 'Quem são os mais impactados por esse desafio hoje?',
            required: true,
          },
          {
            id: 'manifestacaoDiaADia',
            prompt: 'Como você percebe que esse problema se manifesta no dia a dia?',
            required: true,
          },
        ],
      },
      {
        id: 'objetivos-resultados',
        title: 'Bloco 3 - Objetivos e Resultados Esperados',
        source: 'Business Goals, Outcomes, SMART Goals',
        outputForAI: 'Ambições, indicadores, critérios de sucesso e clareza do caminho.',
        fields: [
          {
            id: 'resultadosEsperados',
            prompt: 'Quais são os 3 principais resultados que você espera alcançar com esta jornada?',
            required: true,
          },
          {
            id: 'resultadosLigadosA',
            prompt: 'Esses resultados estão mais ligados a quê?',
            type: 'multi',
            options: resultLinkOptions,
            required: true,
          },
          {
            id: 'comoSaberSucesso',
            prompt: 'Como você saberá que teve sucesso ao final do processo?',
            required: true,
          },
          {
            id: 'kpiPreocupante',
            prompt: 'Existe algum indicador (KPI) que hoje mais te preocupa?',
          },
          {
            id: 'clarezaCaminho',
            prompt: 'Em uma escala de 1 a 10, quão claro está o caminho para atingir esses resultados?',
            type: 'scale',
            minLabel: '1',
            maxLabel: '10',
            required: true,
          },
        ],
      },
      {
        id: 'performance-atual',
        title: 'Bloco 4 - Performance Atual',
        source: 'Current Performance, Performance Gap',
        outputForAI: 'Leitura inicial de performance, gaps, causa provável e histórico de tentativas.',
        fields: [
          {
            id: 'performanceAtual',
            prompt: 'Como você avalia a performance atual do negócio?',
            type: 'single',
            options: ['Abaixo do esperado', 'Estável', 'Boa, mas inconsistente', 'Alta e sustentável'],
            required: true,
          },
          {
            id: 'maioresGapsPerformance',
            prompt: 'Onde você percebe os maiores gaps de performance hoje?',
            required: true,
          },
          {
            id: 'areasGapsVisiveis',
            prompt: 'Esses gaps são mais visíveis em quais áreas?',
          },
          {
            id: 'naturezaProblemaPerformance',
            prompt: 'O problema é mais de execução, alinhamento ou capacidade?',
            type: 'single',
            options: ['Execução', 'Alinhamento', 'Capacidade', 'Híbrido / ainda incerto'],
          },
          {
            id: 'tentativasAnteriores',
            prompt: 'Você já tentou resolver isso antes? O que funcionou e o que não funcionou?',
          },
        ],
      },
      {
        id: 'valor-prioridade',
        title: 'Bloco 5 - Valor e Prioridade',
        source: 'Assess Project Value',
        outputForAI: 'Valor esperado, custo real/invisível e prioridade executiva.',
        fields: [
          {
            id: 'impactoResolucao',
            prompt: 'Se esse desafio fosse resolvido, qual seria o impacto mais relevante?',
            type: 'single',
            options: ['Financeiro', 'Cultural', 'Operacional', 'Reputacional', 'Experiência do cliente'],
            required: true,
          },
          {
            id: 'temaEstrategicoFuturo',
            prompt: 'Quão estratégico esse tema é para o futuro da organização?',
            type: 'scale',
            minLabel: 'Baixo',
            maxLabel: 'Alto',
            required: true,
          },
          {
            id: 'custoManterComoEsta',
            prompt: 'Qual o custo real ou invisível de manter tudo como está?',
            required: true,
          },
          {
            id: 'apoioLideranca',
            prompt: 'Esse tema tem apoio da liderança?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'competicaoPrioridades',
            prompt: 'Esse desafio compete com outras prioridades hoje?',
          },
        ],
      },
      {
        id: 'stakeholders-governanca',
        title: 'Bloco 6 - Stakeholders e Governança',
        source: 'Roles & Responsibilities',
        outputForAI: 'Decisores, influenciadores, resistências e donos da mudança.',
        fields: [
          { id: 'decisoresTema', prompt: 'Quem são os principais decisores nesse tema?', required: true },
          { id: 'influenciadoresPositivos', prompt: 'Quem influencia positivamente essa mudança?' },
          { id: 'possiveisResistencias', prompt: 'Quem pode resistir?' },
          {
            id: 'clarezaPapeisResponsabilidades',
            prompt: 'Existe clareza de papéis e responsabilidades?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'responsavelSustentarMudancas',
            prompt: 'Quem será responsável por sustentar as mudanças no dia a dia?',
            required: true,
          },
        ],
      },
      {
        id: 'cultura-lideranca-pessoas',
        title: 'Bloco 7 - Cultura, Liderança e Pessoas',
        source: 'Organizational Performance Strategy',
        outputForAI: 'Contexto cultural, liderança, engajamento e alinhamento estratégico.',
        fields: [
          {
            id: 'culturaAtualFrase',
            prompt: 'Como você descreveria a cultura atual em uma frase?',
            required: true,
          },
          {
            id: 'estiloLideranca',
            prompt: 'A liderança atua mais como:',
            type: 'single',
            options: ['Diretiva', 'Inspiradora', 'Técnica', 'Operacional', 'Estratégica'],
            required: true,
          },
          {
            id: 'nivelEngajamentoEquipes',
            prompt: 'O nível de engajamento das equipes hoje é:',
            type: 'single',
            options: ['Baixo', 'Mediano', 'Alto'],
            required: true,
          },
          {
            id: 'pessoasEntendemPrioridades',
            prompt: 'As pessoas entendem claramente as prioridades do negócio?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'comportamentoLiderancaEstrategia',
            prompt: 'O comportamento da liderança reforça ou enfraquece a estratégia?',
          },
        ],
      },
      {
        id: 'sistemas-dados',
        title: 'Bloco 8 - Maturidade de Sistemas e Dados',
        outputForAI: 'Base para System Scan: dados, confiabilidade, tecnologia e uso de IA.',
        fields: [
          { id: 'dadosDecisaoHoje', prompt: 'Quais dados você usa hoje para tomar decisões?', required: true },
          {
            id: 'dadosConfiaveisAcessiveis',
            prompt: 'Eles são confiáveis e acessíveis?',
            type: 'single',
            options: yesPartialNoOptions,
            required: true,
          },
          {
            id: 'decisoesMais',
            prompt: 'As decisões são mais:',
            type: 'multi',
            options: decisionStyleOptions,
          },
          {
            id: 'tecnologiaPerformance',
            prompt: 'A tecnologia hoje acelera ou atrapalha a performance?',
            type: 'single',
            options: ['Acelera', 'Atrapalha', 'Depende da área', 'Não está claro'],
          },
          {
            id: 'iaUtilizadaHoje',
            prompt: 'IA já é utilizada de alguma forma no negócio?',
          },
        ],
      },
      {
        id: 'expectativa-ia',
        title: 'Bloco 9 - Expectativa sobre a IA',
        outputForAI: 'Limites, profundidade, estilo de recomendação e inegociáveis.',
        fields: [
          {
            id: 'expectativaIAJornada',
            prompt: 'O que você espera que a IA faça por você nesta jornada?',
            required: true,
          },
          {
            id: 'nivelProfundidadeIA',
            prompt: 'Qual nível de profundidade você deseja?',
            type: 'multi',
            options: ['Direcionamento estratégico', 'Diagnóstico detalhado', 'Sugestões práticas', 'Plano de ação'],
            required: true,
          },
          {
            id: 'preferenciaRecomendacoes',
            prompt: 'Você prefere recomendações mais:',
            type: 'multi',
            options: ['Ousadas', 'Conservadoras', 'Baseadas em benchmarks', 'Personalizadas ao contexto'],
          },
          {
            id: 'recomendacaoInaceitavel',
            prompt: 'Qual seria uma recomendação inaceitável para você?',
            required: true,
          },
          {
            id: 'iaNaoPodeIgnorar',
            prompt: 'O que a IA não pode ignorar sobre seu negócio?',
            required: true,
          },
        ],
      },
    ],
    deliverables: [
      'Mapa completo do negócio',
      'Clareza de dor real versus dor percebida',
      'Prioridades estratégicas',
      'Contexto cultural e humano',
      'Limites, expectativas e ambições do cliente',
    ],
  },
  {
    id: 'gapScan',
    step: '1.2',
    shortTitle: 'Gap Scan',
    title: 'Gap Scan',
    subtitle: 'Performance Gap Intelligence',
    goal:
      'Identificar, medir e qualificar o gap real de performance antes de sugerir qualquer solução.',
    blocks: [
      {
        id: 'resultado-desejado',
        title: 'Bloco 1 - Definição do Resultado Desejado',
        outputForAI: 'Desired State e métricas esperadas.',
        fields: [
          {
            id: 'desiredStateFuncionamento',
            prompt: 'Se este desafio fosse totalmente resolvido, como o negócio deveria funcionar?',
            required: true,
          },
          {
            id: 'desiredStateResultadosVisiveis',
            prompt: 'Quais resultados concretos deveriam ser visíveis?',
            required: true,
          },
          {
            id: 'desiredStateLigadoA',
            prompt: 'Esses resultados estão mais ligados a:',
            type: 'multi',
            options: ['Receita', 'Eficiência', 'Qualidade', 'Experiência do cliente', 'Engajamento', 'Escala'],
            required: true,
          },
          {
            id: 'desiredStateIndicadores',
            prompt: 'Quais indicadores provariam que esse estado desejado foi alcançado?',
            required: true,
          },
          {
            id: 'desiredStateRealista',
            prompt: 'Esse estado desejado é realista no horizonte de 6 a 12 meses?',
            type: 'single',
            options: yesPartialNoOptions,
          },
        ],
      },
      {
        id: 'estado-atual',
        title: 'Bloco 2 - Estado Atual',
        outputForAI: 'Current State sem romantização.',
        fields: [
          {
            id: 'currentStateFuncionamento',
            prompt: 'Como esse processo, área ou resultado funciona hoje, na prática?',
            required: true,
          },
          {
            id: 'currentStateAconteceNaoDeveria',
            prompt: 'O que acontece com frequência que não deveria acontecer?',
            required: true,
          },
          {
            id: 'currentStateNaoAconteceDeveria',
            prompt: 'O que não acontece, mas deveria acontecer?',
          },
          {
            id: 'currentStateIndicadoresAbaixo',
            prompt: 'Quais indicadores hoje demonstram que o resultado está abaixo do esperado?',
            required: true,
          },
          {
            id: 'currentStateDados',
            prompt: 'Esses dados são:',
            type: 'single',
            options: ['Confiáveis', 'Parciais', 'Inexistentes', 'Baseados em percepção'],
            required: true,
          },
        ],
      },
      {
        id: 'quantificacao-gap',
        title: 'Bloco 3 - Quantificação do Gap',
        outputForAI: 'Severidade, tendência e áreas afetadas.',
        fields: [
          {
            id: 'distanciaAtualDesejado',
            prompt: 'Em termos práticos, qual é a distância entre o estado atual e o desejado?',
            required: true,
          },
          {
            id: 'criticidadeGap',
            prompt: 'Esse gap é:',
            type: 'single',
            options: ['Pequeno', 'Moderado', 'Crítico'],
            required: true,
          },
          {
            id: 'impactoGapVisivelOnde',
            prompt: 'O impacto do gap é mais visível onde?',
          },
          {
            id: 'areasAfetadasGap',
            prompt: 'Esse gap afeta diretamente quais áreas do negócio?',
          },
          {
            id: 'tendenciaGap',
            prompt: 'Se nada for feito, esse gap tende a:',
            type: 'single',
            options: ['Aumentar', 'Permanecer estável', 'Diminuir naturalmente'],
            required: true,
          },
        ],
      },
      {
        id: 'consequencias-gap',
        title: 'Bloco 4 - Consequências do Gap',
        source: 'Consequences of Underperformance',
        outputForAI: 'Custo invisível e custo real do gap.',
        fields: [
          { id: 'consequenciasGapHoje', prompt: 'Quais são as principais consequências desse gap hoje?', required: true },
          {
            id: 'impactoGapMaisForte',
            prompt: 'O impacto é mais forte em:',
            type: 'multi',
            options: ['Resultados financeiros', 'Pessoas', 'Clientes', 'Reputação', 'Sustentabilidade do negócio'],
            required: true,
          },
          {
            id: 'retrabalhoDesgasteOportunidades',
            prompt: 'Esse gap gera retrabalho, desgaste emocional ou perda de oportunidades?',
          },
          { id: 'quemSofreGap', prompt: 'Quem mais sofre com esse gap no dia a dia?' },
          { id: 'gapAfetouDecisoes', prompt: 'Esse problema já afetou decisões estratégicas?' },
        ],
      },
      {
        id: 'barreiras-facilitadores',
        title: 'Bloco 5 - Barreiras e Facilitadores',
        outputForAI: 'Barreiras estruturais versus humanas.',
        fields: [
          {
            id: 'fatoresDificultamPerformance',
            prompt: 'Quais fatores hoje dificultam a alta performance?',
            type: 'multi',
            options: [
              'Falta de clareza',
              'Falta de competência',
              'Falta de processo',
              'Falta de tecnologia',
              'Falta de liderança',
              'Cultura desalinhada',
            ],
            required: true,
          },
          { id: 'maisAtrapalhaDesempenho', prompt: 'O que hoje mais atrapalha o desempenho?', required: true },
          { id: 'quandoFuncionaMelhora', prompt: 'O que, quando funciona bem, melhora significativamente os resultados?' },
          { id: 'ilhasExcelencia', prompt: 'Existem ilhas de excelência no negócio? Onde?' },
          {
            id: 'sucessoDependeMais',
            prompt: 'O sucesso hoje depende mais de esforço individual ou de sistema?',
            type: 'single',
            options: ['Esforço individual', 'Sistema', 'Ambos', 'Não está claro'],
            required: true,
          },
        ],
      },
      {
        id: 'responsabilidade-governanca-gap',
        title: 'Bloco 6 - Responsabilidade e Governança',
        outputForAI: 'Maturidade de governança do resultado.',
        fields: [
          { id: 'responsavelDiretoResultado', prompt: 'Quem é responsável direto por esse resultado?', required: true },
          {
            id: 'autonomiaMudarCenario',
            prompt: 'Essa pessoa tem autonomia real para mudar o cenário?',
            type: 'single',
            options: yesPartialNoOptions,
            required: true,
          },
          {
            id: 'expectativasPerformanceClaras',
            prompt: 'As expectativas de performance estão claras?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'criteriosSucessoCompartilhados',
            prompt: 'Os critérios de sucesso são compartilhados ou implícitos?',
            type: 'single',
            options: ['Compartilhados', 'Implícitos', 'Diferentes por área', 'Inexistentes'],
          },
          {
            id: 'alinhamentoBoaPerformance',
            prompt: 'Existe alinhamento entre liderança e operação sobre o que é boa performance?',
            type: 'single',
            options: yesPartialNoOptions,
          },
        ],
      },
      {
        id: 'calibracao-gap',
        title: 'Bloco 7 - Calibração do Gap',
        outputForAI: 'Decisão se o problema é treinável, redesenhável ou sistêmico.',
        fields: [
          {
            id: 'gapJustificaIntervencao',
            prompt: 'Esse gap justifica uma intervenção estruturada?',
            type: 'single',
            options: yesPartialNoOptions,
            required: true,
          },
          {
            id: 'problemaPareceMaisDe',
            prompt: 'O problema parece ser mais de:',
            type: 'multi',
            options: ['Estratégia', 'Sistema', 'Pessoas', 'Execução', 'Liderança'],
            required: true,
          },
          {
            id: 'exigeMudancaComportamento',
            prompt: 'Resolver esse gap exige mudança de comportamento?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'exigeMudancaProcesso',
            prompt: 'Exige mudança de processo?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'exigeMudancaTecnologia',
            prompt: 'Exige mudança de tecnologia?',
            type: 'single',
            options: yesPartialNoOptions,
          },
        ],
      },
    ],
    deliverables: [
      'Gap de performance claramente definido',
      'Estado atual versus estado desejado mensurado',
      'Consequências mapeadas',
      'Barreiras e facilitadores identificados',
      'Direcionamento para System Scan, Team Scan ou ambos',
    ],
  },
  {
    id: 'systemScan',
    step: '1.3',
    shortTitle: 'System Scan',
    title: 'System Scan',
    subtitle: 'Performance Architecture Intelligence',
    goal:
      'Analisar processos, decisões, informações, ferramentas e ambiente para identificar onde o sistema ajuda ou sabota a performance.',
    principle: 'Se pessoas boas não performam, o problema raramente é só gente: é sistema.',
    blocks: [
      {
        id: 'processos-chave',
        title: 'Bloco 1 - Processos-chave',
        outputForAI: 'Mapa dos processos que realmente importam.',
        fields: [
          { id: 'processosCriticos', prompt: 'Quais são os processos mais críticos para gerar os resultados esperados?', required: true },
          {
            id: 'processosClarosTodos',
            prompt: 'Esses processos são claros para todos que executam?',
            type: 'single',
            options: yesPartialNoOptions,
            required: true,
          },
          {
            id: 'processosImpactam',
            prompt: 'Esses processos impactam diretamente:',
            type: 'multi',
            options: businessImpactOptions,
          },
          { id: 'percentualTrabalhoProcessos', prompt: 'Qual percentual do trabalho diário depende desses processos?' },
          { id: 'processosGeramRetrabalhoErro', prompt: 'Quais processos hoje mais geram retrabalho ou erro?', required: true },
        ],
      },
      {
        id: 'tasks-outputs-execucao',
        title: 'Bloco 2 - Tasks, Outputs e Execução Real',
        outputForAI: 'Clareza ou ausência de execução operacional.',
        fields: [
          { id: 'tarefasProcessos', prompt: 'Quais tarefas compõem esses processos?', required: true },
          {
            id: 'outputsDefinidos',
            prompt: 'Os outputs esperados dessas tarefas estão claramente definidos?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'pessoasSabemExecucao',
            prompt: 'As pessoas sabem exatamente o que, quando, como e com qual padrão fazer?',
            type: 'single',
            options: yesPartialNoOptions,
            required: true,
          },
          {
            id: 'sucessoTarefaDepende',
            prompt: 'O sucesso da tarefa depende mais de:',
            type: 'single',
            options: ['Experiência individual', 'Regras claras', 'Sistemas confiáveis', 'Combinação dos três'],
            required: true,
          },
          { id: 'execucaoMaisFalha', prompt: 'Onde a execução mais falha?', required: true },
        ],
      },
      {
        id: 'erros-complexidade',
        title: 'Bloco 3 - Erros, Complexidade e Variabilidade',
        outputForAI: 'Risco sistêmico e dependência de talento individual.',
        fields: [
          { id: 'tiposErroFrequentes', prompt: 'Quais tipos de erro são mais frequentes?', required: true },
          {
            id: 'errosAcontecemPor',
            prompt: 'Esses erros acontecem por:',
            type: 'multi',
            options: ['Falta de informação', 'Processo confuso', 'Decisão ambígua', 'Ferramenta inadequada'],
            required: true,
          },
          {
            id: 'complexidadeProcesso',
            prompt: 'O processo é:',
            type: 'single',
            options: ['Simples', 'Moderado', 'Complexo'],
          },
          { id: 'variacaoPerformancePessoas', prompt: 'Quanto a performance varia entre pessoas?' },
          {
            id: 'excelenciaDependeHerois',
            prompt: 'A excelência depende de heróis?',
            type: 'single',
            options: yesPartialNoOptions,
          },
        ],
      },
      {
        id: 'ferramentas-dados-info',
        title: 'Bloco 4 - Ferramentas, Dados e Informação',
        outputForAI: 'Fricção digital e informacional.',
        fields: [
          {
            id: 'ferramentasAjudamAtrapalham',
            prompt: 'As ferramentas atuais ajudam ou atrapalham?',
            type: 'single',
            options: ['Ajudam', 'Atrapalham', 'Ajudam em parte', 'Não está claro'],
            required: true,
          },
          {
            id: 'informacoesMomentoCerto',
            prompt: 'As informações necessárias estão disponíveis no momento certo?',
            type: 'single',
            options: yesPartialNoOptions,
            required: true,
          },
          {
            id: 'qualidadeDadosSistema',
            prompt: 'Os dados são:',
            type: 'multi',
            options: ['Atualizados', 'Confiáveis', 'Fáceis de acessar'],
          },
          {
            id: 'duplicidadeSistemas',
            prompt: 'Existe duplicidade de sistemas?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          { id: 'tempoProcurandoInformacao', prompt: 'Quanto tempo se perde procurando informação?' },
        ],
      },
      {
        id: 'decisoes-regras',
        title: 'Bloco 5 - Decisões e Regras de Decisão',
        outputForAI: 'Qualidade decisória do sistema.',
        fields: [
          {
            id: 'decisoesCriticasClaras',
            prompt: 'As decisões críticas do processo são claras?',
            type: 'single',
            options: yesPartialNoOptions,
            required: true,
          },
          {
            id: 'criteriosObjetivosDecidir',
            prompt: 'Existem critérios objetivos para decidir?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'regrasDecisao',
            prompt: 'As regras de decisão são:',
            type: 'single',
            options: ['Documentadas', 'Implícitas', 'Inexistentes'],
            required: true,
          },
          {
            id: 'decisoesNivelCerto',
            prompt: 'Decisões são tomadas no nível certo da organização?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'confiancaDecisoes',
            prompt: 'As pessoas confiam nas decisões ou as contornam?',
            type: 'single',
            options: ['Confiam', 'Contornam', 'Depende da decisão', 'Não há padrão'],
          },
        ],
      },
      {
        id: 'ambiente-friccao',
        title: 'Bloco 6 - Ambiente, Contexto e Fricção Sistêmica',
        outputForAI: 'Leitura cultural-operacional do sistema.',
        fields: [
          {
            id: 'ambienteFavoreceFoco',
            prompt: 'O ambiente físico e digital favorece foco e qualidade?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'interrupcoesConstantes',
            prompt: 'Existem interrupções constantes?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'fluxoTrabalho',
            prompt: 'O fluxo de trabalho é linear ou fragmentado?',
            type: 'single',
            options: ['Linear', 'Fragmentado', 'Varia por área'],
            required: true,
          },
          {
            id: 'precisaDarJeito',
            prompt: 'As pessoas precisam dar um jeito para entregar?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'sistemaPremiaComportamento',
            prompt: 'O sistema premia o comportamento certo ou o errado?',
            type: 'single',
            options: ['Certo', 'Errado', 'Ambíguo', 'Não está claro'],
            required: true,
          },
        ],
      },
    ],
    deliverables: [
      'Diagnóstico se o sistema sustenta, limita ou sabota a performance',
      'Gargalos, fricções, riscos e dependência excessiva de pessoas',
      'Clareza sobre treinamento, redesign, tecnologia ou governança',
    ],
  },
  {
    id: 'teamScan',
    step: '1.4',
    shortTitle: 'Team Scan',
    title: 'Team Scan',
    subtitle: 'Human Performance Deep Scan',
    goal:
      'Diagnosticar com evidências se o gap é causado ou amplificado por conhecimento, habilidade, comportamento, colaboração, onboarding, gestão, suporte ou aprendizagem.',
    principle:
      'Se o sistema está certo, o time ainda pode falhar. Se o sistema está errado, o time só performa à custa de heroísmo.',
    blocks: [
      {
        id: 'contexto-trabalho',
        title: 'A - Contexto do Trabalho',
        description: 'Responda pelas duas lentes quando possível para revelar contradições.',
        outputForAI: 'Mapa de fricção do contexto físico, social e de carga de trabalho.',
        fields: withTeamLenses([
          ratingField('ambienteQualidadeProdutividade', 'O ambiente favorece qualidade e produtividade?'),
          ratingField('limitacoesErgonomicas', 'Há limitações físicas ou ergonômicas que atrapalham?'),
          ratingField('iluminacaoAdequada', 'A iluminação é adequada ou prejudica a execução?'),
          ratingField('ruidoConcentracao', 'Ruído ambiente atrapalha concentração, comunicação e tomada de decisão?'),
          ratingField('interrupcoesDistrações', 'Interrupções e distrações são frequentes?'),
          {
            id: 'ritmoSustentavel',
            prompt: 'O ritmo de trabalho é sustentável ou sempre no limite?',
            type: 'single',
            options: ['Sustentável', 'Oscilante', 'Sempre no limite'],
          },
          {
            id: 'variabilidadeTrabalho',
            prompt: 'A variabilidade do trabalho é alta?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'riscosSeguranca',
            prompt: 'Há riscos de segurança ou condições perigosas relevantes?',
          },
          {
            id: 'cargaGerenciavel',
            prompt: 'A carga é gerenciável dentro do tempo e do padrão exigido?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'colaboracaoIntensa',
            prompt: 'O trabalho exige colaboração intensa?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'knowledgeSharing',
            prompt: 'As pessoas compartilham conhecimento e best practices ou guardam segredos?',
          },
          {
            id: 'conflitoInterpessoal',
            prompt: 'Há conflito interpessoal alto com colegas, clientes ou outras áreas?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'pertencimentoResultadosColetivos',
            prompt: 'Existe sensação de pertencimento e compromisso com resultados coletivos?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'tarefasSocialmenteNegativas',
            prompt: 'Existem tarefas percebidas como socialmente negativas que afetam engajamento ou turnover?',
          },
        ]),
      },
      {
        id: 'aprendizagem-desenvolvimento',
        title: 'B - Aprendizagem e Desenvolvimento',
        outputForAI: 'Matriz treinável versus não-treinável e Transfer Risk Score.',
        fields: withTeamLenses([
          {
            id: 'treinamentoFormalExiste',
            prompt: 'Existe treinamento formal para performar o trabalho?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'treinamentoEnsinaCritico',
            prompt: 'Se existe, ele ensina comportamentos e tarefas críticas, não só teoria?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'treinamentoImpactoComportamento',
            prompt: 'O treinamento impacta o comportamento desejado ou também outros fatores?',
          },
          {
            id: 'gapTreinoControleFeedbackProcesso',
            prompt: 'O gap é mais de treino ou de controle, feedback e processo?',
            type: 'single',
            options: ['Treino', 'Controle / feedback', 'Processo', 'Híbrido'],
          },
          {
            id: 'informacaoMudaFrequencia',
            prompt: 'A informação usada no trabalho muda com frequência?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'comoPerformerSabeMudanca',
            prompt: 'Quando muda, como o performer fica sabendo?',
          },
          {
            id: 'dependenciaMemoriaFerramentaColega',
            prompt: 'O performer depende de memória, ferramentas, guias, sistemas ou colegas?',
          },
          {
            id: 'aplicaImediatamenteAprende',
            prompt: 'O performer consegue aplicar imediatamente o que aprende?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'tempoEntreAprenderUsar',
            prompt: 'Quanto tempo passa entre aprender e usar novamente?',
          },
          {
            id: 'jobAidChecklist',
            prompt: 'Existe job aid ou checklist que acompanha o trabalho?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'aprendizagemInformal',
            prompt: 'Quanto da aprendizagem acontece informalmente?',
          },
          {
            id: 'quemTreinaExperienciaReal',
            prompt: 'Quem treina tem experiência real na função?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'treinamentoBaseadoDados',
            prompt: 'O treinamento foi baseado em dados do Performance Analysis ou em achismo?',
            type: 'single',
            options: ['Dados', 'Achismo', 'Mistura', 'Não sei'],
          },
          {
            id: 'planoDesenvolvimento',
            prompt: 'Existe plano individual de desenvolvimento e acompanhamento?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'wishListTreinamento',
            prompt: 'Se você pudesse melhorar o treinamento, o que mudaria?',
          },
        ]),
      },
      {
        id: 'talentos-onboarding',
        title: 'C - Aquisição de Talentos e Onboarding',
        outputForAI: 'Qualidade de entrada e risco de performance por mismatch.',
        fields: withTeamLenses([
          {
            id: 'jobDescriptionClaro',
            prompt: 'O job description é claro sobre comportamentos e outputs críticos?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'requisitosMinimosClaros',
            prompt: 'Há requisitos mínimos claros para performar bem?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'entrevistaAvaliaExecucao',
            prompt: 'A entrevista identifica capacidade real de executar, e não só boa conversa?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'processoAvaliaFitCultural',
            prompt: 'O processo avalia fit com valores e cultura quando relevante?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'orientacaoInicialCompleta',
            prompt: 'A orientação inicial inclui ambiente, equipe, forma de trabalhar e regras do jogo?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'buddyMentorPrimeirosDias',
            prompt: 'Existe buddy ou mentor nos primeiros dias?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'promocoesPorHabilidade',
            prompt: 'Promoções acontecem por habilidade demonstrada ou por tempo e urgência?',
            type: 'single',
            options: ['Habilidade demonstrada', 'Tempo', 'Urgência', 'Mistura'],
          },
          {
            id: 'trilhaCarreiraClara',
            prompt: 'Existe trilha de carreira clara para a função?',
            type: 'single',
            options: yesPartialNoOptions,
          },
        ]),
      },
      {
        id: 'suporte-gerencial-estrutural',
        title: 'D - Suporte Gerencial e Estrutural',
        outputForAI: 'Management Enablement Score e Structural Alignment Score.',
        fields: withTeamLenses([
          {
            id: 'liderComunicaPrioridades',
            prompt: 'Líder comunica prioridades e expectativas de forma consistente?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'feedbackFrequente',
            prompt: 'Existe feedback frequente, não só anual?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'liderRemoveBarreiras',
            prompt: 'O líder remove barreiras ou apenas cobra resultado?',
            type: 'single',
            options: ['Remove barreiras', 'Apenas cobra', 'Depende do líder', 'Não sei'],
          },
          {
            id: 'liderObservaTrabalho',
            prompt: 'O líder observa o trabalho e orienta com base em evidências?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'estruturaReportePerformance',
            prompt: 'Há alinhamento entre estrutura de reporte e monitoramento de performance?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'comoRecebeFeedback',
            prompt: 'Como o performer recebe feedback e de quem?',
          },
          {
            id: 'avaliacaoMedeImporta',
            prompt: 'O processo de avaliação mede o que realmente importa?',
            type: 'single',
            options: yesPartialNoOptions,
          },
          {
            id: 'organizacaoRecompensa',
            prompt: 'O que a organização recompensa: qualidade, velocidade, volume ou apagar incêndio?',
            type: 'multi',
            options: ['Qualidade', 'Velocidade', 'Volume', 'Apagar incêndio', 'Colaboração', 'Aprendizagem'],
          },
        ]),
      },
      {
        id: 'confirmacao-hipoteses',
        title: 'E - Confirmação de Hipóteses',
        outputForAI: 'Top 3 causas prováveis e trilha automática: System Fix, People Fix ou Work Design Fix.',
        fields: [
          {
            id: 'hipotesesTeamScan',
            prompt: 'Quais hipóteses têm evidência hoje?',
            type: 'multi',
            options: [
              'Falta de feedback/coaching',
              'Duplicação de esforço/retrabalho',
              'Inputs necessários não chegam',
              'Processo mal desenhado',
              'Condições de trabalho ruins',
              'Ferramentas/equipamentos insuficientes',
              'Distrações ambientais relevantes',
              'Carga de trabalho ingovernável',
              'Colaboração/knowledge sharing é gargalo',
            ],
            required: true,
          },
          {
            id: 'evidenciasHipotesesTeamScan',
            prompt: 'Quais evidências sustentam essas hipóteses?',
            required: true,
          },
          {
            id: 'trilhaProvavelTeamScan',
            prompt: 'A trilha provável parece ser:',
            type: 'single',
            options: ['System Fix', 'People Fix', 'Work Design Fix', 'Hybrid', 'Ainda incerto'],
            required: true,
          },
        ],
      },
    ],
    deliverables: [
      'Scorecards 0-100 por fricção, aprendizagem, transferência, entrada, gestão, estrutura e colaboração',
      'Diagnóstico escrito do que quebra performance no time',
      'Classificação do gap humano para a fase de Solution Pick',
    ],
  },
  {
    id: 'solutionPick',
    step: '1.5',
    shortTitle: 'Solution Pick',
    title: 'Solution Pick',
    subtitle: 'Intelligent Action Architecture',
    goal:
      'Transformar o diagnóstico em soluções certas, na ordem certa, no ritmo certo, com mínimo desperdício e máximo impacto.',
    principle: 'Nem tudo deve ser feito agora. Nem tudo deve ser treinado. Nem tudo precisa de tecnologia.',
    blocks: [
      {
        id: 'scores-consolidados',
        title: 'Bloco 1 - Scores consolidados para o motor de regras',
        outputForAI: 'Base numérica para regras condicionais de solução.',
        fields: [
          {
            id: 'transferReadinessScore',
            prompt: 'Transfer Readiness Score',
            type: 'scale',
            minLabel: '0',
            maxLabel: '100',
            required: true,
          },
          {
            id: 'learningEffectivenessScore',
            prompt: 'Learning Effectiveness Score',
            type: 'scale',
            minLabel: '0',
            maxLabel: '100',
            required: true,
          },
          {
            id: 'contextFrictionScore',
            prompt: 'Context Friction Score',
            type: 'scale',
            minLabel: '0',
            maxLabel: '100',
            required: true,
          },
          {
            id: 'systemFrictionScore',
            prompt: 'System Friction Score',
            type: 'scale',
            minLabel: '0',
            maxLabel: '100',
            required: true,
          },
          {
            id: 'managementEnablementScore',
            prompt: 'Management Enablement Score',
            type: 'scale',
            minLabel: '0',
            maxLabel: '100',
            required: true,
          },
          {
            id: 'talentEntryQualityScore',
            prompt: 'Talent Entry Quality Score',
            type: 'scale',
            minLabel: '0',
            maxLabel: '100',
            required: true,
          },
        ],
      },
      {
        id: 'priorizacao-solucoes',
        title: 'Bloco 2 - Priorização e Orquestração',
        outputForAI: 'O que resolver primeiro, o que evitar agora e a solução selecionada para o Design.',
        fields: [
          {
            id: 'bloqueioPrincipalResumo',
            prompt: 'Diagnóstico-resumo: o principal bloqueio de performance hoje está em X, antes de Y.',
            required: true,
          },
          {
            id: 'solucoesPrioritarias',
            prompt: 'Quais soluções devem ser priorizadas e por quê?',
            required: true,
          },
          {
            id: 'naoFazerAgora',
            prompt: 'O que NÃO fazer agora?',
            required: true,
          },
          {
            id: 'quickWins30Dias',
            prompt: 'Quick Wins (0-30 dias): o que aliviará a dor imediata?',
            required: true,
          },
          {
            id: 'stabilization90Dias',
            prompt: 'Performance Stabilization (30-90 dias): o que estabiliza o sistema humano?',
            required: true,
          },
          {
            id: 'scaling180Dias',
            prompt: 'Performance Scaling (90-180 dias): o que escala com sustentabilidade?',
            required: true,
          },
          {
            id: 'riscosNaoExecucao',
            prompt: 'Quais são os riscos de não execução?',
            required: true,
          },
          {
            id: 'solucaoSelecionadaDesign',
            prompt: 'Ação: solução selecionada para a próxima fase Design do People Sprint 90+',
            required: true,
          },
        ],
      },
    ],
    deliverables: [
      'Diagnóstico-resumo executivo',
      'Mapa de soluções prioritárias',
      'Roadmap em três waves',
      'Riscos de não execução',
      'Solução selecionada para a próxima fase Design',
    ],
  },
];

export const SOLUTION_RULES = [
  {
    metric: 'Transfer Readiness Score',
    trigger: '< 60',
    avoid: 'Não priorizar novos treinamentos formais',
    prioritize: ['Performance Support', 'Job aids', 'Checklists', 'Coaching no trabalho', 'Micro-guias no fluxo real'],
    logic: 'Aprender não é o problema principal; aplicar é.',
  },
  {
    metric: 'Learning Effectiveness Score',
    trigger: '< 60 e Transfer Readiness >= 60',
    avoid: 'Não manter conteúdo teórico genérico',
    prioritize: ['Redesenho de conteúdo', 'Casos reais', 'Prática contextualizada'],
    logic: 'A aprendizagem precisa ficar mais próxima do trabalho real.',
  },
  {
    metric: 'Context Friction Score',
    trigger: '> 65',
    avoid: 'Não recomendar treinamento como solução principal',
    prioritize: ['Redesign do trabalho', 'Ajuste de carga', 'Redução de interrupções', 'Clarificação de prioridades'],
    logic: 'Contexto ruim consome qualquer competência.',
  },
  {
    metric: 'System Friction Score',
    trigger: '> 70',
    avoid: 'Não começar por People Fix',
    prioritize: ['System Fix', 'Simplificação de processos', 'Regras de decisão', 'Automação / IA de apoio'],
    logic: 'Sistema quebrado precisa vir antes de escala humana.',
  },
  {
    metric: 'Management Enablement Score',
    trigger: '< 65',
    avoid: 'Não iniciar programas avançados de liderança',
    prioritize: ['Rotinas de gestão do trabalho', 'Feedback estruturado', 'Coaching de líderes no dia a dia'],
    logic: 'Liderança fraca neutraliza sistemas bons.',
  },
  {
    metric: 'Talent Entry Quality Score',
    trigger: '< 60',
    avoid: 'Não escalar onboarding informal',
    prioritize: ['Job descriptions', 'Critérios de seleção', 'Buddy system', 'Trilhas de ramp-up de 90 dias'],
    logic: 'Entrada ruim cria performance cara para corrigir depois.',
  },
];

export function getFieldKeys(field: DiagnosticField): string[] {
  if (!field.lenses?.length) return [field.id];
  return field.lenses.map((lens) => `${lens}_${field.id}`);
}

export function getAllDiagnosticFields(): DiagnosticField[] {
  return DIAGNOSTIC_PHASES.flatMap((phase) => phase.blocks.flatMap((block) => block.fields));
}

export function getAllDiagnosticFieldKeys(): string[] {
  return getAllDiagnosticFields().flatMap(getFieldKeys);
}

const SOLUTION_PICK_PHASE_ID: DiagnosticPhaseId = 'solutionPick';

export function getRequiredDiagnosticFieldKeys(): string[] {
  return getAllDiagnosticFields()
    .filter((field) => field.required)
    .flatMap(getFieldKeys);
}

/** Campos obrigatórios exceto Solution Pick manual (1.5 é guiado por IA + seleção). */
export function getRequiredDiagnosticFieldKeysExcludingSolutionPick(): string[] {
  return DIAGNOSTIC_PHASES.filter((p) => p.id !== SOLUTION_PICK_PHASE_ID)
    .flatMap((phase) =>
      phase.blocks.flatMap((block) =>
        block.fields.filter((field) => field.required).flatMap(getFieldKeys)
      )
    );
}

export function buildDiagnosticContextThroughTeamScan(data: InitialFormData): string {
  const lines: string[] = ['# Diagnóstico organizacional (etapas 1.1 a 1.4)'];

  for (const phase of DIAGNOSTIC_PHASES) {
    if (phase.id === SOLUTION_PICK_PHASE_ID) break;
    const phaseLines: string[] = [];
    for (const block of phase.blocks) {
      const answers: string[] = [];
      for (const field of block.fields) {
        for (const key of getFieldKeys(field)) {
          const value = formatValue(data[key]);
          if (value) answers.push(`- ${fieldLabel(field, key)}: ${value}`);
        }
      }
      if (answers.length) {
        phaseLines.push(`\n## ${phase.step} ${phase.shortTitle} / ${block.title}\n${answers.join('\n')}`);
      }
    }
    if (phaseLines.length) lines.push(...phaseLines);
  }

  return lines.join('\n').trim();
}

export function isPhasesThroughTeamScanComplete(data: InitialFormData): boolean {
  const keys = getRequiredDiagnosticFieldKeysExcludingSolutionPick();
  return keys.every((key) => isDiagnosticValueAnswered(data[key]));
}

export function createEmptyDiagnosticData(): InitialFormData {
  const empty = {} as InitialFormData;
  for (const field of getAllDiagnosticFields()) {
    for (const key of getFieldKeys(field)) {
      empty[key] = field.type === 'multi' ? [] : '';
    }
  }
  return {
    ...empty,
    organizacao: String(empty.organizacao ?? ''),
    produtoServico: String(empty.produtoServico ?? ''),
    estagioNegocio: String(empty.estagioNegocio ?? ''),
    fatoresExternos: String(empty.fatoresExternos ?? ''),
    mudancasRecentes: String(empty.mudancasRecentes ?? ''),
  };
}

export function isDiagnosticValueAnswered(value: DiagnosticFieldValue | undefined): boolean {
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === 'string' && value.trim().length > 0;
}

export function getDiagnosticCompletion(data: InitialFormData) {
  const allKeys = getAllDiagnosticFieldKeys();
  const requiredKeys = getRequiredDiagnosticFieldKeys();
  const answeredAll = allKeys.filter((key) => isDiagnosticValueAnswered(data[key])).length;
  const answeredRequired = requiredKeys.filter((key) => isDiagnosticValueAnswered(data[key])).length;

  const byPhase = DIAGNOSTIC_PHASES.map((phase) => {
    const keys = phase.blocks.flatMap((block) => block.fields.flatMap(getFieldKeys));
    const required = phase.blocks
      .flatMap((block) => block.fields)
      .filter((field) => field.required)
      .flatMap(getFieldKeys);
    return {
      id: phase.id,
      total: keys.length,
      answered: keys.filter((key) => isDiagnosticValueAnswered(data[key])).length,
      requiredTotal: required.length,
      requiredAnswered: required.filter((key) => isDiagnosticValueAnswered(data[key])).length,
    };
  });

  return {
    total: allKeys.length,
    answered: answeredAll,
    percent: allKeys.length ? Math.round((answeredAll / allKeys.length) * 100) : 0,
    requiredTotal: requiredKeys.length,
    requiredAnswered: answeredRequired,
    requiredPercent: requiredKeys.length ? Math.round((answeredRequired / requiredKeys.length) * 100) : 0,
    byPhase,
  };
}

function formatValue(value: DiagnosticFieldValue | undefined): string {
  if (!isDiagnosticValueAnswered(value)) return '';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'string') return value.trim();
  return '';
}

function fieldLabel(field: DiagnosticField, key: string): string {
  const lens = DIAGNOSTIC_LENSES.find((item) => key.startsWith(`${item.id}_`));
  return lens ? `${field.prompt} (${lens.label})` : field.prompt;
}

export function buildDiagnosticContext(data: InitialFormData): string {
  const lines: string[] = ['# Diagnóstico organizacional (etapas 1.1 a 1.5)'];

  for (const phase of DIAGNOSTIC_PHASES) {
    const phaseLines: string[] = [];
    for (const block of phase.blocks) {
      const answers: string[] = [];
      for (const field of block.fields) {
        for (const key of getFieldKeys(field)) {
          const value = formatValue(data[key]);
          if (value) answers.push(`- ${fieldLabel(field, key)}: ${value}`);
        }
      }
      if (answers.length) {
        phaseLines.push(`\n## ${phase.step} ${phase.shortTitle} / ${block.title}\n${answers.join('\n')}`);
      }
    }

    if (phaseLines.length) {
      lines.push(...phaseLines);
    }
  }

  const base = lines.join('\n').trim();
  const scans = buildOrganizationalScanContext(
    ORGANIZATIONAL_SCANS,
    parseOrganizationalScanData(data.organizationalScanData),
  );
  return scans ? `${base}\n\n${scans}` : base;
}

function buildCompanyProfileBlock(data: InitialFormData): string {
  const lines: string[] = [];
  const push = (label: string, value: DiagnosticFieldValue | undefined) => {
    const text = formatValue(value);
    if (text) lines.push(`- ${label}: ${text}`);
  };

  const orgFromForm = formatValue(data.organizacao);
  const scanAnswers = parseOrganizationalScanData(data.organizationalScanData);
  const orgFromSwot = formatValue(scanAnswers.swot?.swot_organization);
  const orgName = orgFromForm || orgFromSwot;
  if (orgName) {
    lines.push(`- Nome da empresa (usar exatamente este nome nos textos): ${orgName}`);
  }
  push('Organização', data.organizacao);
  if (orgFromSwot && orgFromSwot !== orgFromForm) {
    lines.push(`- Organização (informada no Scan SWOT): ${orgFromSwot}`);
  }
  push('Produto / serviço', data.produtoServico);
  push('Estágio do negócio', data.estagioNegocio);
  push('Fatores externos', data.fatoresExternos);
  push('Mudanças recentes', data.mudancasRecentes);
  push('Bloqueio principal (resumo)', data.bloqueioPrincipalResumo);

  return lines.length ? `## Perfil e contexto da empresa\n${lines.join('\n')}` : '';
}

/** Contexto robusto para Solution Pick: empresa + canvas 1.1–1.5 + scans focados. */
export function buildSolutionPickContext(data: InitialFormData): string {
  const parts: string[] = [];
  const company = buildCompanyProfileBlock(data);
  if (company) parts.push(company);

  let diagnostic = buildDiagnosticContextThroughTeamScan(data);
  const scans = buildOrganizationalScanContext(
    ORGANIZATIONAL_SCANS,
    parseOrganizationalScanData(data.organizationalScanData),
  );
  if (scans) diagnostic = diagnostic ? `${diagnostic}\n\n${scans}` : scans;
  if (diagnostic) parts.push(diagnostic);

  return parts.join('\n\n').trim();
}

export function hasCompleteOrganizationalScan(data: InitialFormData): boolean {
  const answers = parseOrganizationalScanData(data.organizationalScanData);
  return ORGANIZATIONAL_SCANS.filter((scan) => scan.id !== 'fullScan' && !scan.comingSoon).some(
    (scan) => getScanStatus(scan, answers[scan.id] ?? {}) === 'complete'
  );
}

/** Solution Pick disponível com canvas 1.1–1.4, scan focado concluído ou diagnóstico parcial robusto. */
export function isSolutionPickReady(data: InitialFormData): boolean {
  if (isPhasesThroughTeamScanComplete(data)) return true;
  if (hasCompleteOrganizationalScan(data)) return true;

  const completion = getDiagnosticCompletion(data);
  const hasCompany = isDiagnosticValueAnswered(data.organizacao);
  const hasBlocker = isDiagnosticValueAnswered(data.bloqueioPrincipalResumo);
  return hasCompany && (hasBlocker || completion.requiredPercent >= 35);
}
