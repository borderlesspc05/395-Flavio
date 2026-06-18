import type { OrganizationalScanDefinition } from '../../types/organizationalScans';
import { block, resetFieldCounter } from './builders';
import { SCAN_OPTIONS as O } from './options';

resetFieldCounter();

const EMPLOYEE_BLOCKS = [
  block('employee', 'Atração e onboarding', [
    {
      prompt: 'A organização atrai profissionais alinhados à sua cultura e valores?',
      options: O.frequency,
    },
    { prompt: 'O processo de integração prepara adequadamente novos colaboradores?', options: O.frequency },
    {
      prompt: 'Novos colaboradores entendem rapidamente seu papel e expectativas?',
      options: O.frequency,
    },
    { prompt: 'Os recursos necessários estão disponíveis desde o início?', options: O.frequency },
    {
      prompt: 'O onboarding contribui para acelerar a produtividade e o engajamento?',
      options: O.onboarding,
    },
  ]),
  block('employee', 'Ambiente de trabalho e bem-estar', [
    { prompt: 'O ambiente de trabalho favorece produtividade e colaboração?', options: O.frequency },
    { prompt: 'A carga de trabalho é sustentável na maior parte do tempo?', options: O.frequency },
    {
      prompt: 'Os colaboradores têm equilíbrio saudável entre trabalho e vida pessoal?',
      options: O.frequency,
    },
    {
      prompt: 'A organização demonstra preocupação genuína com o bem-estar das pessoas?',
      options: O.frequency,
    },
    { prompt: 'Os recursos e ferramentas disponíveis apoiam o trabalho diário?', options: O.quality },
  ]),
  block('employee', 'Liderança e relacionamentos', [
    { prompt: 'Os colaboradores confiam em seus líderes diretos?', options: O.frequency },
    { prompt: 'Os líderes demonstram interesse genuíno pelas pessoas?', options: O.frequency },
    { prompt: 'Existe respeito nas relações de trabalho?', options: O.frequency },
    { prompt: 'Os conflitos são tratados de forma justa e construtiva?', options: O.frequency },
    { prompt: 'Os colaboradores sentem que suas opiniões são consideradas?', options: O.frequency },
  ]),
  block('employee', 'Desenvolvimento e crescimento', [
    { prompt: 'Existem oportunidades claras de desenvolvimento profissional?', options: O.frequency },
    {
      prompt: 'Os colaboradores recebem feedback que contribui para seu crescimento?',
      options: O.frequency,
    },
    { prompt: 'A organização investe na aprendizagem contínua?', options: O.frequency },
    {
      prompt: 'As oportunidades de carreira são percebidas como justas e acessíveis?',
      options: O.frequency,
    },
    {
      prompt: 'As pessoas conseguem visualizar um futuro dentro da organização?',
      options: O.frequency,
    },
  ]),
  block('employee', 'Reconhecimento e recompensa', [
    { prompt: 'Bons desempenhos são reconhecidos de forma consistente?', options: O.frequency },
    { prompt: 'Os critérios de reconhecimento são percebidos como justos?', options: O.frequency },
    { prompt: 'As recompensas incentivam os comportamentos desejados?', options: O.frequency },
    { prompt: 'Os colaboradores sentem-se valorizados pelo trabalho que realizam?', options: O.frequency },
    { prompt: 'O reconhecimento vai além de recompensas financeiras?', options: O.frequency },
  ]),
  block('employee', 'Engajamento e pertencimento', [
    { prompt: 'Os colaboradores sentem orgulho de trabalhar na organização?', options: O.frequency },
    { prompt: 'Existe um forte senso de pertencimento entre as equipes?', options: O.frequency },
    { prompt: 'As pessoas entendem o propósito da organização?', options: O.frequency },
    { prompt: 'O trabalho realizado é percebido como significativo?', options: O.frequency },
    {
      prompt: 'Os colaboradores recomendariam a organização como um bom lugar para trabalhar?',
      options: O.nps,
    },
  ]),
  block('employee', 'Retenção e advocacy', [
    { prompt: 'A organização consegue reter seus principais talentos?', options: O.quality },
    { prompt: 'Os motivos de desligamento são compreendidos e tratados?', options: O.frequency },
    {
      prompt: 'Os colaboradores enxergam perspectivas de longo prazo na organização?',
      options: O.frequency,
    },
    {
      prompt: 'A experiência do colaborador evoluiu positivamente nos últimos anos?',
      options: O.evolution,
    },
    {
      prompt:
        'Você acredita que a organização oferece uma experiência superior à maioria dos empregadores do mercado?',
      options: O.npsExtended,
    },
  ]),
];

export const employeeExperienceScan: OrganizationalScanDefinition = {
  id: 'employeeExperience',
  step: 'Scan 4',
  title: 'Employee Experience Scan',
  subtitle: 'Jornada, engajamento e retenção de talentos',
  intro:
    'A experiência do colaborador influencia diretamente o engajamento, a produtividade, a retenção de talentos e a capacidade da organização de alcançar seus objetivos.',
  guidance:
    'Responda com base em experiências recorrentes e evidências observáveis. Considere diferentes perspectivas por meio de líderes, equipes e pesquisas internas.',
  blocks: EMPLOYEE_BLOCKS,
};
