import type { OrganizationalScanDefinition } from '../../types/organizationalScans';
import { block, resetFieldCounter } from './builders';
import { SCAN_OPTIONS as O } from './options';

resetFieldCounter();

const LEADERSHIP_BLOCKS = [
  block('leadership', 'Clareza e direcionamento', [
    { prompt: 'Os líderes comunicam claramente as prioridades da organização?', options: O.frequency },
    {
      prompt: 'As equipes entendem como seu trabalho contribui para os objetivos do negócio?',
      options: O.frequency,
    },
    { prompt: 'Os líderes alinham expectativas de forma consistente?', options: O.frequency },
    {
      prompt: 'Quando prioridades mudam, a liderança comunica rapidamente as mudanças?',
      options: O.frequency,
    },
    { prompt: 'A liderança demonstra visão clara sobre o futuro?', options: O.coherence },
  ]),
  block('leadership', 'Comunicação e influência', [
    { prompt: 'Os líderes comunicam decisões de forma transparente?', options: O.frequency },
    {
      prompt: 'Os líderes escutam opiniões antes de tomar decisões importantes?',
      options: O.frequency,
    },
    { prompt: 'A comunicação da liderança gera confiança?', options: O.coherence },
    { prompt: 'Os líderes conseguem influenciar positivamente suas equipes?', options: O.amount },
    { prompt: 'A liderança inspira as pessoas a dar o melhor de si?', options: O.frequency },
  ]),
  block('leadership', 'Desenvolvimento de pessoas', [
    { prompt: 'Os líderes dedicam tempo ao desenvolvimento das pessoas?', options: O.frequency },
    { prompt: 'Os líderes identificam talentos e potencial de crescimento?', options: O.frequency },
    { prompt: 'Existem conversas regulares sobre desenvolvimento profissional?', options: O.frequency },
    { prompt: 'Os líderes apoiam a aprendizagem contínua?', options: O.frequency },
    {
      prompt: 'As promoções são baseadas em mérito e capacidade demonstrada?',
      options: O.frequency,
    },
  ]),
  block('leadership', 'Feedback e accountability', [
    { prompt: 'Os líderes fornecem feedback frequente e útil?', options: O.frequency },
    { prompt: 'O feedback recebido ajuda a melhorar a performance?', options: O.frequency },
    { prompt: 'Os líderes tratam problemas de desempenho rapidamente?', options: O.frequency },
    { prompt: 'Existe responsabilização clara pelos resultados?', options: O.frequency },
    { prompt: 'Os líderes equilibram apoio e cobrança de resultados?', options: O.quality },
  ]),
  block('leadership', 'Tomada de decisão', [
    {
      prompt: 'As decisões importantes são tomadas com informações adequadas?',
      options: O.frequency,
    },
    {
      prompt: 'As decisões são tomadas no nível adequado da organização?',
      options: O.frequency,
    },
    { prompt: 'A liderança evita burocracia desnecessária?', options: O.frequency },
    { prompt: 'Os líderes assumem responsabilidade por decisões difíceis?', options: O.frequency },
    {
      prompt: 'A organização reage rapidamente diante de desafios e oportunidades?',
      options: O.speed,
    },
  ]),
  block('leadership', 'Confiança e segurança psicológica', [
    {
      prompt: 'Os colaboradores se sentem seguros para discordar dos líderes?',
      options: O.frequency,
    },
    { prompt: 'Os líderes incentivam diferentes pontos de vista?', options: O.frequency },
    { prompt: 'Os erros são tratados como oportunidade de aprendizado?', options: O.frequency },
    { prompt: 'Existe confiança entre líderes e equipes?', options: O.coherence },
    { prompt: 'Os líderes demonstram coerência entre discurso e ação?', options: O.frequency },
  ]),
  block('leadership', 'Liderança para resultados e futuro', [
    {
      prompt: 'A liderança equilibra resultados de curto e longo prazo?',
      options: O.frequency,
    },
    { prompt: 'Os líderes estimulam inovação e melhoria contínua?', options: O.frequency },
    { prompt: 'A liderança prepara sucessores para posições-chave?', options: O.frequency },
    { prompt: 'Os líderes ajudam a organização a se adaptar às mudanças?', options: O.frequency },
    {
      prompt: 'Você acredita que a liderança atual está preparada para os desafios futuros?',
      options: O.npsExtended,
    },
  ]),
];

export const leadershipScan: OrganizationalScanDefinition = {
  id: 'leadership',
  step: 'Scan 2',
  title: 'Leadership Scan',
  subtitle: 'Comportamentos e capacidades de liderança',
  intro:
    'A liderança é um dos fatores que mais influenciam a cultura, o engajamento das equipes e a capacidade de uma organização alcançar seus objetivos. Este diagnóstico identifica comportamentos, práticas e capacidades que fortalecem ou limitam a performance do negócio.',
  guidance:
    'Responda com base em evidências e experiências observáveis, evitando percepções isoladas. Considere diferentes perspectivas da organização sempre que possível.',
  blocks: LEADERSHIP_BLOCKS,
};
