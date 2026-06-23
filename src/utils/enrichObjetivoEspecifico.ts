import type { SuggestedActionCanvasDraft } from '../types';

const CATEGORY_FOCUS: Record<string, string> = {
  pessoas: 'capacitação, comportamento e engajamento das pessoas',
  processo: 'rituais, fluxos e padronização de processos',
  tecnologia: 'ferramentas, automação e infraestrutura',
  estrutura: 'papéis, governança e estrutura organizacional',
  comunicacao: 'alinhamento, narrativa e colaboração entre áreas',
  outro: 'mudança organizacional integrada',
};

function formatPrazoBR(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso || 'o prazo final definido';
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function enrichObjetivoEspecifico(
  raw: string,
  ctx: {
    titulo: string;
    descricao?: string;
    rationale?: string;
    categoria?: string;
    prazoFinal: string;
    entregas?: Array<{ entrega: string }>;
  }
): string {
  const trimmed = raw.trim();
  const descricao = (ctx.descricao ?? trimmed).trim();
  if (trimmed.length >= 200 && trimmed !== descricao) return trimmed;

  const prazo = formatPrazoBR(ctx.prazoFinal);
  const foco = CATEGORY_FOCUS[ctx.categoria ?? 'outro'] ?? CATEGORY_FOCUS.outro;
  const marcos = (ctx.entregas ?? [])
    .map((e) => e.entrega.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join('; ');

  const parts = [
    `Até ${prazo}, executar "${ctx.titulo}" com foco em ${foco}, convertendo o diagnóstico em resultado operacional concreto.`,
    descricao,
    ctx.rationale ? `Fundamento no diagnóstico: ${ctx.rationale}` : '',
    marcos ? `Marcos principais: ${marcos}.` : '',
    'Critério de sucesso: adoção sustentada pela equipe, evidências nas entregas e validação do sponsor ao encerrar o prazo.',
  ];

  return parts.filter(Boolean).join(' ');
}

export function enrichDraftObjetivo(
  draft: SuggestedActionCanvasDraft,
  meta?: { descricao?: string; rationale?: string; categoria?: string }
): SuggestedActionCanvasDraft {
  return {
    ...draft,
    objetivoEspecifico: enrichObjetivoEspecifico(draft.objetivoEspecifico, {
      titulo: draft.nomeIniciativa,
      descricao: meta?.descricao ?? draft.objetivoEspecifico,
      rationale: meta?.rationale ?? draft.insightOrigem,
      categoria: meta?.categoria,
      prazoFinal: draft.prazoFinal,
      entregas: draft.entregas,
    }),
  };
}
