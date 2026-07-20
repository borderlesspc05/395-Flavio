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

/** Pick one item from a non-empty list; rotates across days. */
export function pickDaily<T>(items: T[], salt = '', date: Date = new Date()): T {
  if (items.length === 0) {
    throw new Error('pickDaily requires at least one item');
  }
  return items[dayHash(salt, date) % items.length];
}

/** Rotate/slice a list starting from today's offset. */
export function rotateDaily<T>(items: T[], salt = '', date: Date = new Date()): T[] {
  if (items.length <= 1) return items;
  const offset = dayHash(salt, date) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}
