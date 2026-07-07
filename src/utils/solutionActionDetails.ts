import type { SuggestedSolutionAction } from '../types/solutionPick';
import { fixMojibakeText } from './textEncoding';

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
    .slice(0, 3)
    .map((e) => `${fixMojibakeText(e.entrega)} (${fixMojibakeText(e.responsavel)}, até ${formatPrazoBR(e.prazo)})`)
    .join('; ');
  const risco = draft.riscos[0];

  const parts = [
    `Esta ação responde a um gap de ${fixMojibakeText(action.categoria)} identificado no diagnóstico. ${fixMojibakeText(action.rationale)}`,
    fixMojibakeText(draft.objetivoEspecifico),
    marcos ? `Na prática, comece por: ${marcos}.` : '',
    risco ? `Principal risco: ${fixMojibakeText(risco.risco)}. Mitigação sugerida: ${fixMojibakeText(risco.acaoTomar)}.` : '',
    `Horizonte da iniciativa até ${formatPrazoBR(draft.prazoFinal)}, com owner ${fixMojibakeText(draft.owner)} e sponsor ${fixMojibakeText(draft.sponsor)}.`,
  ];

  return parts.filter(Boolean).join(' ');
}

export function getSolutionActionDetails(action: SuggestedSolutionAction): SolutionActionDetailSections {
  const { draft } = action;

  return {
    rationale: fixMojibakeText(action.rationale),
    objetivo: fixMojibakeText(draft.objetivoEspecifico),
    entregas: draft.entregas.slice(0, 3).map((e) => ({
      label: fixMojibakeText(e.entrega),
      meta: `${fixMojibakeText(e.responsavel)} · ${formatPrazoBR(e.prazo)}`,
    })),
    riscos: draft.riscos.map((r) => ({
      risco: fixMojibakeText(r.risco),
      acao: fixMojibakeText(r.acaoTomar),
    })),
    prazoFinal: formatPrazoBR(draft.prazoFinal),
    detalhes: fixMojibakeText(action.detalhes?.trim() || buildSolutionActionDetalhes(action)),
  };
}
