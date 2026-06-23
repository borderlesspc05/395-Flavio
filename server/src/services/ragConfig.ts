import { env } from '../config/env';

export function isRagEnabled(): boolean {
  return process.env.RAG_ENABLED === 'true';
}

export function getRagTopK(): number {
  const parsed = Number(process.env.RAG_TOP_K ?? 5);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

export function isRagVectorConfigured(): boolean {
  return Boolean(
    isRagEnabled() &&
      env.rag.supabaseUrl &&
      env.rag.supabaseServiceRoleKey &&
      env.openai.apiKey
  );
}
