# RAG vetorial — Supabase pgvector

O Magnus Mind usa **Firestore** como fonte oficial dos dados e **Supabase pgvector** apenas como índice vetorial para busca semântica.

## Pré-requisitos

1. Projeto Supabase com extensão `vector` habilitada
2. Variáveis no `server/.env`:
   - `RAG_ENABLED=true`
   - `RAG_TOP_K=5`
   - `OPENAI_API_KEY=` (embeddings `text-embedding-3-small`)
   - `SUPABASE_URL=`
   - `SUPABASE_SERVICE_ROLE_KEY=` (somente backend — nunca no frontend)

## Migration SQL

Execute no SQL Editor do Supabase:

```sql
create extension if not exists vector;

create table if not exists rag_chunks (
  id text primary key,
  user_id text not null,
  organization_id text,
  wave text,
  source text not null,
  source_id text not null,
  chunk_index int not null,
  text text not null,
  metadata jsonb default '{}',
  embedding vector(1536),
  updated_at timestamptz default now()
);

create index if not exists rag_chunks_user_idx
on rag_chunks (user_id);

create index if not exists rag_chunks_source_idx
on rag_chunks (source, source_id);

create index if not exists rag_chunks_embedding_idx
on rag_chunks
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

create or replace function match_rag_chunks(
  query_embedding vector(1536),
  match_user_id text,
  match_count int
)
returns table (
  id text,
  text text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    id,
    text,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from rag_chunks
  where user_id = match_user_id
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

> **Nota:** O índice `ivfflat` exige dados suficientes para treino eficiente. Em ambientes com poucos chunks, a busca sequencial ainda funciona.

## Reindexação manual

```http
POST /api/rag/reindex
x-user-id: {firebase-uid}
```

Resposta:

```json
{
  "ok": true,
  "userId": "abc123",
  "indexedDocuments": 12,
  "errors": [],
  "message": "Corpus RAG reindexado com sucesso.",
  "usedRag": true
}
```

## Indexação após salvar diagnóstico (client-side)

O diagnóstico é salvo direto no Firestore. Após `saveInitialFormDraft`, o frontend chama:

```http
POST /api/rag/index-initial-form
x-user-id: {firebase-uid}
```

## Fluxo

```
Firestore → normalização (ragSources) → chunking → embeddings (OpenAI) → Supabase
Pergunta → embedding → match_rag_chunks (filtro user_id) → prompt LLM
```

## Segurança

- Toda busca filtra por `user_id`
- `SUPABASE_SERVICE_ROLE_KEY` apenas no servidor Express
- RAG é camada de leitura — não sobrescreve Firestore
