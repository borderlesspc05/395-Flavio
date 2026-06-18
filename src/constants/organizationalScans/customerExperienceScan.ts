import type { OrganizationalScanDefinition } from '../../types/organizationalScans';
import { block, resetFieldCounter } from './builders';
import { SCAN_OPTIONS as O } from './options';

resetFieldCounter();

const CUSTOMER_BLOCKS = [
  block('customer', 'Conhecimento do cliente', [
    {
      prompt: 'A organização compreende claramente as necessidades dos seus clientes?',
      options: O.frequency,
    },
    { prompt: 'As decisões consideram o impacto para o cliente?', options: O.frequency },
    { prompt: 'Existe clareza sobre quem são os principais perfis de clientes?', options: O.coherence },
    {
      prompt: 'A organização utiliza dados e feedbacks para entender os clientes?',
      options: O.frequency,
    },
    { prompt: 'O cliente é considerado uma prioridade estratégica?', options: O.frequency },
  ]),
  block('customer', 'Jornada do cliente', [
    { prompt: 'A jornada do cliente está claramente mapeada?', options: O.journeyMap },
    { prompt: 'Os principais pontos de contato são monitorados?', options: O.frequency },
    { prompt: 'Existe consistência na experiência entre canais e áreas?', options: O.coherence },
    { prompt: 'Os processos facilitam ou dificultam a jornada do cliente?', options: O.processImpact },
    {
      prompt: 'A organização identifica rapidamente pontos de fricção na jornada?',
      options: O.frequency,
    },
  ]),
  block('customer', 'Qualidade da experiência', [
    {
      prompt: 'A experiência entregue atende consistentemente às expectativas dos clientes?',
      options: O.frequency,
    },
    {
      prompt: 'Os clientes recebem atendimento consistente independentemente de quem os atende?',
      options: O.frequency,
    },
    { prompt: 'A organização entrega valor além do produto ou serviço?', options: O.frequency },
    {
      prompt: 'Os clientes percebem diferenciação em relação aos concorrentes?',
      options: O.coherence,
    },
    { prompt: 'A experiência do cliente é tratada como vantagem competitiva?', options: O.frequency },
  ]),
  block('customer', 'Resolução de problemas', [
    { prompt: 'Reclamações são resolvidas rapidamente?', options: O.frequency },
    {
      prompt: 'Os colaboradores possuem autonomia para resolver problemas dos clientes?',
      options: O.frequency,
    },
    { prompt: 'A organização aprende com falhas recorrentes?', options: O.frequency },
    {
      prompt: 'Os clientes sentem que seus problemas são realmente compreendidos?',
      options: O.frequency,
    },
    { prompt: 'Problemas recorrentes são eliminados na causa raiz?', options: O.frequency },
  ]),
  block('customer', 'Cultura centrada no cliente', [
    {
      prompt: 'Os líderes demonstram preocupação genuína com a experiência do cliente?',
      options: O.frequency,
    },
    { prompt: 'O cliente influencia decisões importantes da organização?', options: O.frequency },
    { prompt: 'As equipes colaboram para resolver necessidades dos clientes?', options: O.frequency },
    { prompt: 'Os comportamentos voltados ao cliente são reconhecidos?', options: O.frequency },
    { prompt: 'A organização coloca o cliente no centro de suas prioridades?', options: O.frequency },
  ]),
  block('customer', 'Escuta e melhoria contínua', [
    { prompt: 'A organização coleta feedback regularmente?', options: O.frequency },
    { prompt: 'O feedback dos clientes gera mudanças reais?', options: O.frequency },
    { prompt: 'Os indicadores de experiência são acompanhados regularmente?', options: O.frequency },
    { prompt: 'Existe um processo estruturado para melhoria da experiência?', options: O.maturity },
    { prompt: 'A organização reage rapidamente aos sinais dos clientes?', options: O.speed },
  ]),
  block('customer', 'Fidelização e advocacy', [
    { prompt: 'Os clientes demonstram lealdade à organização?', options: O.coherence },
    { prompt: 'Clientes retornam ou compram novamente?', options: O.frequency },
    { prompt: 'Clientes recomendam a organização para outras pessoas?', options: O.frequency },
    {
      prompt: 'A experiência contribui diretamente para os resultados financeiros?',
      options: O.onboarding,
    },
    {
      prompt: 'Você acredita que a organização entrega uma experiência superior à média do mercado?',
      options: O.npsExtended,
    },
  ]),
];

export const customerExperienceScan: OrganizationalScanDefinition = {
  id: 'customerExperience',
  step: 'Scan 3',
  title: 'Customer Experience Scan',
  subtitle: 'Jornada, qualidade e fidelização do cliente',
  intro:
    'A experiência do cliente é um dos principais fatores de diferenciação e crescimento sustentável. Este diagnóstico avalia como a empresa compreende, atende e evolui a jornada de seus clientes.',
  guidance:
    'Responda com base em fatos, dados e padrões observados ao longo do tempo. Complemente com feedbacks de clientes, pesquisas e indicadores operacionais sempre que possível.',
  blocks: CUSTOMER_BLOCKS,
};
