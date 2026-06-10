import type { InitialFormData } from '../types';
import type { SuggestedSolutionAction } from '../types/solutionPick';
import { SELECTED_SOLUTION_ACTIONS_KEY } from '../types/solutionPick';

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
