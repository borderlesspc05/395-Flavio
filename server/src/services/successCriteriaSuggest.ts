import { chatCompletion, getDefaultModel, isLlmNotConfiguredError } from './llm';

export interface SuccessCriteriaInput {
  nomeIniciativa: string;
  objetivoEspecifico: string;
  prazoFinal: string;
  entregas?: string[];
  riscos?: string[];
}

function fallbackCriteria(input: SuccessCriteriaInput): string[] {
  const initiative = input.nomeIniciativa.trim() || 'a iniciativa';
  const deadline = input.prazoFinal.trim() || 'o prazo final definido';
  const delivery = input.entregas?.find((item) => item.trim())?.trim();
  const risk = input.riscos?.find((item) => item.trim())?.trim();

  return [
    `Até ${deadline}, alcançar e registrar o resultado-alvo definido para ${initiative}, comparando o indicador final com a linha de base.`,
    `Até ${deadline}, comprovar adoção recorrente da solução pelo público-alvo por meio de evidências de uso em pelo menos dois ciclos de acompanhamento.`,
    delivery
      ? `Até ${deadline}, validar a qualidade de “${delivery}” com aceite formal do responsável e sem pendências críticas abertas.`
      : risk
        ? `Até ${deadline}, reduzir a exposição ao risco “${risk}” para o nível acordado e manter um plano de resposta testado.`
        : `Até ${deadline}, obter aceite formal dos responsáveis, sem pendências críticas de qualidade ou riscos sem plano de resposta.`,
  ];
}

function normalizeCriteria(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const unique = new Set<string>();
  const result: string[] = [];

  for (const item of raw) {
    const criterion = String(item ?? '').replace(/\s+/g, ' ').trim();
    const signature = criterion
      .toLocaleLowerCase('pt-BR')
      .replace(/[^\p{L}\p{N}\s]/gu, '')
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .slice(0, 8)
      .join(' ');
    if (criterion.length < 20 || unique.has(signature)) continue;
    unique.add(signature);
    result.push(criterion.slice(0, 280));
  }

  return result.slice(0, 3);
}

const PERSPECTIVES = ['resultado', 'adocao', 'sustentacao'] as const;

type Perspective = (typeof PERSPECTIVES)[number];

interface GeneratedCriterion {
  perspective: Perspective;
  text: string;
}

function normalizeGeneratedCriteria(raw: unknown): GeneratedCriterion[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const perspective = String(row.perspective ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase() as Perspective;
      const text = String(row.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 280);
      if (!PERSPECTIVES.includes(perspective) || text.length < 20) return null;
      return { perspective, text };
    })
    .filter((item): item is GeneratedCriterion => Boolean(item));
}

function significantWords(text: string): Set<string> {
  const stopWords = new Set([
    'para', 'como', 'com', 'pela', 'pelo', 'das', 'dos', 'uma', 'que', 'até',
    'ser', 'por', 'sem', 'durante', 'final', 'prazo', 'definido',
  ]);
  return new Set(
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 3 && !stopWords.has(word)),
  );
}

function similarity(a: string, b: string): number {
  const left = significantWords(a);
  const right = significantWords(b);
  const intersection = [...left].filter((word) => right.has(word)).length;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

function validateGeneratedCriteria(items: GeneratedCriterion[]): string[] {
  const issues: string[] = [];
  if (items.length !== 3) issues.push('A resposta deve conter exatamente três critérios.');

  const perspectives = new Set(items.map((item) => item.perspective));
  for (const perspective of PERSPECTIVES) {
    if (!perspectives.has(perspective)) issues.push(`Falta a perspectiva ${perspective}.`);
  }

  for (const item of items) {
    const hasMeasure =
      /\d/.test(item.text) ||
      /\b(100%|todos?|nenhum|zero|linha de base|índice|taxa|média|quantidade|aceite|auditoria)\b/i.test(
        item.text,
      );
    const hasTime =
      /\b(até|prazo|semana|mês|meses|dia|dias|sprint|ciclo|trimestre|consecutiv[oa]s?)\b/i.test(
        item.text,
      );
    if (!hasMeasure) issues.push(`O critério de ${item.perspective} não possui medida verificável.`);
    if (!hasTime) issues.push(`O critério de ${item.perspective} não possui horizonte temporal.`);
  }

  for (let left = 0; left < items.length; left += 1) {
    for (let right = left + 1; right < items.length; right += 1) {
      if (similarity(items[left].text, items[right].text) >= 0.42) {
        issues.push(
          `Os critérios de ${items[left].perspective} e ${items[right].perspective} estão redundantes.`,
        );
      }
    }
  }
  return issues;
}

export async function suggestSuccessCriteria(
  input: SuccessCriteriaInput,
): Promise<{ criteria: string[]; demoMode?: boolean }> {
  const fallback = fallbackCriteria(input);
  const basePrompt = `Você é um consultor experiente em gestão de desempenho e desenho de metas SMART.

Antes de escrever, raciocine internamente sobre: (1) o objetivo real do Sprint, (2) a transformação buscada e (3) as evidências que comprovariam sucesso. Não exponha esse raciocínio na resposta.

Gere EXATAMENTE 3 critérios de sucesso para a iniciativa abaixo. Os critérios devem ser distintos e complementares:
1. RESULTADO/IMPACTO: mede a mudança concreta produzida no negócio ou processo.
2. ADOÇÃO/COMPORTAMENTO: mede uso, adesão ou mudança de comportamento do público-alvo.
3. QUALIDADE/SUSTENTAÇÃO: mede qualidade da entrega, mitigação de risco ou sustentação do resultado.

Cada critério deve:
- ser uma frase independente, específica, mensurável, atingível, relevante e temporal;
- declarar o que será medido, o limiar/meta de sucesso e até quando;
- usar dados reais fornecidos abaixo; quando não houver número-base, definir uma verificação mensurável sem inventar fatos;
- evitar variações da mesma ideia, frases genéricas e termos vagos como "melhorar significativamente";
- ter no máximo 280 caracteres.
- revisar os três critérios antes de responder e reescrever qualquer par que meça a mesma coisa.

Iniciativa: ${input.nomeIniciativa || 'não informada'}
Objetivo: ${input.objetivoEspecifico || 'não informado'}
Prazo final: ${input.prazoFinal || 'não informado'}
Entregas: ${input.entregas?.filter(Boolean).join(' | ') || 'não informadas'}
Riscos: ${input.riscos?.filter(Boolean).join(' | ') || 'não informados'}

Responda apenas com JSON válido:
{"criteria":[{"perspective":"resultado","text":"..."},{"perspective":"adocao","text":"..."},{"perspective":"sustentacao","text":"..."}]}`;

  try {
    let feedback = '';
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const raw = await chatCompletion({
        model: getDefaultModel(),
        messages: [
          {
            role: 'system',
            content:
              'Retorne somente JSON válido. Produza três critérios SMART semanticamente distintos nas dimensões resultado, adoção e sustentação.',
          },
          {
            role: 'user',
            content: feedback
              ? `${basePrompt}\n\nA tentativa anterior foi rejeitada. Corrija estes problemas:\n${feedback}`
              : basePrompt,
          },
        ],
        temperature: attempt === 0 ? 0.45 : 0.65,
      });
      const json = raw.match(/\{[\s\S]*\}/);
      const parsed = json ? (JSON.parse(json[0]) as { criteria?: unknown }) : null;
      const generated = normalizeGeneratedCriteria(parsed?.criteria);
      const issues = validateGeneratedCriteria(generated);
      if (issues.length === 0) {
        const criteria = normalizeCriteria(generated.map((item) => item.text));
        if (criteria.length === 3) return { criteria };
      }
      feedback = issues.map((issue) => `- ${issue}`).join('\n');
    }
  } catch (error) {
    if (!isLlmNotConfiguredError(error)) {
      console.warn('[successCriteriaSuggest] AI failed:', error);
    }
  }

  return { criteria: fallback, demoMode: true };
}
