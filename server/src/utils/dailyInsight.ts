/** Stable YYYY-MM-DD key in local timezone — changes once per calendar day. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Deterministic hash so the same day + salt always picks the same item. */
export function dayHash(salt = '', date: Date = new Date()): number {
  const raw = `${dayKey(date)}::${salt}`;
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}
