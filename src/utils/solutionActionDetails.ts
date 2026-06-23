import type { SuggestedSolutionAction } from '../types/solutionPick';

function formatPrazoBR(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso || '—';
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export type SolutionActionDetailSections = {
  rationale: string;
  objetivo: string;
  entregas: Array<{ label: string; meta: string }>;
  riscos: Array<{ risco: string; acao: string }>;
  prazoFinal: string;
  detalhes?: string;
};

export function buildSolutionActionDetalhes(action: SuggestedSolutionAction): string {
  const { draft } = action;
  const marcos = draft.entregas
    .map((e) => `${e.entrega} (${e.responsavel}, até ${formatPrazoBR(e.prazo)})`)
    .join('; ');
  const risco = draft.riscos[0];

  const parts = [
    `Esta ação responde a um gap de ${action.categoria} identificado no diagnóstico. ${action.rationale}`,
    draft.objetivoEspecifico,
    marcos ? `Na prática, comece por: ${marcos}.` : '',
    risco ? `Principal risco: ${risco.risco}. Mitigação sugerida: ${risco.acaoTomar}.` : '',
    `Horizonte da iniciativa até ${formatPrazoBR(draft.prazoFinal)}, com owner ${draft.owner} e sponsor ${draft.sponsor}.`,
  ];

  return parts.filter(Boolean).join(' ');
}

export function getSolutionActionDetails(action: SuggestedSolutionAction): SolutionActionDetailSections {
  const { draft } = action;

  return {
    rationale: action.rationale,
    objetivo: draft.objetivoEspecifico,
    entregas: draft.entregas.map((e) => ({
      label: e.entrega,
      meta: `${e.responsavel} · ${formatPrazoBR(e.prazo)}`,
    })),
    riscos: draft.riscos.map((r) => ({
      risco: r.risco,
      acao: r.acaoTomar,
    })),
    prazoFinal: formatPrazoBR(draft.prazoFinal),
    detalhes: action.detalhes?.trim() || buildSolutionActionDetalhes(action),
  };
}
