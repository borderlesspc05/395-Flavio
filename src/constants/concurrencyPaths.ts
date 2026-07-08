/** Rotas com limite de concorrência por plano — manter em sync com server/src/constants/concurrencyPaths.ts */
export const CONCURRENCY_LIMITED_PATHS = [
  '/api/ai/chat',
  '/api/ai/blueprint-gate',
  '/api/ai/solution-pick-suggest',
  '/api/ai/domain-learnings',
  '/api/ai/evolution-loop',
  '/api/objectives/suggest',
  '/api/action-canvases/suggest',
  '/api/reports/generate',
] as const;

export function isConcurrencyLimitedPath(path: string): boolean {
  return CONCURRENCY_LIMITED_PATHS.some((p) => path.includes(p));
}
