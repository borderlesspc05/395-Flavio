const STORAGE_PREFIX = 'mm.mid.scanBaseline.';

export function getMidScanBaseline(cycleId: string | undefined): number | null {
  if (!cycleId || typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${cycleId}`);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Garante baseline na primeira medição do ciclo; retorna o valor de referência. */
export function ensureMidScanBaseline(cycleId: string | undefined, currentScore: number): number {
  if (!cycleId || typeof window === 'undefined') return currentScore;
  const key = `${STORAGE_PREFIX}${cycleId}`;
  const existing = window.localStorage.getItem(key);
  if (existing != null) {
    const n = Number(existing);
    return Number.isFinite(n) ? n : currentScore;
  }
  window.localStorage.setItem(key, String(currentScore));
  return currentScore;
}
