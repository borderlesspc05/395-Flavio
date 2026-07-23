import { chatCompletion, getFastStructuredModel, isLlmNotConfiguredError } from './llm';
import { searchUserRagContext } from './ragSearch';
import { isRagVectorConfigured } from './ragConfig';

const DIAGNOSTIC_INPUT_MAX = 10_000;
const RAG_TIMEOUT_MS = 2_500;
const RAG_TOP_K = 3;

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

function desiredDeliveryCount(index: number): number {
  return (index % 3) + 1;
}

function buildVariableEntregas(titulo: string, index: number) {
  const templates = [
    {
      entrega: `Planejar escopo: ${titulo}`,
      responsavel: 'Owner',
      prazo: defaultPrazo(14),
      status: 'amarelo',
      evidencia: 'Documento de alinhamento',
    },
    {
      entrega: 'Executar piloto e medir resultado',
      responsavel: 'Equipe núcleo',
      prazo: defaultPrazo(35),
      status: 'amarelo',
    },
    {
      entrega: 'Consolidar aprendizados e padronizar rotina',
      responsavel: 'Sponsor executivo',
      prazo: defaultPrazo(55),
      status: 'amarelo',
    },
  ];
  return templates.slice(0, desiredDeliveryCount(index));
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
      'Resumo executivo indisponível no modo demonstração. Com a IA configurada, a síntese será gerada a partir do diagnóstico completo da empresa, conectando dores, prioridades e implicações para o negócio. Este espaço foi preparado para trazer uma leitura mais robusta, com dois parágrafos executivos em vez de uma resposta curta.\n\nEnquanto a configuração não estiver ativa, as sugestões abaixo funcionam como exemplo de navegação e validação do fluxo. Assim que a chave de IA estiver disponível no servidor, o Sprint substituirá este texto por uma análise contextualizada, considerando os sinais do Decoding, Gap Scan, System Scan, Team Scan e Solution Pick.',
    companySituation:
      'A situação organizacional não pôde ser sintetizada automaticamente neste momento. Quando a IA estiver ativa, este bloco vai explicar o que a empresa está vivendo agora, quais tensões aparecem no dia a dia e onde a performance está sendo mais pressionada.\n\nComplete o diagnóstico ou configure a chave de IA no servidor para liberar a leitura consultiva. O objetivo é que este trecho ajude a liderança a enxergar sintomas, causas prováveis e riscos de continuidade antes de escolher os planos de ação.',
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
    const entregas = buildVariableEntregas(s.titulo, i);

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

  const entregas = entregasRaw.slice(0, 3).map((e) => {
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
    ? entregas.slice(0, Math.min(3, Math.max(1, entregas.length)))
    : buildVariableEntregas(titulo, index);
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

function truncateDiagnosticContext(context: string, max = DIAGNOSTIC_INPUT_MAX): string {
  const trimmed = context.trim();
  if (trimmed.length <= max) return trimmed;
  const headSize = Math.floor(max * 0.72);
  const tailSize = Math.floor(max * 0.22);
  return `${trimmed.slice(0, headSize)}\n\n[... trecho intermediário omitido para agilizar a análise ...]\n\n${trimmed.slice(-tailSize)}`;
}

const PRODUCT_BRAND_NAMES = [
  'Sprint Waves',
  'Sprint Wave',
  'SPRINT WAVES',
  'SPRINT WAVES™',
  'Magnus Mind',
  'MagnusMind',
  'People Sprint',
];

/** Extrai o nome real da empresa do contexto; ignora marcas do produto. */
function extractCompanyName(context: string): string | null {
  const patterns = [
    /Nome da empresa \(usar exatamente este nome nos textos\):\s*(.+)/i,
    /Organização \(informada no Scan SWOT\):\s*(.+)/i,
    /- Organização:\s*(.+)/i,
    /nome da empresa \/ organização analisada nesta SWOT\?\s*:\s*(.+)/i,
  ];
  for (const pattern of patterns) {
    const match = context.match(pattern);
    const value = match?.[1]?.trim().split('\n')[0]?.trim();
    if (!value) continue;
    if (PRODUCT_BRAND_NAMES.some((brand) => value.toLowerCase() === brand.toLowerCase())) continue;
    if (/^sprint\b/i.test(value) && /wave/i.test(value)) continue;
    return value;
  }
  return null;
}

function sanitizeCompanyNarrative(text: string, companyName: string | null): string {
  let next = text;
  for (const brand of PRODUCT_BRAND_NAMES) {
    const re = new RegExp(brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    next = next.replace(re, companyName || 'a organização');
  }
  // Evita "A a organização" / "a A organização"
  next = next.replace(/\b[Aa]\s+a organização\b/g, 'A organização');
  next = next.replace(/\ba A organização\b/g, 'a organização');
  return next;
}

async function fetchSolutionPickRag(
  userId: string,
  query: string
): Promise<{ context: string; vectorChunkCount: number; usedRag: boolean }> {
  if (!isRagVectorConfigured()) {
    return { context: '', vectorChunkCount: 0, usedRag: false };
  }

  try {
    const result = await Promise.race([
      searchUserRagContext(userId, query, RAG_TOP_K),
      new Promise<{ context: string; chunkCount: number }>((resolve) =>
        setTimeout(() => resolve({ context: '', chunkCount: 0 }), RAG_TIMEOUT_MS)
      ),
    ]);
    return {
      context: result.context,
      vectorChunkCount: result.chunkCount,
      usedRag: result.chunkCount > 0,
    };
  } catch (err) {
    console.warn('[solutionPickSuggest] RAG skipped:', err);
    return { context: '', vectorChunkCount: 0, usedRag: false };
  }
}

export async function suggestSolutionPickActions(
  diagnosticContext: string,
  userId: string
): Promise<SolutionPickSuggestResult> {
  const compactContext = truncateDiagnosticContext(diagnosticContext);
  const companyName = extractCompanyName(compactContext);
  const companyRule = companyName
    ? `NOME DA EMPRESA: use exatamente "${companyName}" quando citar a organizacao. Nunca substitua por outro nome.`
    : `NOME DA EMPRESA: o diagnostico nao informa um nome claro. Refira-se apenas como "a organizacao" ou "a empresa". Nunca invente um nome.`;

  const ragQuery = `${compactContext.slice(0, 500)} solution pick planos acao diagnostico gaps`;
  const ragResult = await fetchSolutionPickRag(userId, ragQuery);

  const ragBlock = ragResult.context
    ? `

## Contexto RAG — evidencias do ciclo do cliente

${ragResult.context}`
    : '';

  const attachRagMeta = (result: Omit<SolutionPickSuggestResult, 'usedRag' | 'ragChunkCount'>) => ({
    ...result,
    usedRag: ragResult.usedRag,
    ragChunkCount: ragResult.vectorChunkCount,
  });

  const prompt = `Voce e o motor de Solution Pick do Magnus Mind / Sprint (etapa 1.5).

Leia o diagnostico da empresa abaixo (pode incluir SWOT Analysis Scan ou canvas completo). Quando houver contexto RAG, use como complemento.

${companyRule}

REGRA CRITICA — NOME DA EMPRESA:
- "Sprint Waves", "Magnus Mind", "Sprint" sao marcas do PRODUTO/plataforma, NAO sao o nome da empresa do cliente.
- Nunca use essas marcas como se fossem a organizacao analisada.
- Se o nome real estiver no diagnostico (campo Organizacao / Nome da empresa), use-o.
- Se nao houver nome, escreva "a organizacao" / "a empresa" sem inventar.

REGRA CRITICA — ESFERA DE INFLUENCIA:
Todas as recomendacoes devem estar dentro da esfera de influencia e controle do usuario.
Nunca proponha acoes para fatores fora da capacidade de decisao ou execucao dele.
Exemplo: se a ameaca/fraqueza for variacao do cambio do dolar, NAO sugira "alterar a cotacao do dolar".
Em vez disso, sugira estrategias ao alcance do usuario: revisar politicas de precos, renegociar contratos, diversificar fornecedores, ajustar planejamento financeiro ou mitigar impactos.
O principio: transformar problemas em acoes concretas, realistas e executaveis pelo usuario.

PRIMEIRO raciocine internamente como consultor organizacional: conecte respostas, separe sintomas de causas, identifique padrões recorrentes e encontre o problema-raiz que explica a maior parte dos demais sinais.

Depois sintetize em português do Brasil:
1) companySummary com esta estrutura textual:
"O que identificamos\\n" + 4 ou 5 descobertas objetivas;
"O que isso está provocando\\n" + consequências observadas;
"O principal desafio\\n" + uma única conclusão sobre o problema-raiz.
Não faça resumo campo a campo.
2) companySituation: análise executiva das tensões atuais, relações de causa e consequência, prioridade de intervenção e risco de não agir. Use evidências concretas do diagnóstico, não frases que serviriam para qualquer empresa.

DEPOIS proponha exatamente 10 acoes de plano de mudanca concretas e EXECUTAVEIS pelo usuario.
Cada acao deve nascer das evidencias do diagnostico (incluindo SWOT quando houver).
Atribua score de 0 a 100 = nível de aderência ao diagnóstico e potencial de impacto.
Ordene do maior para o menor score.

Para cada item em "suggestions" retorne APENAS:
- titulo (curto)
- descricao (1-2 frases explicando qual problema específico a iniciativa resolve e qual transformação busca)
- score (0-100)
- categoria: pessoas|processo|tecnologia|estrutura|comunicacao|outro
- rationale (cite padrões/evidências concretas do diagnóstico que justificam a escolha; não repita a descrição)

Use nomes de iniciativas estratégicos, como projetos reais, evitando títulos vagos como "Melhorar comunicação".
Antes de finalizar, teste cada texto: se ele continuar válido ao trocar o contexto por outra empresa, reescreva-o.

Nao inclua draft, entregas ou riscos — o servidor completa esses campos.

Diagnostico da empresa:
${compactContext}${ragBlock}

Responda APENAS com JSON valido (sem markdown):
{"companySummary":"Paragrafo 1...\\n\\nParagrafo 2...","companySituation":"Paragrafo 1...\\n\\nParagrafo 2...","suggestions":[{"titulo":"...","descricao":"...","score":85,"categoria":"pessoas","rationale":"..."}]}`;

  let demoReason = 'A IA não retornou JSON válido com sugestões suficientes.';

  try {
    const raw = await chatCompletion({
      model: getFastStructuredModel(),
      messages: [
        {
          role: 'system',
          content:
            'Retorne somente JSON objeto válido com companySummary, companySituation e suggestions (10 itens). A análise deve identificar problema-raiz, consequências e evidências específicas. Nunca use "Sprint Waves" ou "Magnus Mind" como nome da empresa do cliente. Toda ação deve estar na esfera de influência do usuário.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.35,
      maxTokens: 4200,
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
            companySummary: sanitizeCompanyNarrative(
              String(root.companySummary ?? '').trim(),
              companyName,
            ) || undefined,
            companySituation: sanitizeCompanyNarrative(
              String(root.companySituation ?? '').trim(),
              companyName,
            ) || undefined,
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
