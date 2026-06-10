import type { SuggestedActionCanvasDraft } from './index';

export type SolutionActionCategory =
  | 'pessoas'
  | 'processo'
  | 'tecnologia'
  | 'estrutura'
  | 'comunicacao'
  | 'outro';

export interface SuggestedSolutionAction {
  id: string;
  titulo: string;
  descricao: string;
  score: number;
  categoria: SolutionActionCategory;
  rationale: string;
  draft: SuggestedActionCanvasDraft;
}

export const SELECTED_SOLUTION_ACTIONS_KEY = 'selectedSolutionActionsJson';
