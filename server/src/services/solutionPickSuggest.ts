import { chatCompletion, getDefaultModel, isLlmNotConfiguredError } from './llm';
import { generateId } from '../utils/id';

export interface SuggestedSolutionActionDraft {
  id: string;
  titulo: string;
  descricao: string;
  score: number;
  categoria: string;
  rationale: string;
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

function defaultPrazo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
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

  return samples.map((s, i) => ({
    id: `sol-${i + 1}`,
    ...s,
    draft: {
      nomeIniciativa: s.titulo,
      objetivoEspecifico: s.descricao,
      owner: 'Líder da iniciativa',
      sponsor: 'Sponsor executivo',
      prazoFinal: defaultPrazo(60 + i * 7),
      entregas: [
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
      ],
      riscos: [
        {
          risco: 'Baixa adesão das partes envolvidas',
          acaoTomar: 'Ritual semanal de decisão com sponsor',
        },
      ],
      insightOrigem: s.rationale,
    },
  }));
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

  return {
    id: String(o.id ?? `sol-${index + 1}-${generateId().slice(0, 6)}`),
    titulo,
    descricao: String(o.descricao ?? o.description ?? titulo).trim(),
    score,
    categoria: normalizeCategory(o.categoria ?? o.category),
    rationale: String(o.rationale ?? o.motivo ?? '').trim() || 'Sugerido com base no diagnóstico 1.1–1.4.',
    draft: {
      nomeIniciativa: String(draftRaw.nomeIniciativa ?? titulo).trim(),
      objetivoEspecifico: String(draftRaw.objetivoEspecifico ?? o.descricao ?? titulo).trim(),
      owner: String(draftRaw.owner ?? 'Líder da iniciativa').trim(),
      sponsor: String(draftRaw.sponsor ?? 'Sponsor executivo').trim(),
      prazoFinal: String(draftRaw.prazoFinal ?? defaultPrazo(90)).trim(),
      entregas: entregas.length
        ? entregas
        : [
            {
              entrega: `Primeira entrega: ${titulo}`,
              responsavel: 'Owner',
              prazo: defaultPrazo(21),
              status: 'amarelo',
            },
          ],
      riscos: riscos.length ? riscos : [{ risco: 'Desalinhamento de prioridades', acaoTomar: 'Checkpoint com sponsor' }],
      insightOrigem: String(draftRaw.insightOrigem ?? o.rationale ?? '').trim() || undefined,
    },
  };
}

export async function suggestSolutionPickActions(diagnosticContext: string): Promise<{
  suggestions: SuggestedSolutionActionDraft[];
  demoMode?: boolean;
}> {
  const prompt = `Voce e o motor de Solution Pick do Magnus Mind (etapa 1.5).
Leia o diagnostico das etapas 1.1 a 1.4 abaixo e proponha exatamente 10 acoes de plano de mudanca.

Cada acao deve ser concreta e executavel (exemplos de tom: "Treinar equipe em resolucao de problemas", "Comprar computador para recepcionista", "Palestra motivacional").
Atribua score de 0 a 100 = probabilidade de dar certo / prioridade dado o que foi reportado em 1.1-1.4.
Ordene mentalmente do maior para o menor score.

Para cada acao retorne:
- titulo (curto)
- descricao (1-2 frases)
- score (0-100)
- categoria: pessoas|processo|tecnologia|estrutura|comunicacao|outro
- rationale (por que este score)
- draft: plano de acao pre-preenchido com nomeIniciativa, objetivoEspecifico, owner, sponsor, prazoFinal (YYYY-MM-DD), entregas (2-3 com entrega, responsavel, prazo, status verde|amarelo|vermelho), riscos (1-2), insightOrigem

Diagnostico 1.1-1.4:
${diagnosticContext}

Responda APENAS com JSON array valido (sem markdown), 10 itens:
[{"titulo":"...","descricao":"...","score":85,"categoria":"pessoas","rationale":"...","draft":{"nomeIniciativa":"...","objetivoEspecifico":"...","owner":"...","sponsor":"...","prazoFinal":"2026-09-01","entregas":[{"entrega":"...","responsavel":"...","prazo":"2026-07-01","status":"amarelo"}],"riscos":[{"risco":"...","acaoTomar":"..."}],"insightOrigem":"..."}}]`;

  try {
    const raw = await chatCompletion({
      model: getDefaultModel(),
      messages: [
        { role: 'system', content: 'Retorne somente JSON array valido com 10 objetos, sem markdown.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
    });

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as unknown[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const suggestions = parsed
          .map((item, i) => normalizeAction(item, i))
          .filter((a): a is SuggestedSolutionActionDraft => Boolean(a))
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);
        if (suggestions.length >= 3) {
          return { suggestions };
        }
      }
    }
  } catch (err) {
    if (!isLlmNotConfiguredError(err)) {
      console.warn('[solutionPickSuggest] AI failed:', err);
    }
  }

  return { suggestions: defaultSuggestions(), demoMode: true };
}
