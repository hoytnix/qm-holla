-- Add default_model to agents if it doesn't exist
DO $body$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agents' AND column_name='default_model') THEN
        ALTER TABLE agents ADD COLUMN default_model TEXT;
    END IF;
END $body$;

-- Add display_name to model_prices if it doesn't exist
DO $body$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='model_prices' AND column_name='display_name') THEN
        ALTER TABLE model_prices ADD COLUMN display_name TEXT;
    END IF;
END $body$;

-- RPC to get ledger with emails
CREATE OR REPLACE FUNCTION get_ledger_with_emails()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  email VARCHAR,
  amount INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ
) AS $body$
BEGIN
  RETURN QUERY
  SELECT 
    cl.id,
    cl.user_id,
    au.email::VARCHAR,
    cl.amount,
    cl.description,
    cl.created_at
  FROM credit_ledger cl
  JOIN auth.users au ON cl.user_id = au.id
  ORDER BY cl.created_at DESC;
END;
$body$ LANGUAGE plpgsql SECURITY DEFINER;
