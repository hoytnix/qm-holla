-- Migration 0003: Alter vector dimensions to 1536 for OpenRouter/OpenAI embeddings

-- 1. Alter the embedding column dimension
-- Note: This will fail if there is existing data. You may need to TRUNCATE kb_embeddings first.
ALTER TABLE kb_embeddings 
ALTER COLUMN embedding TYPE vector(1536);

-- 2. Recreate the match_kb_embeddings function (user_id version)
-- Dropping with exact signature to avoid conflicts
DROP FUNCTION IF EXISTS match_kb_embeddings(vector, double precision, integer, uuid);

CREATE OR REPLACE FUNCTION match_kb_embeddings(
  p_embedding vector(1536),
  p_similarity_threshold double precision,
  p_limit integer,
  p_user_id uuid
) RETURNS TABLE (
  id uuid, 
  content text, 
  similarity double precision
) 
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.content,
    1 - (k.embedding <=> p_embedding) AS similarity
  FROM kb_embeddings k
  JOIN user_kbs u ON k.kb_id = u.id
  WHERE (1 - (k.embedding <=> p_embedding)) > p_similarity_threshold
  AND u.user_id = p_user_id
  ORDER BY k.embedding <=> p_embedding
  LIMIT p_limit;
END;
$$;

-- 3. Recreate the match_kb_embeddings function (kb_id version)
DROP FUNCTION IF EXISTS match_kb_embeddings(vector, float, int, uuid);

CREATE OR REPLACE FUNCTION match_kb_embeddings(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_kb_id uuid
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.content,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM kb_embeddings k
  WHERE k.kb_id = p_kb_id
    AND (1 - (k.embedding <=> query_embedding)) > match_threshold
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 4. Recreate the match_agent_kb_embeddings function
DROP FUNCTION IF EXISTS match_agent_kb_embeddings(vector, float, int, uuid);

CREATE OR REPLACE FUNCTION match_agent_kb_embeddings(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_kb_id UUID
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    k.id,
    k.content,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM kb_embeddings k
  WHERE k.kb_id = p_kb_id
    AND (1 - (k.embedding <=> query_embedding)) > match_threshold
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;