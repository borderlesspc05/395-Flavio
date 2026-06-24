import type { InitialFormData } from '../types';
import type { SuggestedSolutionAction } from '../types/solutionPick';
import { SELECTED_SOLUTION_ACTIONS_KEY } from '../types/solutionPick';

function normalizeTitle(titulo: string): string {
  return titulo.toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Mantém só seleções que ainda existem na lista atual (por id ou título). */
export function reconcileSelectedWithSuggestions(
  selected: SuggestedSolutionAction[],
  suggestions: SuggestedSolutionAction[]
): SuggestedSolutionAction[] {
  if (suggestions.length === 0) return selected;
  const byId = new Map(suggestions.map((s) => [s.id, s]));
  const byTitle = new Map(suggestions.map((s) => [normalizeTitle(s.titulo), s]));
  const out: SuggestedSolutionAction[] = [];
  const seen = new Set<string>();
  for (const item of selected) {
    const match = byId.get(item.id) ?? byTitle.get(normalizeTitle(item.titulo));
    if (match && !seen.has(match.id)) {
      seen.add(match.id);
      out.push(match);
    }
  }
  return out;
}

export function parseSelectedSolutionActions(data: InitialFormData): SuggestedSolutionAction[] {
  const raw = data[SELECTED_SOLUTION_ACTIONS_KEY];
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SuggestedSolutionAction => {
      return Boolean(item && typeof item === 'object' && 'titulo' in item && 'draft' in item);
    });
  } catch {
    return [];
  }
}

export function serializeSelectedSolutionActions(actions: SuggestedSolutionAction[]): string {
  return JSON.stringify(actions);
}

const SESSION_KEY = 'mm.design.selectedActions';

export function stashSelectedSolutionActions(actions: SuggestedSolutionAction[]): void {
  try {
    sessionStorage.setItem(SESSION_KEY, serializeSelectedSolutionActions(actions));
  } catch {
    /* quota / private mode */
  }
}

export function readStashedSelectedSolutionActions(): SuggestedSolutionAction[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is SuggestedSolutionAction => {
      return Boolean(item && typeof item === 'object' && 'titulo' in item && 'draft' in item);
    });
  } catch {
    return [];
  }
}

export function withSelectedSolutionActions(
  data: InitialFormData,
  actions: SuggestedSolutionAction[]
): InitialFormData {
  const summary = actions.map((a) => a.titulo).join('; ');
  return {
    ...data,
    [SELECTED_SOLUTION_ACTIONS_KEY]: serializeSelectedSolutionActions(actions),
    solucaoSelecionadaDesign: summary,
    solucoesPrioritarias: summary,
  };
}

const SUGGESTIONS_CACHE_PREFIX = 'mm.solutionPick.cache.';

export type CachedSolutionPickResult = {
  suggestions: SuggestedSolutionAction[];
  companySummary?: string | null;
  companySituation?: string | null;
  demoMode?: boolean;
  demoReason?: string;
  usedRag?: boolean;
};

export function clearCachedSolutionPick(context?: string): void {
  try {
    if (context?.trim()) {
      sessionStorage.removeItem(`${SUGGESTIONS_CACHE_PREFIX}${hashDiagnosticContext(context)}`);
      return;
    }
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(SUGGESTIONS_CACHE_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    /* private mode */
  }
}

function hashDiagnosticContext(context: string): string {
  let hash = 0;
  for (let i = 0; i < context.length; i += 1) {
    hash = (Math.imul(31, hash) + context.charCodeAt(i)) | 0;
  }
  return `${context.length}-${(hash >>> 0).toString(36)}`;
}

export function readCachedSolutionPick(context: string): CachedSolutionPickResult | null {
  if (!context.trim()) return null;
  try {
    const raw = sessionStorage.getItem(`${SUGGESTIONS_CACHE_PREFIX}${hashDiagnosticContext(context)}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedSolutionPickResult;
    if (!parsed?.suggestions?.length) return null;
    if (parsed.demoMode) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedSolutionPick(context: string, result: CachedSolutionPickResult): void {
  if (!context.trim() || !result.suggestions.length || result.demoMode) return;
  try {
    sessionStorage.setItem(
      `${SUGGESTIONS_CACHE_PREFIX}${hashDiagnosticContext(context)}`,
      JSON.stringify(result)
    );
  } catch {
    /* quota / private mode */
  }
}
