/** Origens sempre permitidas além da lista em CORS_ORIGIN (domínio de produção). */
const TRUSTED_HOST_SUFFIXES = ['.magnusmind.io', '.netlify.app'] as const;

export function isCorsOriginAllowed(
  origin: string | undefined,
  allowed: string | string[],
): boolean {
  if (!origin) return true;
  if (allowed === '*') return true;

  const list = Array.isArray(allowed) ? allowed : [allowed];
  if (list.includes(origin)) return true;

  try {
    const host = new URL(origin).hostname.toLowerCase();
    if (host === 'magnusmind.io') return true;
    return TRUSTED_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
  } catch {
    return false;
  }
}

export function createCorsOriginCallback(allowed: string | string[]) {
  if (allowed === '*') return '*';

  return (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean | string) => void,
  ) => {
    if (isCorsOriginAllowed(origin, allowed)) {
      callback(null, origin ?? true);
      return;
    }
    callback(null, false);
  };
}
