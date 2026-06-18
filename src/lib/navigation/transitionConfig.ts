export type NavigationType = 'POP' | 'PUSH' | 'REPLACE';

const ROUTE_FLOW: string[] = [
  '/',
  '/planos',
  '/login',
  '/register',
  '/mock-checkout',
  '/escolher-projeto',
  '/dashboard/inicio',
  '/dashboard/initial-form',
  '/dashboard/scans',
  '/dashboard/design',
  '/dashboard/objetivos',
  '/dashboard/relatorios',
  '/dashboard/minha-equipe',
  '/dashboard/historico',
  '/dashboard/conta',
];

function normalizePath(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function flowIndex(pathname: string): number {
  const path = normalizePath(pathname);

  if (path.startsWith('/dashboard/scans/')) {
    const scansIndex = ROUTE_FLOW.indexOf('/dashboard/scans');
    return scansIndex >= 0 ? scansIndex + 0.5 : ROUTE_FLOW.length;
  }

  const exact = ROUTE_FLOW.indexOf(path);
  if (exact >= 0) return exact;

  if (path.startsWith('/colaborador')) {
    return ROUTE_FLOW.indexOf('/login');
  }

  if (path.startsWith('/admin')) {
    return ROUTE_FLOW.length + 1;
  }

  return ROUTE_FLOW.length;
}

export function getTransitionDirection(
  from: string,
  to: string,
  type: NavigationType
): 1 | -1 {
  if (type === 'POP') return -1;
  const fromIdx = flowIndex(from);
  const toIdx = flowIndex(to);
  return toIdx >= fromIdx ? 1 : -1;
}

export function resolveTransitionKey(pathname: string, scope: 'section' | 'full'): string {
  const path = normalizePath(pathname);
  if (scope === 'full') return path;
  if (path.startsWith('/dashboard/scans/')) return '/dashboard/scans';
  return path;
}

export function shouldUseTabVariant(from: string, to: string): boolean {
  const fromPath = normalizePath(from);
  const toPath = normalizePath(to);
  if (fromPath === toPath) return false;
  return fromPath.startsWith('/dashboard/scans') && toPath.startsWith('/dashboard/scans');
}

export const PAGE_MOTION = { duration: 0.38, ease: [0.22, 1, 0.36, 1] as const };
export const TAB_MOTION = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };
