-- RPC: Match Agent KB Embeddings (Direct KB ID search)
CREATE OR REPLACE FUNCTION match_agent_kb_embeddings(
  query_embedding vector(768),
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
    kb_embeddings.id,
    kb_embeddings.content,
    1 - (kb_embeddings.embedding <=> query_embedding) as similarity
  FROM kb_embeddings
  WHERE 1 - (kb_embeddings.embedding <=> query_embedding) > match_threshold
  AND kb_embeddings.kb_id = p_kb_id
  ORDER BY kb_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
