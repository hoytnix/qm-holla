-- Migration 0004: Multi-KB Search Support
-- This RPC allows searching across multiple Knowledge Bases simultaneously.

CREATE OR REPLACE FUNCTION match_kb_embeddings_multi(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_kb_ids uuid[]
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
  WHERE k.kb_id = ANY(p_kb_ids)
    AND (1 - (k.embedding <=> query_embedding)) > match_threshold
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
