import type { EvolutionLoopResult } from '../types/evolutionLoop';
import { ORGANIZATIONAL_SCANS } from '../constants/organizationalScans';

export type ScanSuggestion = {
  id: string;
  title: string;
  reason: string;
};

/** Suggests focused scans from the next-wave focus text. */
export function suggestScansForFocus(focus: string): ScanSuggestion[] {
  const text = focus.toLowerCase();
  const picks: ScanSuggestion[] = [];

  const add = (id: string, reason: string) => {
    const scan = ORGANIZATIONAL_SCANS.find((s) => s.id === id);
    if (!scan || picks.some((p) => p.id === id)) return;
    picks.push({ id: scan.id, title: scan.title, reason });
  };

  if (/cultura|valores|cultura organizacional/.test(text)) {
    add('culture', 'O foco da nova onda aponta para cultura.');
  }
  if (/lideran[cç]a|gest[aã]o|managers?|leaders?/.test(text)) {
    add('leadership', 'Há sinais de liderança a aprofundar neste ciclo.');
  }
  if (/cliente|customer|experi[eê]ncia do cliente|cx\b/.test(text)) {
    add('customerExperience', 'Priorize a experiência do cliente neste ciclo.');
  }
  if (/colaborador|employee|experi[eê]ncia do colaborador|ex\b|engajamento/.test(text)) {
    add('employeeExperience', 'O aprendizado aponta para experiência do colaborador.');
  }
  if (/turnover|reten[cç][aã]o|sa[ií]da|attrition/.test(text)) {
    add('turnover', 'Retenção e turnover merecem um scan dedicado.');
  }
  if (/comunica[cç][aã]o|alinhamento de mensagem|silos?/.test(text)) {
    add('communication', 'Comunicação e silos aparecem no aprendizado anterior.');
  }
  if (/estrat[eé]gia|alinhamento estrat|prioridades|okr/.test(text)) {
    add('strategicAlignment', 'Alinhamento estratégico é o fio da nova onda.');
  }
  if (/swot|ameaça|oportunidade|for[cç]a|fraqueza/.test(text)) {
    add('swot', 'Um SWOT rápido ajuda a reenquadrar o contexto.');
  }

  if (picks.length === 0) {
    add('swot', 'Comece por um SWOT para revalidar o cenário.');
    add('strategicAlignment', 'Ou foque o alinhamento estratégico da nova onda.');
  }

  return picks.slice(0, 3);
}

export function buildCycleBriefingText(
  evolution: EvolutionLoopResult,
  previousCycleNumber: number,
  currentCycleNumber: number
): string {
  const prevLabel = `${previousCycleNumber}.0`;
  const nextLabel = `${currentCycleNumber}.0`;
  const suggestions = suggestScansForFocus(evolution.nextWave.focus);

  const lines = [
    `Versão ${nextLabel} — Briefing do ciclo`,
    `O que aprendemos no ciclo ${prevLabel}`,
    '',
    evolution.summary.trim(),
    '',
    `Foco recomendado para a versão ${nextLabel}: ${evolution.nextWave.title}`,
    evolution.nextWave.focus,
    '',
    evolution.nextWave.rationale.trim(),
    '',
    'Continuar',
    ...(evolution.continuar.length
      ? evolution.continuar.map((p) => `• ${p.practice}${p.rationale ? ` — ${p.rationale}` : ''}`)
      : ['• (nenhuma prática destacada)']),
    '',
    'Ajustar',
    ...(evolution.ajustar.length
      ? evolution.ajustar.map((p) => `• ${p.practice}${p.rationale ? ` — ${p.rationale}` : ''}`)
      : ['• (nenhum ajuste prioritário)']),
    '',
    'Abandonar',
    ...(evolution.abandonar.length
      ? evolution.abandonar.map((p) => `• ${p.practice}${p.rationale ? ` — ${p.rationale}` : ''}`)
      : ['• (nenhuma prática para encerrar)']),
    '',
    'Diagnósticos sugeridos neste ciclo',
    ...suggestions.map((s) => `• ${s.title}: ${s.reason}`),
    '',
    'Você também pode abrir o diagnóstico completo (canvas Sprint Waves) se precisar de profundidade máxima.',
  ];

  return lines.join('\n');
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
