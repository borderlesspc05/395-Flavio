const DEFAULT_MAX_CHARS = 2500;

/**
 * Divide texto longo em chunks (~300–800 tokens) preservando frases quando possível.
 */
export function chunkText(text: string, maxChars = DEFAULT_MAX_CHARS): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];

  if (clean.length <= maxChars) return [clean];

  const chunks: string[] = [];
  let current = '';
  const sentences = clean.split(/(?<=[.!?])\s+/);

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (trimmed.length > maxChars) {
      if (current.trim()) {
        chunks.push(current.trim());
        current = '';
      }
      for (let i = 0; i < trimmed.length; i += maxChars) {
        const part = trimmed.slice(i, i + maxChars).trim();
        if (part) chunks.push(part);
      }
      continue;
    }

    const candidate = current ? `${current} ${trimmed}` : trimmed;
    if (candidate.length > maxChars) {
      if (current.trim()) chunks.push(current.trim());
      current = trimmed;
    } else {
      current = candidate;
    }
  }

  if (current.trim()) chunks.push(current.trim());

  return chunks.filter(Boolean);
}
