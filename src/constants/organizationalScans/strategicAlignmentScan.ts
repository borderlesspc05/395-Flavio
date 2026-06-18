import type { OrganizationalScanDefinition } from '../../types/organizationalScans';
import { block, resetFieldCounter } from './builders';
import { SCAN_OPTIONS as O } from './options';

resetFieldCounter();

const STRATEGIC_BLOCKS = [
  block('strategic', 'Clareza estratégica', [
    { prompt: 'A estratégia da organização está claramente definida?', options: O.frequency },
    { prompt: 'Os objetivos estratégicos são facilmente compreendidos?', options: O.frequency },
    {
      prompt: 'A organização possui prioridades estratégicas bem definidas?',
      options: O.priorityClarity,
    },
    {
      prompt: 'Existe clareza sobre o que é mais importante para o sucesso futuro do negócio?',
      options: O.frequency,
    },
    { prompt: 'A estratégia orienta efetivamente as decisões organizacionais?', options: O.frequency },
  ]),
  block('strategic', 'Comunicação e compreensão', [
    { prompt: 'A estratégia é comunicada de forma consistente pela liderança?', options: O.frequency },
    {
      prompt: 'Os colaboradores entendem como contribuem para a estratégia?',
      options: O.frequency,
    },
    {
      prompt: 'Existe linguagem comum para discutir prioridades estratégicas?',
      options: O.frequency,
    },
    { prompt: 'As metas organizacionais são compreendidas pelas equipes?', options: O.amount },
    {
      prompt: 'Existe alinhamento entre o que a liderança comunica e o que as equipes entendem?',
      options: O.coherence,
    },
  ]),
  block('strategic', 'Prioridades e foco', [
    {
      prompt: 'As prioridades estratégicas permanecem estáveis o suficiente para permitir execução?',
      options: O.frequency,
    },
    {
      prompt: 'Existem iniciativas concorrentes que desviam atenção das prioridades?',
      options: O.frequencyReversed,
    },
    {
      prompt: 'Os recursos são direcionados para as prioridades mais importantes?',
      options: O.frequency,
    },
    { prompt: 'A organização sabe dizer claramente o que NÃO é prioridade?', options: O.frequency },
    { prompt: 'O excesso de prioridades prejudica a execução?', options: O.frequencyReversed },
  ]),
  block('strategic', 'Alinhamento organizacional', [
    {
      prompt: 'As diferentes áreas trabalham em direção aos mesmos objetivos?',
      options: O.frequency,
    },
    {
      prompt: 'Existe alinhamento entre áreas corporativas e operacionais?',
      options: O.coherence,
    },
    { prompt: 'As metas das áreas reforçam a estratégia organizacional?', options: O.frequency },
    {
      prompt: 'Existem conflitos de objetivos entre departamentos?',
      options: O.frequencyReversed,
    },
    {
      prompt: 'As decisões locais apoiam ou enfraquecem a estratégia global?',
      options: O.decisionImpact,
    },
  ]),
  block('strategic', 'Recursos e capacidades', [
    {
      prompt: 'A organização possui as competências necessárias para executar sua estratégia?',
      options: O.frequency,
    },
    {
      prompt: 'Os recursos financeiros apoiam as prioridades estratégicas?',
      options: O.frequency,
    },
    { prompt: 'A tecnologia disponível suporta a execução da estratégia?', options: O.quality },
    {
      prompt: 'A capacidade operacional acompanha as ambições estratégicas?',
      options: O.frequency,
    },
    {
      prompt: 'Existem barreiras relevantes que limitam a execução estratégica?',
      options: O.barriers,
    },
  ]),
  block('strategic', 'Execução e acompanhamento', [
    { prompt: 'Existem indicadores claros para monitorar a estratégia?', options: O.frequency },
    { prompt: 'O progresso estratégico é acompanhado regularmente?', options: O.frequency },
    { prompt: 'Os líderes utilizam dados para ajustar a execução?', options: O.frequency },
    { prompt: 'As iniciativas estratégicas geram resultados mensuráveis?', options: O.frequency },
    { prompt: 'Existe accountability clara pela execução da estratégia?', options: O.frequency },
  ]),
  block('strategic', 'Adaptabilidade estratégica', [
    { prompt: 'A organização monitora mudanças no mercado regularmente?', options: O.frequency },
    { prompt: 'A estratégia é ajustada quando o contexto exige?', options: O.frequency },
    { prompt: 'A organização aprende com erros e resultados obtidos?', options: O.frequency },
    {
      prompt: 'Existe equilíbrio entre disciplina estratégica e flexibilidade?',
      options: O.balance,
    },
    {
      prompt:
        'Você acredita que a organização está preparada para executar sua estratégia nos próximos 3 anos?',
      options: O.npsExtended,
    },
  ]),
];

export const strategicAlignmentScan: OrganizationalScanDefinition = {
  id: 'strategicAlignment',
  step: 'Scan 5',
  title: 'Strategic Alignment Scan',
  subtitle: 'Alinhamento entre estratégia, prioridades e execução',
  intro:
    'Uma estratégia só gera resultados quando é compreendida, compartilhada e executada de forma consistente em toda a organização. Este diagnóstico avalia o nível de alinhamento entre estratégia, liderança, prioridades, recursos e execução.',
  guidance:
    'Responda com base em evidências, práticas observadas e resultados reais. Considere diferentes perspectivas da organização, incluindo líderes, equipes, fóruns internos e indicadores de planejamento.',
  blocks: STRATEGIC_BLOCKS,
};
