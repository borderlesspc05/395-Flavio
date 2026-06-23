import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { embedText } from './embeddings';
import { getRagTopK, isRagEnabled, isRagVectorConfigured } from './ragConfig';
import type { RagSearchResponse, RagSearchResult } from './ragTypes';

let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (!env.rag.supabaseUrl || !env.rag.supabaseServiceRoleKey) return null;
  if (!supabaseClient) {
    supabaseClient = createClient(env.rag.supabaseUrl, env.rag.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabaseClient;
}

function formatChunkMarkdown(chunk: RagSearchResult, index: number): string {
  const meta = chunk.metadata ?? {};
  const title = String(meta.title ?? meta.source ?? 'Magnus Mind');
  const wave = String(meta.wave ?? 'não informada');
  const similarity =
    chunk.similarity != null ? `${(chunk.similarity * 100).toFixed(1)}%` : '—';

  return `
### Trecho recuperado ${index + 1}

Fonte: ${title}
Onda: ${wave}
Similaridade: ${similarity}

${chunk.text}
`.trim();
}

export async function searchUserRagContext(
  userId: string,
  query: string,
  topK?: number
): Promise<RagSearchResponse> {
  const empty: RagSearchResponse = { context: '', chunkCount: 0 };

  if (!isRagEnabled()) return empty;
  if (!isRagVectorConfigured()) return empty;

  const trimmedQuery = query.trim();
  if (!trimmedQuery) return empty;

  const supabase = getSupabase();
  if (!supabase) return empty;

  const matchCount = topK ?? getRagTopK();
  const embedding = await embedText(trimmedQuery);
  if (!embedding) return empty;

  try {
    const { data, error } = await supabase.rpc('match_rag_chunks', {
      query_embedding: embedding,
      match_user_id: userId,
      match_count: matchCount,
    });

    if (error) {
      console.error('[RAG] Search error:', error.message);
      return empty;
    }

    const rows = (data ?? []) as RagSearchResult[];
    if (!rows.length) return empty;

    const context = rows.map((chunk, index) => formatChunkMarkdown(chunk, index)).join('\n\n---\n\n');

    console.log(`[RAG] usedRag=true chunks=${rows.length} userId=${userId}`);

    return { context, chunkCount: rows.length };
  } catch (err) {
    console.error('[RAG] Search failed:', err);
    return empty;
  }
}

/** Compat: retorna apenas o markdown (string vazia em falha). */
export async function searchUserRagContextText(
  userId: string,
  query: string,
  topK?: number
): Promise<string> {
  const result = await searchUserRagContext(userId, query, topK);
  return result.context;
}
