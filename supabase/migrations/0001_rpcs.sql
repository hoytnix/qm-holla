-- RPC for deducting credits transactionally
CREATE OR REPLACE FUNCTION deduct_credits(user_id UUID, amount INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  SELECT credit_balance INTO current_balance FROM profiles WHERE id = user_id FOR UPDATE;
  IF current_balance >= amount THEN
    UPDATE profiles SET credit_balance = credit_balance - amount WHERE id = user_id;
    INSERT INTO credit_ledger (user_id, amount, description) VALUES (user_id, -amount, 'Chat inference');
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for semantic search
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
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb_embeddings.id,
    kb_embeddings.content,
    1 - (kb_embeddings.embedding <=> query_embedding) AS similarity
  FROM kb_embeddings
  WHERE kb_embeddings.kb_id = p_kb_id
    AND 1 - (kb_embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY kb_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
