// Tipos
export type ScaleType = "frequency" | "level" | "agreement" | "quality";

export type OptionDef = { value: number; label: string };
export type Question = {
  id: string;
  text: string;
  scale: ScaleType;
  required?: boolean;
};
export type Category = {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
};
export type Scan = {
  id: string;
  code: string;           // "SCAN 1"
  title: string;
  description: string;
  comingSoon?: boolean;
  category?: string;      // curta, usada em alguns cards
  totalQuestions: number;
  categories: Category[];
};

// Escalas padrão — reutilizadas por todo o diagnóstico
export const SCALES: Record<ScaleType, OptionDef[]> = {
  frequency: [
    { value: 1, label: "Nunca" },
    { value: 2, label: "Raramente" },
    { value: 3, label: "Às vezes" },
    { value: 4, label: "Frequentemente" },
    { value: 5, label: "Sempre" },
  ],
  level: [
    { value: 1, label: "Muito baixa" },
    { value: 2, label: "Baixa" },
    { value: 3, label: "Moderada" },
    { value: 4, label: "Alta" },
    { value: 5, label: "Muito alta" },
  ],
  agreement: [
    { value: 1, label: "Discordo totalmente" },
    { value: 2, label: "Discordo" },
    { value: 3, label: "Neutro" },
    { value: 4, label: "Concordo" },
    { value: 5, label: "Concordo totalmente" },
  ],
  quality: [
    { value: 1, label: "Muito pouco" },
    { value: 2, label: "Pouco" },
    { value: 3, label: "Moderadamente" },
    { value: 4, label: "Muito" },
    { value: 5, label: "Totalmente" },
  ],
};

// Scans
export const SCANS: Scan[] = [
  {
    id: "cultura",
    code: "SCAN 1",
    title: "Cultura Organizacional",
    description: "Diagnóstico da cultura vivida no dia a dia",
    category: "Cultura & Valores",
    totalQuestions: 22,
    categories: [
      {
        id: "cultura-valores",
        title: "Valores e Propósito",
        questions: [
          { id: "c1", text: "Os valores da organização são claramente percebidos no dia a dia?", scale: "frequency", required: true },
          { id: "c2", text: "As pessoas entendem como o seu trabalho contribui para o propósito da empresa?", scale: "frequency", required: true },
          { id: "c3", text: "As decisões de liderança estão alinhadas com os valores declarados?", scale: "frequency", required: true },
        ],
      },
      {
        id: "cultura-ambiente",
        title: "Ambiente e Relacionamento",
        questions: [
          { id: "c4", text: "O ambiente de trabalho favorece a colaboração entre áreas?", scale: "level", required: true },
          { id: "c5", text: "As pessoas sentem-se psicologicamente seguras para se expressar?", scale: "frequency", required: true },
          { id: "c6", text: "Os conflitos são tratados de forma construtiva?", scale: "level", required: true },
        ],
      },
    ],
  },
  {
    id: "lideranca",
    code: "SCAN 2",
    title: "Leadership Scan",
    description: "Comportamentos e capacidades de liderança",
    category: "Liderança",
    totalQuestions: 35,
    categories: [
      {
        id: "l-clareza",
        title: "Clareza e Direcionamento",
        questions: [
          { id: "l1", text: "Os líderes comunicam claramente as prioridades da organização?", scale: "frequency", required: true },
          { id: "l2", text: "As equipes entendem como seu trabalho contribui para os objetivos do negócio?", scale: "frequency", required: true },
          { id: "l3", text: "Os líderes alinham expectativas de forma consistente?", scale: "frequency", required: true },
          { id: "l4", text: "Quando prioridades mudam, a liderança comunica rapidamente as mudanças?", scale: "frequency", required: true },
          { id: "l5", text: "A liderança demonstra visão clara sobre o futuro?", scale: "level", required: true },
        ],
      },
      {
        id: "l-comunicacao",
        title: "Comunicação e Influência",
        questions: [
          { id: "l6", text: "Os líderes comunicam decisões de forma transparente?", scale: "frequency", required: true },
          { id: "l7", text: "Os líderes escutam opiniões antes de tomar decisões importantes?", scale: "frequency", required: true },
          { id: "l8", text: "A comunicação da liderança gera confiança?", scale: "level", required: true },
          { id: "l9", text: "Os líderes conseguem influenciar positivamente suas equipes?", scale: "quality", required: true },
          { id: "l10", text: "A liderança inspira as pessoas a dar o melhor de si?", scale: "level", required: true },
        ],
      },
      {
        id: "l-desenvolvimento",
        title: "Desenvolvimento e Feedback",
        questions: [
          { id: "l11", text: "Os líderes oferecem feedback construtivo de forma regular?", scale: "frequency" },
          { id: "l12", text: "Existem planos claros de desenvolvimento para cada pessoa?", scale: "level" },
          { id: "l13", text: "A liderança reconhece e celebra resultados alcançados?", scale: "frequency" },
        ],
      },
    ],
  },
  {
    id: "cliente",
    code: "SCAN 3",
    title: "Customer Experience Scan",
    description: "Jornada, qualidade e fidelização do cliente",
    category: "Cliente",
    totalQuestions: 28,
    categories: [
      {
        id: "cx-jornada",
        title: "Jornada do Cliente",
        questions: [
          { id: "cx1", text: "A jornada do cliente está claramente mapeada e compreendida?", scale: "level", required: true },
          { id: "cx2", text: "Os pontos de atrito ao longo da jornada são identificados e tratados?", scale: "frequency", required: true },
          { id: "cx3", text: "O onboarding de novos clientes é efetivo?", scale: "quality", required: true },
        ],
      },
      {
        id: "cx-qualidade",
        title: "Qualidade e Atendimento",
        questions: [
          { id: "cx4", text: "O atendimento ao cliente é ágil e resolutivo?", scale: "frequency" },
          { id: "cx5", text: "O tempo médio de resposta atende às expectativas dos clientes?", scale: "level" },
        ],
      },
    ],
  },
  {
    id: "employee",
    code: "SCAN 4",
    title: "Employee Experience Scan",
    description: "Jornada, engajamento e retenção de talentos",
    category: "Colaborador",
    totalQuestions: 30,
    categories: [
      {
        id: "ex-engajamento",
        title: "Engajamento",
        questions: [
          { id: "e1", text: "As pessoas sentem orgulho de trabalhar na organização?", scale: "level", required: true },
          { id: "e2", text: "O trabalho diário é desafiador e motivador?", scale: "level", required: true },
          { id: "e3", text: "Os colaboradores recomendam a empresa como um bom lugar para trabalhar?", scale: "frequency", required: true },
        ],
      },
      {
        id: "ex-jornada",
        title: "Jornada do Colaborador",
        questions: [
          { id: "e4", text: "O processo de admissão e integração é acolhedor?", scale: "quality" },
          { id: "e5", text: "As oportunidades de crescimento são claras?", scale: "level" },
        ],
      },
    ],
  },
  {
    id: "alinhamento",
    code: "SCAN 5",
    title: "Alinhamento Estratégico",
    description: "Coerência entre estratégia, prioridades e execução",
    category: "Estratégia",
    comingSoon: true,
    totalQuestions: 0,
    categories: [],
  },
  {
    id: "comunicacao",
    code: "SCAN 6",
    title: "Comunicação",
    description: "Clareza, fluxo e eficácia da comunicação interna",
    category: "Comunicação",
    comingSoon: true,
    totalQuestions: 0,
    categories: [],
  },
  {
    id: "turnover",
    code: "SCAN 7",
    title: "High Turnover Scan",
    description: "Causas, riscos e retenção de talentos",
    category: "Retenção",
    totalQuestions: 20,
    categories: [
      {
        id: "to-riscos",
        title: "Riscos e Motivos de Saída",
        questions: [
          { id: "t1", text: "As causas de desligamento são analisadas sistematicamente?", scale: "frequency", required: true },
          { id: "t2", text: "A remuneração está alinhada com o mercado?", scale: "level", required: true },
          { id: "t3", text: "Existem planos de retenção para talentos-chave?", scale: "level" },
        ],
      },
    ],
  },
];

export const CYCLE_INFO = {
  label: "Ciclo 2",
  date: "12/06/2028",
  mode: "DIAGNÓSTICO PE",
};
