import type { EvolutionLoopResult } from '../types/evolutionLoop';

const SESSION_KEY = 'mm.evolution.loop.pending';
const SELECTED_KEY = 'mm.evolution.loop.selectedPractices';
const CACHE_PREFIX = 'mm.evolution.loop.cache.';

/** Máximo de iniciativas herdadas do Loop para o próximo ciclo. */
export const MAX_INHERITED_INITIATIVES = 3;

export type StashedInheritedPractice = {
  practice: string;
  rationale?: string;
  source?: 'continuar' | 'ajustar';
};

export function stashEvolutionForDesign(result: EvolutionLoopResult): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(result));
}

export function readStashedEvolution(): EvolutionLoopResult | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EvolutionLoopResult;
  } catch {
    return null;
  }
}

export function clearStashedEvolution(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function readSelectedInheritedPractices(): StashedInheritedPractice[] {
  try {
    const raw = sessionStorage.getItem(SELECTED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StashedInheritedPractice[];
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, MAX_INHERITED_INITIATIVES);
  } catch {
    return [];
  }
}

export function writeSelectedInheritedPractices(items: StashedInheritedPractice[]): void {
  sessionStorage.setItem(
    SELECTED_KEY,
    JSON.stringify(items.slice(0, MAX_INHERITED_INITIATIVES))
  );
}

export function clearSelectedInheritedPractices(): void {
  sessionStorage.removeItem(SELECTED_KEY);
}

/**
 * Adiciona prática à fila do próximo ciclo (máx. 3).
 * Não cria Action Canvas no ciclo atual — isso sobrevive ao reset da nova onda.
 */
export function toggleInheritedPractice(
  item: StashedInheritedPractice
): { ok: boolean; selected: StashedInheritedPractice[]; message?: string } {
  const current = readSelectedInheritedPractices();
  const key = item.practice.trim().toLowerCase();
  const exists = current.findIndex((p) => p.practice.trim().toLowerCase() === key);

  if (exists >= 0) {
    const next = current.filter((_, i) => i !== exists);
    writeSelectedInheritedPractices(next);
    return {
      ok: true,
      selected: next,
      message: `“${item.practice}” removido da fila do próximo ciclo.`,
    };
  }

  if (current.length >= MAX_INHERITED_INITIATIVES) {
    return {
      ok: false,
      selected: current,
      message: `Você já selecionou ${MAX_INHERITED_INITIATIVES} iniciativas. Remova uma para incluir outra — no próximo ciclo você decide o que fazer com cada uma.`,
    };
  }

  const next = [...current, item];
  writeSelectedInheritedPractices(next);
  return {
    ok: true,
    selected: next,
    message: `“${item.practice}” na fila (${next.length}/${MAX_INHERITED_INITIATIVES}) para o próximo ciclo.`,
  };
}

export function cacheEvolutionResult(cycleId: string, result: EvolutionLoopResult): void {
  localStorage.setItem(
    `${CACHE_PREFIX}${cycleId}`,
    JSON.stringify({ ...result, generatedAt: result.generatedAt ?? new Date().toISOString() })
  );
}

export function readCachedEvolution(cycleId: string): EvolutionLoopResult | null {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${cycleId}`);
    if (!raw) return null;
    return JSON.parse(raw) as EvolutionLoopResult;
  } catch {
    return null;
  }
}
