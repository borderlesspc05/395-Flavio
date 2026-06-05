import { ActionCanvas, DeliveryStatus } from '../types';
import { env } from '../config/env';
import { COLLECTIONS, listByUser } from './storage';
import { chatCompletion, getDefaultModel, isLlmNotConfiguredError } from './llm';
import { buildMagnusWavesMemoryContext, MAGNUS_MEMORY_SYSTEM_PREAMBLE } from './magnusMemory';
import { generateId } from '../utils/id';

const MAX_CANVASES = 5;
const MAX_ENTREGAS = 10;
const MAX_RISCOS = 8;

export interface SuggestedActionCanvasDraft {
  nomeIniciativa: string;
  objetivoEspecifico: string;
  owner: string;
  sponsor: string;
  prazoFinal: string;
  entregas: Array<{
    entrega: string;
    responsavel: string;
    prazo: string;
    status?: DeliveryStatus;
    evidencia?: string;
  }>;
  riscos: Array<{ risco: string; acaoTomar: string }>;
  insightOrigem?: string;
}

function defaultPrazo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function defaultSuggestions(): SuggestedActionCanvasDraft[] {
  return [
    {
      nomeIniciativa: 'Primeira mudança a partir do diagnóstico',
      objetivoEspecifico:
        'Converter o gap prioritário identificado no diagnóstico em um plano executável com donos e prazos claros.',
      owner: 'Líder da iniciativa',
      sponsor: 'Sponsor executivo',
      prazoFinal: defaultPrazo(90),
      entregas: [
        {
          entrega: 'Definir escopo e critérios de sucesso da mudança',
          responsavel: 'Owner',
          prazo: defaultPrazo(14),
          status: 'amarelo',
          evidencia: 'Documento ou workshop de alinhamento',
        },
        {
          entrega: 'Executar piloto da solução escolhida no Gate Zero',
          responsavel: 'Equipe núcleo',
          prazo: defaultPrazo(45),
          status: 'amarelo',
        },
      ],
      riscos: [
        {
          risco: 'Baixa adesão das áreas impactadas',
          acaoTomar: 'Ritual semanal de decisão com sponsor e métricas de adoção',
        },
      ],
      insightOrigem: 'Fallback: complete diagnóstico e Gate Zero para planos mais específicos.',
    },
  ];
}

function normalizeStatus(value: unknown): DeliveryStatus {
  if (value === 'verde' || value === 'amarelo' || value === 'vermelho') return value;
  return 'amarelo';
}

function normalizeDraft(raw: unknown): SuggestedActionCanvasDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const nomeIniciativa = String(o.nomeIniciativa ?? '').trim();
  if (!nomeIniciativa) return null;

  const entregasRaw = Array.isArray(o.entregas) ? o.entregas : [];
  const riscosRaw = Array.isArray(o.riscos) ? o.riscos : [];

  const entregas = entregasRaw.slice(0, MAX_ENTREGAS).map((e) => {
    const row = (e && typeof e === 'object' ? e : {}) as Record<string, unknown>;
    return {
      entrega: String(row.entrega ?? '').trim(),
      responsavel: String(row.responsavel ?? '').trim(),
      prazo: String(row.prazo ?? defaultPrazo(30)).trim(),
      status: normalizeStatus(row.status),
      evidencia: row.evidencia ? String(row.evidencia) : undefined,
    };
  }).filter((e) => e.entrega);

  const riscos = riscosRaw.slice(0, MAX_RISCOS).map((r) => {
    const row = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
    return {
      risco: String(row.risco ?? '').trim(),
      acaoTomar: String(row.acaoTomar ?? row.acao ?? '').trim(),
    };
  }).filter((r) => r.risco);

  return {
    nomeIniciativa,
    objetivoEspecifico: String(o.objetivoEspecifico ?? '').trim(),
    owner: String(o.owner ?? 'A definir').trim(),
    sponsor: String(o.sponsor ?? 'A definir').trim(),
    prazoFinal: String(o.prazoFinal ?? defaultPrazo(90)).trim(),
    entregas: entregas.length
      ? entregas
      : [
          {
            entrega: 'Detalhar primeira entrega',
            responsavel: String(o.owner ?? 'Owner'),
            prazo: defaultPrazo(21),
            status: 'amarelo' as DeliveryStatus,
          },
        ],
    riscos: riscos.length ? riscos : [{ risco: 'Desalinhamento de prioridades', acaoTomar: 'Checkpoint com sponsor' }],
    insightOrigem: o.insightOrigem ? String(o.insightOrigem) : undefined,
  };
}

export function draftToCreateBody(draft: SuggestedActionCanvasDraft): Record<string, unknown> {
  return {
    nomeIniciativa: draft.nomeIniciativa,
    objetivoEspecifico: draft.objetivoEspecifico,
    owner: draft.owner,
    sponsor: draft.sponsor,
    prazoFinal: draft.prazoFinal,
    signOff: 'pendente',
    fechado: false,
    entregas: draft.entregas.map((e, i) => ({
      id: `del-${i}-${generateId()}`,
      entrega: e.entrega,
      responsavel: e.responsavel,
      prazo: e.prazo,
      status: e.status ?? 'amarelo',
      evidencia: e.evidencia ?? '',
    })),
    riscos: draft.riscos.map((r, i) => ({
      id: `risk-${i}-${generateId()}`,
      risco: r.risco,
      acaoTomar: r.acaoTomar,
    })),
  };
}

export async function suggestActionCanvases(
  userId: string,
  clientOverride?: { diagnosticContext?: string; gateContext?: string }
): Promise<{ suggestions: SuggestedActionCanvasDraft[]; slotsAvailable: number; demoMode?: boolean }> {
  const existing = await listByUser<ActionCanvas>(COLLECTIONS.actionCanvases, userId);
  const slotsAvailable = Math.max(0, MAX_CANVASES - existing.length);

  if (slotsAvailable === 0) {
    return { suggestions: [], slotsAvailable: 0 };
  }

  const magnusMemory = await buildMagnusWavesMemoryContext(userId, clientOverride);
  const memoryBlock = [MAGNUS_MEMORY_SYSTEM_PREAMBLE, magnusMemory.trim()].filter(Boolean).join('\n\n');

  const maxSuggest = Math.min(slotsAvailable, 3);
  const existingNames = existing.map((c) => c.nomeIniciativa).join(', ') || 'nenhum';

  const prompt = `Voce e o consultor Magnus Mind na etapa Difusao (Make the Move).
Com base EXCLUSIVAMENTE na memoria Magnus Waves abaixo (diagnostico 1.1-1.5, Gate Zero / MM Blueprint, canvases e objetivos existentes), proponha de 1 a ${maxSuggest} Action Canvas COMPLETOS.

Cada Action Canvas e uma iniciativa de mudanca pratica com:
- nomeIniciativa, objetivoEspecifico, owner, sponsor, prazoFinal (YYYY-MM-DD)
- entregas: 2 a 5 itens com entrega, responsavel, prazo (YYYY-MM-DD), status (verde|amarelo|vermelho), evidencia opcional
- riscos: 1 a 3 itens com risco e acaoTomar
- insightOrigem: frase curta citando evidencia do diagnostico ou do Gate (ex: "1.2 Gap Scan: ...")

Regras:
- Priorize mudancas derivadas do diagnostico e do caminho A/B do Gate Zero.
- Nao duplique canvases existentes: ${existingNames}
- Seja especifico com nomes de papeis plausiveis (nao invente pessoas reais).
- signOff sempre pendente (nao incluir signOff no JSON).

Memoria:
${memoryBlock}

Responda APENAS com JSON array valido (sem markdown):
[{"nomeIniciativa":"...","objetivoEspecifico":"...","owner":"...","sponsor":"...","prazoFinal":"2026-08-01","entregas":[{"entrega":"...","responsavel":"...","prazo":"2026-06-01","status":"amarelo"}],"riscos":[{"risco":"...","acaoTomar":"..."}],"insightOrigem":"..."}]`;

  let demoMode = false;

  try {
    const raw = await chatCompletion({
      model: getDefaultModel(),
      messages: [
        { role: 'system', content: 'Retorne somente JSON array valido, sem markdown.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.75,
    });

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as unknown[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const suggestions = parsed
          .map(normalizeDraft)
          .filter((d): d is SuggestedActionCanvasDraft => Boolean(d))
          .slice(0, maxSuggest);
        if (suggestions.length) {
          return { suggestions, slotsAvailable };
        }
      }
    }
  } catch (err) {
    const e = err as { code?: string };
    if (isLlmNotConfiguredError(err)) {
      demoMode = true;
    } else {
      console.warn('[actionCanvasSuggest] AI failed:', err);
    }
  }

  return {
    suggestions: defaultSuggestions().slice(0, maxSuggest),
    slotsAvailable,
    demoMode,
  };
}
