import type { EvolutionLoopResult } from '../types/evolutionLoop';

const SESSION_KEY = 'mm.evolution.loop.pending';
const CACHE_PREFIX = 'mm.evolution.loop.cache.';

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
