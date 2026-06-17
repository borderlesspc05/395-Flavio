import { buildDiagnosticContext } from '../constants/diagnosticFlow';
import { computeEvolutionIndex } from './evolutionIndex';
import type { InitialFormData } from '../types';

/** Laudo dissertativo em formato legível (≈ A4) a partir do diagnóstico preenchido. */
export function buildDiagnosticLaudo(data: InitialFormData, projectLabel?: string): string {
  const evolution = computeEvolutionIndex(data);
  const context = buildDiagnosticContext(data);

  const lines: string[] = [
    'LAUDO DE DIAGNÓSTICO ORGANIZACIONAL',
    'Magnus Waves · Human-to-Business Canvas',
    '',
    `Projeto: ${projectLabel?.trim() || 'Ciclo ativo'}`,
    `Data de referência: ${new Date().toLocaleDateString('pt-BR', { dateStyle: 'long' })}`,
    '',
    '1. SÍNTESE EXECUTIVA',
    '',
  ];

  if (evolution) {
    lines.push(
      `O Evolution Index deste ciclo é ${evolution.score}/100 — status "${evolution.label}". ` +
        'O índice consolida transferência, aprendizagem, fricções de contexto e sistema, gestão e entrada de talentos reportados no questionário.'
    );
  } else {
    lines.push(
      'Os scorecards consolidados (etapa 1.5) ainda não foram preenchidos. O laudo abaixo reflete as respostas disponíveis até o momento.'
    );
  }

  const bloqueio = String(data.bloqueioPrincipalResumo ?? '').trim();
  if (bloqueio) {
    lines.push('', `Leitura central: ${bloqueio}`);
  }

  lines.push(
    '',
    '2. RELATÓRIO DETALHADO DO QUESTIONÁRIO',
    '',
    context || '(Nenhuma resposta estruturada registrada ainda.)',
    '',
    '3. RECOMENDAÇÃO',
    ''
  );

  if (evolution?.band === 'attention') {
    lines.push(
      'Priorize desbloqueios de contexto, gestão e sistema antes de ampliar treinamentos ou abrir frentes paralelas sem dono claro.'
    );
  } else if (evolution?.band === 'evolving') {
    lines.push(
      'O diagnóstico indica evolução em curso. Valide os planos no Design, construa com a IA e publique na Difusão com evidências periódicas.'
    );
  } else if (evolution?.band === 'mature') {
    lines.push(
      'Alta maturidade diagnóstica. Consolide execução na Difusão, sign-off das iniciativas e avaliação de impacto no Domínio.'
    );
  } else {
    lines.push('Complete o diagnóstico e os scorecards para fechar o laudo com índice de maturidade.');
  }

  return lines.join('\n');
}
