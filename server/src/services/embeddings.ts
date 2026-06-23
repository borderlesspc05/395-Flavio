import OpenAI from 'openai';
import { env } from '../config/env';

const MAX_EMBED_CHARS = 8000;

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  if (!env.openai.apiKey) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: env.openai.apiKey });
  }
  return openaiClient;
}

export async function embedText(text: string): Promise<number[] | null> {
  const cleanText = text.replace(/\s+/g, ' ').trim().slice(0, MAX_EMBED_CHARS);
  if (!cleanText) return null;

  const client = getOpenAI();
  if (!client) {
    console.warn('[RAG] embedText skipped: OPENAI_API_KEY not configured');
    return null;
  }

  try {
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: cleanText,
    });
    const embedding = response.data[0]?.embedding;
    if (!embedding?.length) {
      console.warn('[RAG] embedText returned empty embedding');
      return null;
    }
    return embedding;
  } catch (err) {
    console.error('[RAG] embedText failed:', err);
    return null;
  }
}
