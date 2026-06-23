import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { embedText } from './embeddings';
import { chunkText } from './ragChunker';
import { isRagEnabled, isRagVectorConfigured } from './ragConfig';
import type { RagSourceDocument } from './ragTypes';

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

function chunkId(doc: RagSourceDocument, index: number): string {
  return `${doc.userId}:${doc.source}:${doc.sourceId}:${index}`;
}

export async function indexRagDocument(doc: RagSourceDocument): Promise<number> {
  if (!isRagEnabled()) return 0;
  if (!isRagVectorConfigured()) {
    console.warn('[RAG] indexRagDocument skipped: vector store not configured');
    return 0;
  }

  const supabase = getSupabase();
  if (!supabase) return 0;

  const chunks = chunkText(doc.text);
  if (!chunks.length) return 0;

  try {
    const { error: deleteError } = await supabase
      .from('rag_chunks')
      .delete()
      .eq('user_id', doc.userId)
      .eq('source', doc.source)
      .eq('source_id', doc.sourceId);

    if (deleteError) {
      console.error(
        `[RAG] Failed to delete old chunks ${doc.source}/${doc.sourceId}:`,
        deleteError.message
      );
    }

    let indexed = 0;
    for (let i = 0; i < chunks.length; i++) {
      const text = chunks[i];
      const embedding = await embedText(text);
      if (!embedding) {
        console.warn(`[RAG] Skipping chunk ${i} for ${doc.source}/${doc.sourceId}: no embedding`);
        continue;
      }

      const row = {
        id: chunkId(doc, i),
        user_id: doc.userId,
        organization_id: doc.organizationId ?? null,
        wave: doc.wave,
        source: doc.source,
        source_id: doc.sourceId,
        chunk_index: i,
        text,
        metadata: {
          ...doc.metadata,
          title: doc.title,
          wave: doc.wave,
          source: doc.source,
          sourceId: doc.sourceId,
        },
        embedding,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('rag_chunks').upsert(row);
      if (error) {
        console.error(
          `[RAG] Failed to index chunk ${doc.source}/${doc.sourceId}:${i}:`,
          error.message
        );
        continue;
      }
      indexed++;
    }

    if (indexed > 0) {
      console.log(
        `[RAG] Indexed ${doc.source}/${doc.sourceId} chunks=${indexed} userId=${doc.userId}`
      );
    }

    return indexed;
  } catch (err) {
    console.error(`[RAG] Failed to index ${doc.source}/${doc.sourceId}:`, err);
    return 0;
  }
}

export async function deleteRagDocument(
  userId: string,
  source: string,
  sourceId: string
): Promise<void> {
  if (!isRagEnabled() || !isRagVectorConfigured()) return;

  const supabase = getSupabase();
  if (!supabase) return;

  try {
    await supabase
      .from('rag_chunks')
      .delete()
      .eq('user_id', userId)
      .eq('source', source)
      .eq('source_id', sourceId);
  } catch (err) {
    console.error(`[RAG] Failed to delete ${source}/${sourceId}:`, err);
  }
}
