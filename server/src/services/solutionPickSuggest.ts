import { chatCompletion, getDefaultModel, isLlmNotConfiguredError } from './llm';
import { retrieveRelevantContextDetailed } from './rag';

export interface SuggestedSolutionActionDraft {
  id: string;
  titulo: string;
  descricao: string;
  score: number;
  categoria: string;
  rationale: string;
  detalhes?: string;
  draft: {
    nomeIniciativa: string;
    objetivoEspecifico: string;
    owner: string;
    sponsor: string;
    prazoFinal: string;
    entregas: Array<{
      entrega: string;
      responsavel: string;
      prazo: string;
      status?: string;
      evidencia?: string;
    }>;
    riscos: Array<{ risco: string; acaoTomar: string }>;
    insightOrigem?: string;
  };
}

export type SolutionPickSuggestResult = {
  suggestions: SuggestedSolutionActionDraft[];
  companySummary?: string;
  companySituation?: string;
  demoMode?: boolean;
  demoReason?: string;
  usedRag?: boolean;
  ragChunkCount?: number;
};

function defaultPrazo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

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

function enrichObjetivoEspecifico(
  raw: string,
  ctx: {
    titulo: string;
    descricao: string;
    rationale: string;
    categoria: string;
    prazoFinal: string;
    entregas: Array<{ entrega: string }>;
  }
): string {
  const trimmed = raw.trim();
  const descricao = ctx.descricao.trim();
  if (trimmed.length >= 200 && trimmed !== descricao) return trimmed;

  const prazo = formatPrazoBR(ctx.prazoFinal);
  const foco = CATEGORY_FOCUS[ctx.categoria] ?? CATEGORY_FOCUS.outro;
  const marcos = ctx.entregas
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

function buildDetalhes(ctx: {
  titulo: string;
  descricao: string;
  rationale: string;
  categoria: string;
  objetivoEspecifico: string;
  prazoFinal: string;
  owner: string;
  sponsor: string;
  entregas: Array<{ entrega: string; responsavel: string; prazo: string }>;
  riscos: Array<{ risco: string; acaoTomar: string }>;
}): string {
  const marcos = ctx.entregas
    .map((e) => `${e.entrega} (${e.responsavel}, até ${formatPrazoBR(e.prazo)})`)
    .join('; ');
  const risco = ctx.riscos[0];
  const parts = [
    `Esta ação responde a um gap de ${ctx.categoria} identificado no diagnóstico. ${ctx.rationale}`,
    ctx.objetivoEspecifico,
    marcos ? `Na prática, comece por: ${marcos}.` : '',
    risco ? `Principal risco: ${risco.risco}. Mitigação sugerida: ${risco.acaoTomar}.` : '',
    `Horizonte da iniciativa até ${formatPrazoBR(ctx.prazoFinal)}, com owner ${ctx.owner} e sponsor ${ctx.sponsor}.`,
  ];
  return parts.filter(Boolean).join(' ');
}

function defaultCompanySummary(): { companySummary: string; companySituation: string } {
  return {
    companySummary:
      'Resumo executivo indisponível no modo demonstração. Com IA configurada, a síntese será gerada a partir do diagnóstico completo da empresa.',
    companySituation:
      'Situação organizacional não sintetizada — complete o diagnóstico ou configure a chave de IA no servidor.',
  };
}

function defaultSuggestions(): SuggestedSolutionActionDraft[] {
  const samples = [
    {
      titulo: 'Treinar a equipe em resolução de problemas',
      descricao: 'Programa prático de problem solving alinhado aos gaps do Team Scan.',
      score: 88,
      categoria: 'pessoas',
      rationale: 'Alto impacto quando o gap humano envolve autonomia e método de decisão.',
    },
    {
      titulo: 'Comprar um computador novo para o recepcionista do balcão',
      descricao: 'Substituir equipamento que gera fila e retrabalho no atendimento.',
      score: 62,
      categoria: 'tecnologia',
      rationale: 'Quick win operacional se o System Scan apontar fricção de ferramentas.',
    },
    {
      titulo: 'Fazer uma palestra motivacional',
      descricao: 'Sessão de engajamento para alinhar narrativa e energia da equipe.',
      score: 35,
      categoria: 'comunicacao',
      rationale: 'Baixa probabilidade de impacto sustentável isoladamente — use com cautela.',
    },
    {
      titulo: 'Redesenhar o ritual semanal de prioridades',
      descricao: 'Cadência fixa de decisão com sponsor e donos de entrega.',
      score: 81,
      categoria: 'processo',
      rationale: 'Estabiliza execução quando há dispersão entre áreas.',
    },
    {
      titulo: 'Mentoria para gestores de primeira linha',
      descricao: 'Coaching em feedback, delegação e remoção de bloqueios.',
      score: 79,
      categoria: 'pessoas',
      rationale: 'Priorize quando Management Enablement Score estiver baixo.',
    },
    {
      titulo: 'Padronizar onboarding de novos talentos',
      descricao: 'Trilha de 30 dias com buddy, checklists e evidências.',
      score: 74,
      categoria: 'estrutura',
      rationale: 'Reduz tempo de ramp-up e erros recorrentes.',
    },
    {
      titulo: 'Automatizar relatório operacional diário',
      descricao: 'Dashboard simples alimentado pelas fontes já existentes.',
      score: 70,
      categoria: 'tecnologia',
      rationale: 'Diminui carga cognitiva e retrabalho manual.',
    },
    {
      titulo: 'Workshop de alinhamento cross-funcional',
      descricao: 'Sessão para destravar handoffs entre áreas críticas.',
      score: 67,
      categoria: 'comunicacao',
      rationale: 'Útil quando o gap está na colaboração entre silos.',
    },
    {
      titulo: 'Revisar indicadores e metas do time',
      descricao: 'Reancorar métricas com o desired state do Gap Scan.',
      score: 76,
      categoria: 'processo',
      rationale: 'Conecta esforço diário ao resultado de negócio.',
    },
    {
      titulo: 'Plano de contingência para gargalo crítico',
      descricao: 'Ações de 14 dias para o processo que mais gera erro ou atraso.',
      score: 84,
      categoria: 'processo',
      rationale: 'Alto score quando há vermelho recorrente no System Scan.',
    },
  ];

  return samples.map((s, i) => {
    const prazoFinal = defaultPrazo(60 + i * 7);
    const entregas = [
      {
        entrega: `Planejar escopo: ${s.titulo}`,
        responsavel: 'Owner',
        prazo: defaultPrazo(14),
        status: 'amarelo',
        evidencia: 'Documento de alinhamento',
      },
      {
        entrega: 'Executar piloto e medir resultado',
        responsavel: 'Equipe núcleo',
        prazo: defaultPrazo(45),
        status: 'amarelo',
      },
    ];

    const riscos = [
      {
        risco: 'Baixa adesão das partes envolvidas',
        acaoTomar: 'Ritual semanal de decisão com sponsor',
      },
    ];
    const objetivoEspecifico = enrichObjetivoEspecifico(s.descricao, {
      titulo: s.titulo,
      descricao: s.descricao,
      rationale: s.rationale,
      categoria: s.categoria,
      prazoFinal,
      entregas,
    });

    return {
      id: `sol-${i + 1}`,
      ...s,
      detalhes: buildDetalhes({
        titulo: s.titulo,
        descricao: s.descricao,
        rationale: s.rationale,
        categoria: s.categoria,
        objetivoEspecifico,
        prazoFinal,
        owner: 'Líder da iniciativa',
        sponsor: 'Sponsor executivo',
        entregas,
        riscos,
      }),
      draft: {
        nomeIniciativa: s.titulo,
        objetivoEspecifico,
        owner: 'Líder da iniciativa',
        sponsor: 'Sponsor executivo',
        prazoFinal,
        entregas,
        riscos,
        insightOrigem: s.rationale,
      },
    };
  });
}

function normalizeCategory(value: unknown): string {
  const v = String(value ?? 'outro').toLowerCase();
  const allowed = ['pessoas', 'processo', 'tecnologia', 'estrutura', 'comunicacao', 'outro'];
  return allowed.includes(v) ? v : 'outro';
}

function normalizeAction(raw: unknown, index: number): SuggestedSolutionActionDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const titulo = String(o.titulo ?? o.title ?? '').trim();
  if (!titulo) return null;

  const draftRaw = (o.draft && typeof o.draft === 'object' ? o.draft : o) as Record<string, unknown>;
  const entregasRaw = Array.isArray(draftRaw.entregas) ? draftRaw.entregas : [];
  const riscosRaw = Array.isArray(draftRaw.riscos) ? draftRaw.riscos : [];

  const entregas = entregasRaw.slice(0, 5).map((e) => {
    const row = (e && typeof e === 'object' ? e : {}) as Record<string, unknown>;
    return {
      entrega: String(row.entrega ?? '').trim(),
      responsavel: String(row.responsavel ?? 'Owner').trim(),
      prazo: String(row.prazo ?? defaultPrazo(21)).trim(),
      status: String(row.status ?? 'amarelo'),
      evidencia: row.evidencia ? String(row.evidencia) : undefined,
    };
  }).filter((e) => e.entrega);

  const riscos = riscosRaw.slice(0, 3).map((r) => {
    const row = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
    return {
      risco: String(row.risco ?? '').trim(),
      acaoTomar: String(row.acaoTomar ?? row.acao ?? '').trim(),
    };
  }).filter((r) => r.risco);

  const score = Math.min(100, Math.max(0, Number(o.score ?? 50) || 50));
  const descricao = String(o.descricao ?? o.description ?? titulo).trim();
  const rationale = String(o.rationale ?? o.motivo ?? '').trim() || 'Sugerido com base no diagnóstico da empresa.';
  const prazoFinal = String(draftRaw.prazoFinal ?? defaultPrazo(90)).trim();
  const owner = String(draftRaw.owner ?? 'Líder da iniciativa').trim();
  const sponsor = String(draftRaw.sponsor ?? 'Sponsor executivo').trim();
  const categoria = normalizeCategory(o.categoria ?? o.category);
  const objetivoEspecifico = enrichObjetivoEspecifico(
    String(draftRaw.objetivoEspecifico ?? descricao).trim(),
    {
      titulo,
      descricao,
      rationale,
      categoria,
      prazoFinal,
      entregas: entregas.length ? entregas : [{ entrega: `Primeira entrega: ${titulo}` }],
    }
  );
  const finalEntregas = entregas.length
    ? entregas
    : [
        {
          entrega: `Primeira entrega: ${titulo}`,
          responsavel: 'Owner',
          prazo: defaultPrazo(21),
          status: 'amarelo',
        },
      ];
  const finalRiscos = riscos.length
    ? riscos
    : [{ risco: 'Desalinhamento de prioridades', acaoTomar: 'Checkpoint com sponsor' }];

  return {
    id: `sol-${index + 1}`,
    titulo,
    descricao,
    score,
    categoria,
    rationale,
    detalhes:
      String(o.detalhes ?? '').trim() ||
      buildDetalhes({
        titulo,
        descricao,
        rationale,
        categoria,
        objetivoEspecifico,
        prazoFinal,
        owner,
        sponsor,
        entregas: finalEntregas,
        riscos: finalRiscos,
      }),
    draft: {
      nomeIniciativa: String(draftRaw.nomeIniciativa ?? titulo).trim(),
      objetivoEspecifico,
      owner,
      sponsor,
      prazoFinal,
      entregas: finalEntregas,
      riscos: finalRiscos,
      insightOrigem: String(draftRaw.insightOrigem ?? o.rationale ?? '').trim() || undefined,
    },
  };
}

function extractJsonPayload(text: string): unknown | null {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : trimmed;
  const objStart = candidate.indexOf('{');
  const arrStart = candidate.indexOf('[');
  const start =
    objStart === -1 ? arrStart : arrStart === -1 ? objStart : Math.min(objStart, arrStart);
  if (start === -1) return null;
  const isArray = candidate[start] === '[';
  const end = isArray ? candidate.lastIndexOf(']') : candidate.lastIndexOf('}');
  if (end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function suggestSolutionPickActions(
  diagnosticContext: string,
  userId: string
): Promise<SolutionPickSuggestResult> {
  const ragQuery = `${diagnosticContext.slice(0, 600)} solution pick planos de acao diagnostico gaps pessoas processo sistema gestao organizational scan action canvas objetivos relatorios`;
  let ragResult: Awaited<ReturnType<typeof retrieveRelevantContextDetailed>> = {
    context: '',
    vectorChunkCount: 0,
    usedVectorRag: false,
    usedFrameworkRag: false,
  };
  try {
    ragResult = await retrieveRelevantContextDetailed(userId, ragQuery, 6);
  } catch (err) {
    console.warn('[solutionPickSuggest] RAG skipped:', err);
  }
  const ragBlock = ragResult.context
    ? `

## Contexto RAG — evidencias do ciclo do cliente

Use os trechos abaixo como fonte complementar ao diagnostico. Priorize evidencias especificas ao montar scores, rationale e detalhes de cada acao.

${ragResult.context}`
    : '';

  const attachRagMeta = (result: Omit<SolutionPickSuggestResult, 'usedRag' | 'ragChunkCount'>) => ({
    ...result,
    usedRag: ragResult.usedVectorRag,
    ragChunkCount: ragResult.vectorChunkCount,
  });

  const prompt = `Voce e o motor de Solution Pick do Magnus Mind (etapa 1.5).

Leia o diagnostico completo da empresa abaixo — perfil, canvas Magnus Waves 1.1 a 1.5 e scans organizacionais quando houver.
Quando houver contexto RAG, cruze com o diagnostico e cite evidencias concretas no rationale de cada acao.

PRIMEIRO sintetize em portugues do Brasil:
1) companySummary: resumo executivo em 3-5 frases sobre o que a empresa vive hoje (contexto, dor, estagio, pressoes).
2) companySituation: paragrafo claro sobre a situacao organizacional atual — o que esta travando, o que ja funciona e o que esta em risco.

DEPOIS proponha exatamente 10 acoes de plano de mudanca concretas e executaveis.
Cada acao deve nascer das evidencias do diagnostico — cite o tipo de gap (pessoas, processo, sistema, gestao) no rationale.
Atribua score de 0 a 100 = probabilidade de impacto real dado o que foi reportado.
Ordene mentalmente do maior para o menor score.

Para cada acao em "suggestions", inclua também o objeto "draft" com:
- nomeIniciativa (igual ou refinado do titulo)
- objetivoEspecifico: 3 a 5 frases em portugues do Brasil com (1) resultado mensuravel e prazo, (2) contexto ligado ao diagnostico, (3) criterio de sucesso com metrica ou evidencia, (4) escopo resumido. NAO repita apenas a descricao curta.
- owner, sponsor, prazoFinal (YYYY-MM-DD)
- entregas: 2 a 3 itens com entrega, responsavel, prazo, status
- riscos: 1 a 2 itens com risco e acaoTomar
- insightOrigem (ligacao com o diagnostico)

Campos de topo de cada sugestao:
- titulo (curto)
- descricao (1-2 frases resumo)
- score (0-100)
- categoria: pessoas|processo|tecnologia|estrutura|comunicacao|outro
- rationale (por que este score, ligado ao diagnostico)
- detalhes (2-3 frases narrativas: como executar, impacto esperado e o que observar)

Diagnostico da empresa:
${diagnosticContext}${ragBlock}

Responda APENAS com JSON valido (sem markdown):
{"companySummary":"...","companySituation":"...","suggestions":[{"titulo":"...","descricao":"...","score":85,"categoria":"pessoas","rationale":"...","detalhes":"...","draft":{"nomeIniciativa":"...","objetivoEspecifico":"...","owner":"...","sponsor":"...","prazoFinal":"2026-08-01","entregas":[{"entrega":"...","responsavel":"...","prazo":"2026-06-01","status":"amarelo"}],"riscos":[{"risco":"...","acaoTomar":"..."}],"insightOrigem":"..."}}]}`;

  let demoReason = 'A IA não retornou JSON válido com sugestões suficientes.';

  try {
    const raw = await chatCompletion({
      model: getDefaultModel(),
      messages: [
        { role: 'system', content: 'Retorne somente JSON objeto valido com companySummary, companySituation e suggestions (10 itens).' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      maxTokens: 8192,
    });

    const parsed = extractJsonPayload(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const root = parsed as Record<string, unknown>;
      const list = Array.isArray(root.suggestions) ? root.suggestions : [];
      if (list.length > 0) {
        const suggestions = list
          .map((item, i) => normalizeAction(item, i))
          .filter((a): a is SuggestedSolutionActionDraft => Boolean(a))
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map((s, i) => ({ ...s, id: `sol-${i + 1}` }));
        if (suggestions.length >= 3) {
          return attachRagMeta({
            suggestions,
            companySummary: String(root.companySummary ?? '').trim() || undefined,
            companySituation: String(root.companySituation ?? '').trim() || undefined,
          });
        }
      }
    }

    if (Array.isArray(parsed) && parsed.length > 0) {
      const suggestions = parsed
        .map((item, i) => normalizeAction(item, i))
        .filter((a): a is SuggestedSolutionActionDraft => Boolean(a))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map((s, i) => ({ ...s, id: `sol-${i + 1}` }));
      if (suggestions.length >= 3) {
        return attachRagMeta({ suggestions });
      }
    }
  } catch (err) {
    if (isLlmNotConfiguredError(err)) {
      throw err;
    }
    console.warn('[solutionPickSuggest] AI failed:', err);
    demoReason =
      err instanceof Error
        ? err.message
        : 'Falha ao chamar o modelo de IA. Verifique OPENROUTER_API_KEY ou OPENAI_API_KEY no Render.';
  }

  const fallback = defaultCompanySummary();
  return attachRagMeta({
    suggestions: defaultSuggestions(),
    ...fallback,
    demoMode: true,
    demoReason,
  });
}
