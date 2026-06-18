import type { OrganizationalScanDefinition } from '../../types/organizationalScans';
import { block, resetFieldCounter } from './builders';
import { SCAN_OPTIONS as O } from './options';

resetFieldCounter();

const CULTURE_BLOCKS = [
  block('culture', 'Cultura declarada vs cultura real', [
    { prompt: 'Os valores organizacionais são claramente conhecidos pelos colaboradores?', options: O.frequency },
    { prompt: 'Os comportamentos observados no dia a dia refletem os valores declarados?', options: O.frequency },
    { prompt: 'Existe coerência entre o discurso da liderança e suas ações?', options: O.coherence },
    {
      prompt: 'O que mais influencia o sucesso profissional na organização?',
      options: ['Relacionamentos', 'Resultados', 'Tempo de casa', 'Política interna', 'Mérito e competências'],
    },
    { prompt: 'Os comportamentos inadequados são corrigidos de forma consistente?', options: O.frequency },
  ]),
  block('culture', 'Comportamentos dominantes', [
    {
      prompt: 'Quando ocorre um problema, a reação mais comum é:',
      options: [
        'Procurar culpados',
        'Ignorar',
        'Escalar para liderança',
        'Resolver em equipe',
        'Aprender e melhorar o processo',
      ],
    },
    { prompt: 'As pessoas assumem responsabilidade pelos resultados?', options: O.frequency },
    { prompt: 'Os acordos e compromissos são cumpridos?', options: O.frequency },
    {
      prompt: 'O erro normalmente é tratado como:',
      options: ['Punição', 'Exposição', 'Indiferença', 'Aprendizado', 'Oportunidade de melhoria'],
    },
    {
      prompt: 'Questionar decisões é visto como:',
      options: ['Ameaça', 'Desrespeito', 'Desconfortável', 'Aceitável', 'Valorizado'],
    },
  ]),
  block('culture', 'Liderança e influência cultural', [
    { prompt: 'Os líderes praticam os comportamentos que esperam das equipes?', options: O.frequency },
    {
      prompt: 'As decisões da liderança são percebidas como coerentes?',
      options: ['Muito incoerentes', 'Incoerentes', 'Neutras', 'Coerentes', 'Muito coerentes'],
    },
    { prompt: 'Os líderes inspiram confiança?', options: O.frequency },
    { prompt: 'A liderança reforça a cultura desejada?', options: O.amount },
    {
      prompt: 'Em situações de pressão, a liderança:',
      options: [
        'Entra em modo comando e controle',
        'Centraliza decisões',
        'Mantém estabilidade',
        'Colabora com equipes',
        'Usa a situação para desenvolver pessoas',
      ],
    },
  ]),
  block('culture', 'Segurança psicológica e confiança', [
    { prompt: 'Você se sente seguro para expressar opiniões diferentes?', options: O.frequency },
    { prompt: 'Existe medo de cometer erros?', options: O.fear },
    { prompt: 'É seguro discordar da liderança?', options: O.frequency },
    { prompt: 'Os conflitos são tratados de forma construtiva?', options: O.frequency },
    { prompt: 'Existe confiança entre equipes e liderança?', options: O.coherence },
  ]),
  block('culture', 'Colaboração e silos', [
    { prompt: 'As áreas colaboram entre si?', options: O.frequency },
    { prompt: 'O compartilhamento de conhecimento acontece naturalmente?', options: O.frequency },
    { prompt: 'Existem silos que prejudicam resultados?', options: O.silos },
    { prompt: 'Os objetivos organizacionais são compartilhados entre áreas?', options: O.frequency },
    { prompt: 'A organização aprende com boas práticas internas?', options: O.frequency },
  ]),
  block('culture', 'Aprendizagem e adaptabilidade', [
    { prompt: 'Novas ideias são bem recebidas?', options: O.frequency },
    { prompt: 'A organização aprende com erros?', options: O.frequency },
    { prompt: 'Mudanças costumam ser aceitas?', options: O.frequency },
    {
      prompt: 'Existe incentivo para inovação?',
      options: ['Muito baixo', 'Baixo', 'Moderado', 'Alto', 'Muito alto'],
    },
    { prompt: 'A organização se adapta rapidamente às mudanças do mercado?', options: O.speed },
  ]),
  block('culture', 'Performance e accountability', [
    { prompt: 'As expectativas de performance são claras?', options: O.frequency },
    { prompt: 'As pessoas entendem como contribuem para os resultados?', options: O.frequency },
    { prompt: 'Bons resultados são reconhecidos?', options: O.frequency },
    { prompt: 'A organização recompensa os comportamentos corretos?', options: O.frequency },
    {
      prompt: 'Você recomendaria esta organização para alguém que admira?',
      options: O.nps,
    },
  ]),
];

export const cultureScan: OrganizationalScanDefinition = {
  id: 'culture',
  step: 'Scan 1',
  title: 'Cultura Organizacional',
  subtitle: 'Diagnóstico da cultura vivida no dia a dia',
  intro:
    'A cultura organizacional influencia diretamente a forma como as pessoas tomam decisões, colaboram, lideram, aprendem e entregam resultados. O objetivo deste diagnóstico é compreender a cultura real da organização, aquela vivida no dia a dia, e identificar fatores que impulsionam ou limitam a performance.',
  guidance:
    'Responda pensando em como a organização funciona na maior parte do tempo, evitando se basear apenas em situações isoladas ou excepcionais. Quanto mais ampla e equilibrada for a visão considerada, mais preciso será o diagnóstico.',
  blocks: CULTURE_BLOCKS,
};
