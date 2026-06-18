import type { OrganizationalScanDefinition } from '../../types/organizationalScans';
import { block, resetFieldCounter } from './builders';
import { SCAN_OPTIONS as O } from './options';

resetFieldCounter();

const COMMUNICATION_BLOCKS = [
  block('communication', 'Clareza da comunicação', [
    { prompt: 'As mensagens importantes são comunicadas de forma clara?', options: O.frequency },
    {
      prompt: 'As pessoas entendem o que se espera delas após uma comunicação?',
      options: O.frequency,
    },
    { prompt: 'Informações relevantes chegam com contexto suficiente?', options: O.frequency },
    {
      prompt: 'Existe consistência entre mensagens vindas de diferentes líderes?',
      options: O.coherence,
    },
    { prompt: 'A comunicação reduz dúvidas e retrabalho?', options: O.frequency },
  ]),
  block('communication', 'Fluxo de informação', [
    {
      prompt: 'Informações importantes chegam às pessoas certas no momento certo?',
      options: O.frequency,
    },
    { prompt: 'Existe transparência suficiente sobre decisões e mudanças?', options: O.frequency },
    {
      prompt: 'Informações costumam se perder entre níveis hierárquicos?',
      options: O.frequencyReversed,
    },
    {
      prompt: 'Existe excesso de informação dificultando a priorização?',
      options: O.frequencyReversed,
    },
    { prompt: 'As pessoas sabem onde encontrar informações confiáveis?', options: O.frequency },
  ]),
  block('communication', 'Comunicação da liderança', [
    { prompt: 'Os líderes comunicam prioridades de forma consistente?', options: O.frequency },
    {
      prompt: 'Os líderes compartilham informações relevantes de forma transparente?',
      options: O.frequency,
    },
    { prompt: 'A liderança comunica mudanças de forma antecipada?', options: O.frequency },
    { prompt: 'Os líderes adaptam a comunicação ao público?', options: O.frequency },
    { prompt: 'A comunicação da liderança gera confiança?', options: O.coherence },
  ]),
  block('communication', 'Colaboração e comunicação entre áreas', [
    { prompt: 'As áreas compartilham informações de forma eficiente?', options: O.frequency },
    { prompt: 'Existe colaboração efetiva entre departamentos?', options: O.frequency },
    { prompt: 'Problemas são comunicados rapidamente entre áreas?', options: O.frequency },
    {
      prompt: 'Os silos organizacionais dificultam a comunicação?',
      options: O.frequencyReversed,
    },
    { prompt: 'As equipes trabalham com informações alinhadas?', options: O.frequency },
  ]),
  block('communication', 'Escuta e feedback', [
    { prompt: 'As pessoas se sentem ouvidas pela organização?', options: O.frequency },
    {
      prompt: 'Existem canais eficazes para compartilhar ideias e preocupações?',
      options: O.frequency,
    },
    { prompt: 'O feedback recebido gera ações concretas?', options: O.frequency },
    { prompt: 'A organização incentiva diálogos abertos e construtivos?', options: O.frequency },
    { prompt: 'Existe segurança para expressar opiniões divergentes?', options: O.frequency },
  ]),
  block('communication', 'Canais e efetividade', [
    {
      prompt: 'Os canais de comunicação são adequados para as necessidades da organização?',
      options: O.adequacy,
    },
    {
      prompt: 'Os colaboradores utilizam os canais oficiais como principal fonte de informação?',
      options: O.frequency,
    },
    {
      prompt: 'A comunicação é excessivamente dependente de reuniões?',
      options: O.frequencyReversed,
    },
    { prompt: 'Existe equilíbrio entre comunicação formal e informal?', options: O.balance },
    { prompt: 'Os canais facilitam a tomada de decisão e a execução?', options: O.frequency },
  ]),
  block('communication', 'Comunicação para execução', [
    { prompt: 'As prioridades organizacionais são compreendidas pelas equipes?', options: O.frequency },
    { prompt: 'A comunicação contribui para a execução dos objetivos?', options: O.frequency },
    { prompt: 'As mudanças organizacionais são comunicadas com efetividade?', options: O.frequency },
    { prompt: 'A comunicação ajuda a reduzir erros e retrabalho?', options: O.frequency },
    {
      prompt: 'Você acredita que a comunicação atual apoia adequadamente o sucesso da organização?',
      options: O.npsExtended,
    },
  ]),
];

export const communicationScan: OrganizationalScanDefinition = {
  id: 'communication',
  step: 'Scan 6',
  title: 'Communication Scan',
  subtitle: 'Clareza, fluxo e eficácia da comunicação organizacional',
  intro:
    'A comunicação é um dos principais fatores que influenciam o alinhamento, a colaboração e a capacidade de execução de uma organização. Este diagnóstico compreende como informações, decisões, prioridades e conhecimentos circulam entre líderes, equipes e áreas.',
  guidance:
    'Responda com base em fatos e experiências recorrentes, evitando conclusões baseadas em situações isoladas. Amplie sua visão ouvindo diferentes níveis da organização, pesquisas e fóruns internos.',
  blocks: COMMUNICATION_BLOCKS,
};
