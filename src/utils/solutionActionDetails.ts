import type { SuggestedSolutionAction } from '../types/solutionPick';
import { fixMojibakeText } from './textEncoding';

function formatPrazoBR(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso || '—';
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export type SolutionDeliveryDetail = {
  index: number;
  label: string;
  como: string;
  responsavel: string;
  prazo: string;
  meta: string;
};

export type SolutionActionDetailSections = {
  rationale: string;
  objetivo: string;
  owner: string;
  sponsor: string;
  entregas: SolutionDeliveryDetail[];
  riscos: Array<{ risco: string; acao: string }>;
  prazoFinal: string;
  detalhes?: string;
};

function buildComo(
  evidencia: string | undefined,
  responsavel: string,
  sponsor: string
): string {
  const ev = evidencia ? fixMojibakeText(evidencia).trim() : '';
  if (ev) {
    return `Conclui-se quando: ${ev}.`;
  }
  const quem = responsavel || 'o responsável';
  const valida = sponsor ? ` e validação com ${sponsor}` : '';
  return `Execução conduzida por ${quem}${valida}, com evidência de conclusão definida no Design.`;
}

export function buildSolutionActionDetalhes(action: SuggestedSolutionAction): string {
  const { draft } = action;
  const marcos = draft.entregas
    .slice(0, 3)
    .map((e) => `${fixMojibakeText(e.entrega)} (${fixMojibakeText(e.responsavel)}, até ${formatPrazoBR(e.prazo)})`)
    .join('; ');
  const risco = draft.riscos[0];
  const objetivo = fixMojibakeText(draft.objetivoEspecifico).trim();

  const parts = [
    `Contexto do diagnóstico\nEsta ação responde a um gap de ${fixMojibakeText(action.categoria)} identificado no diagnóstico. ${fixMojibakeText(action.rationale)}`,
    objetivo
      ? `Objetivo da iniciativa\n${objetivo}`
      : '',
    marcos ? `Primeiros passos\nNa prática, comece por: ${marcos}.` : '',
    risco
      ? `Risco e mitigação\nPrincipal risco: ${fixMojibakeText(risco.risco)}. Mitigação sugerida: ${fixMojibakeText(risco.acaoTomar)}.`
      : '',
    `Governança e prazo\nHorizonte da iniciativa até ${formatPrazoBR(draft.prazoFinal)}, com owner ${fixMojibakeText(draft.owner)} e sponsor ${fixMojibakeText(draft.sponsor)}.`,
  ];

  return parts.filter(Boolean).join('\n\n');
}

/** Quebra o bloco de detalhes em seções { title, body } para exibição tipada. */
export function splitSolutionDetailSections(
  detalhes: string,
): Array<{ title?: string; body: string }> {
  const blocks = detalhes
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocks.map((block) => {
    const nl = block.indexOf('\n');
    if (nl > 0 && nl < 80) {
      const title = block.slice(0, nl).trim();
      const body = block.slice(nl + 1).trim();
      // Título curto sem pontuação final → seção tipada
      if (title && !/[.!?]$/.test(title) && title.length <= 48) {
        return { title, body: body || title };
      }
    }
    // Legado: texto corrido — tenta as mesmas quebras do Design
    const legacy = block
      .replace(/\s+(Fundamento no diagnóstico:)/gi, '\n\n$1')
      .replace(/\s+(Marcos principais:)/gi, '\n\n$1')
      .replace(/\s+(Critério de sucesso:)/gi, '\n\n$1')
      .replace(/\s+(Na prática, comece por:)/gi, '\n\n$1')
      .replace(/\s+(Principal risco:)/gi, '\n\n$1')
      .replace(/\s+(Horizonte da iniciativa)/gi, '\n\n$1')
      .replace(/\s+(Esta ação responde)/gi, '\n\n$1');
    if (legacy.includes('\n\n')) {
      return { body: legacy };
    }
    return { body: block };
  });
}


export function getSolutionActionDetails(action: SuggestedSolutionAction): SolutionActionDetailSections {
  const { draft } = action;

  const sponsor = fixMojibakeText(draft.sponsor);

  return {
    rationale: fixMojibakeText(action.rationale),
    objetivo: fixMojibakeText(draft.objetivoEspecifico),
    owner: fixMojibakeText(draft.owner),
    sponsor,
    entregas: draft.entregas.slice(0, 3).map((e, index) => {
      const responsavel = fixMojibakeText(e.responsavel);
      const prazo = formatPrazoBR(e.prazo);
      return {
        index: index + 1,
        label: fixMojibakeText(e.entrega),
        como: buildComo(e.evidencia, responsavel, sponsor),
        responsavel,
        prazo,
        meta: `${responsavel} · ${prazo}`,
      };
    }),
    riscos: draft.riscos.map((r) => ({
      risco: fixMojibakeText(r.risco),
      acao: fixMojibakeText(r.acaoTomar),
    })),
    prazoFinal: formatPrazoBR(draft.prazoFinal),
    detalhes: fixMojibakeText(action.detalhes?.trim() || buildSolutionActionDetalhes(action)),
  };
}
