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
