import type { OrganizationalScanDefinition } from '../../types/organizationalScans';
import { customBlock } from './builders';

export const swotAnalysisScan: OrganizationalScanDefinition = {
  id: 'swot',
  step: 'Scan SWOT',
  title: 'SWOT Analysis Scan',
  subtitle: 'Fortalezas, fraquezas, oportunidades e ameaças',
  estimatedMinutes: 15,
  intro:
    'A análise SWOT é uma ferramenta estratégica que ajuda a compreender os fatores internos e externos que influenciam o desempenho de uma equipe, área ou organização. Este diagnóstico organiza essas percepções em quatro perspectivas — Fortalezas, Fraquezas, Oportunidades e Ameaças — facilitando a definição de prioridades e ações futuras.',
  guidance:
    'Este Scan permite utilizar uma análise SWOT já realizada ou construí-la diretamente na plataforma. Se você já possui uma SWOT pronta, basta copiar e colar o conteúdo nos campos abaixo. Caso contrário, utilize as perguntas orientadoras para elaborar sua análise de forma estruturada.\n\nEste Scan pode substituir o Canvas completo para análises estratégicas iniciais. Responda no seu ritmo e conclua quando estiver pronto. Não é necessário preencher os demais Scans.',
  blocks: [
    customBlock('swot_note', 'Como preencher', [
      {
        id: 'swot_paste_note',
        prompt:
          'Você pode copiar e colar uma análise SWOT existente ou preencher cada seção manualmente. Use os campos abaixo — cada um aceita textos longos.',
        type: 'text',
        required: false,
        rows: 2,
        placeholder: 'Opcional: notas gerais sobre o contexto desta SWOT…',
      },
    ]),
    customBlock('swot_strengths', '1. Strengths (Fortalezas)', [
      {
        id: 'swot_strengths',
        prompt:
          'Quais são os principais pontos fortes da equipe, área ou organização que contribuem para seu sucesso e devem ser preservados ou potencializados?',
        type: 'text',
        required: true,
        rows: 12,
        placeholder: 'Cole aqui sua análise de Fortalezas ou escreva sua resposta…',
      },
    ]),
    customBlock('swot_weaknesses', '2. Weaknesses (Fraquezas)', [
      {
        id: 'swot_weaknesses',
        prompt:
          'Quais limitações, processos, comportamentos ou recursos internos dificultam melhores resultados e precisam ser melhorados?',
        type: 'text',
        required: true,
        rows: 12,
        placeholder: 'Cole aqui sua análise de Fraquezas ou escreva sua resposta…',
      },
    ]),
    customBlock('swot_opportunities', '3. Opportunities (Oportunidades)', [
      {
        id: 'swot_opportunities',
        prompt:
          'Quais oportunidades externas, tendências, mudanças de mercado ou iniciativas podem ser aproveitadas para acelerar resultados?',
        type: 'text',
        required: true,
        rows: 12,
        placeholder: 'Cole aqui sua análise de Oportunidades ou escreva sua resposta…',
      },
    ]),
    customBlock('swot_threats', '4. Threats (Ameaças)', [
      {
        id: 'swot_threats',
        prompt:
          'Quais riscos, fatores externos, mudanças ou desafios podem comprometer o desempenho ou os resultados futuros caso não sejam tratados?',
        type: 'text',
        required: true,
        rows: 12,
        placeholder: 'Cole aqui sua análise de Ameaças ou escreva sua resposta…',
      },
    ]),
  ],
};
