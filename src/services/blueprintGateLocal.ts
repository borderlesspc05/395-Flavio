import type { BlueprintGateParsed } from './api';

/** Heurística local quando a API ainda não tem POST /api/ai/blueprint-gate (deploy desatualizado). */
export function localBlueprintGateSuggest(diagnosticContext: string): {
  reply: string;
  parsed: BlueprintGateParsed;
  localFallback: true;
} {
  const lower = diagnosticContext.toLowerCase();
  const structural =
    lower.includes('processo') ||
    lower.includes('sistema') ||
    lower.includes('governança') ||
    lower.includes('governanca') ||
    lower.includes('estrutur') ||
    lower.includes('fricção') ||
    lower.includes('friccao') ||
    lower.includes('decisão') ||
    lower.includes('decisao');
  const path: 'A' | 'B' = structural ? 'B' : 'A';
  const parsed: BlueprintGateParsed = {
    recommendedPath: path,
    rationale:
      'Classificação heurística local a partir do diagnóstico (sem chamada OpenRouter). Confirme manualmente o caminho A ou B.',
    pathASignals: path === 'A' ? ['Heurística: foco em performance humana / habilidade'] : [],
    pathBSignals: path === 'B' ? ['Heurística: indícios de tema sistêmico ou estrutural'] : [],
    questionForUser: 'Este resultado é provisório. Qual caminho (A ou B) faz sentido para o seu caso?',
  };
  return { reply: JSON.stringify(parsed, null, 2), parsed, localFallback: true };
}
