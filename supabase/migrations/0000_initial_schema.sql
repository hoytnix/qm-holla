-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Enums
CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE ui_field_type AS ENUM ('text', 'number', 'toggle', 'file', 'select');

-- PROFILES
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role DEFAULT 'user',
  credit_balance INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- AGENTS
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  system_prompt_template TEXT,
  allowed_models TEXT[],
  initial_suggestions TEXT[],
  branding_config JSONB DEFAULT '{}'::jsonb,
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- STRUCTURED FIELDS
CREATE TABLE structured_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  ui_type ui_field_type DEFAULT 'text',
  options JSONB,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE structured_fields ENABLE ROW LEVEL SECURITY;

-- MODEL PRICES
CREATE TABLE model_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_string TEXT UNIQUE NOT NULL,
  fixed_cost INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE model_prices ENABLE ROW LEVEL SECURITY;

-- PROJECTS
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- CHAT HISTORY
CREATE TABLE chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- USER KBS
CREATE TABLE user_kbs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_kbs ENABLE ROW LEVEL SECURITY;

-- KB ATTACHMENTS
CREATE TABLE kb_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_id UUID REFERENCES user_kbs(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE kb_attachments ENABLE ROW LEVEL SECURITY;

-- KB EMBEDDINGS
CREATE TABLE kb_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kb_id UUID REFERENCES user_kbs(id) ON DELETE CASCADE,
  attachment_id UUID REFERENCES kb_attachments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE kb_embeddings ENABLE ROW LEVEL SECURITY;

-- CREDIT LEDGER
CREATE TABLE credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;

-- RPC: Deduct Credits
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INTEGER;
BEGIN
  -- Check balance
  SELECT credit_balance INTO v_current_balance FROM profiles WHERE id = p_user_id;
  
  IF v_current_balance < p_amount THEN
    RETURN FALSE;
  END IF;

  -- Deduct
  UPDATE profiles SET credit_balance = credit_balance - p_amount WHERE id = p_user_id;
  
  -- Log
  INSERT INTO credit_ledger (user_id, amount, description) VALUES (p_user_id, -p_amount, p_description);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Match Embeddings (RAG)
CREATE OR REPLACE FUNCTION match_kb_embeddings(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_user_id UUID
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
  JOIN user_kbs ON kb_embeddings.kb_id = user_kbs.id
  WHERE 1 - (kb_embeddings.embedding <=> query_embedding) > match_threshold
  AND user_kbs.user_id = p_user_id
  ORDER BY kb_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- RLS POLICIES

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles RLS
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT USING (is_admin());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Agents RLS
CREATE POLICY "Anyone can read published agents" ON agents FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage agents" ON agents FOR ALL USING (is_admin());

-- Structured Fields RLS
CREATE POLICY "Anyone can read fields for published agents" ON structured_fields FOR SELECT USING (
  EXISTS (SELECT 1 FROM agents WHERE id = structured_fields.agent_id AND is_published = true)
);
CREATE POLICY "Admins can manage structured fields" ON structured_fields FOR ALL USING (is_admin());

-- Model Prices RLS (Readable ONLY by Admins as requested)
CREATE POLICY "Admins can manage model prices" ON model_prices FOR ALL USING (is_admin());

-- Projects RLS
CREATE POLICY "Users can manage own projects" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all projects" ON projects FOR SELECT USING (is_admin());

-- Chat History RLS
CREATE POLICY "Users can manage own chat history" ON chat_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all chat history" ON chat_history FOR SELECT USING (is_admin());

-- User KBs RLS
CREATE POLICY "Users can manage own KBs" ON user_kbs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all KBs" ON user_kbs FOR SELECT USING (is_admin());

-- KB Attachments RLS
CREATE POLICY "Users can manage own KB attachments" ON kb_attachments FOR ALL USING (
  EXISTS (SELECT 1 FROM user_kbs WHERE id = kb_attachments.kb_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can read all KB attachments" ON kb_attachments FOR SELECT USING (is_admin());

-- KB Embeddings RLS
CREATE POLICY "Users can manage own KB embeddings" ON kb_embeddings FOR ALL USING (
  EXISTS (SELECT 1 FROM user_kbs WHERE id = kb_embeddings.kb_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can read all KB embeddings" ON kb_embeddings FOR SELECT USING (is_admin());

-- Credit Ledger RLS
CREATE POLICY "Users can read own ledger" ON credit_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage ledger" ON credit_ledger FOR ALL USING (is_admin());

-- TRIGGER: on_auth_user_created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, credit_balance)
  VALUES (new.id, 'user', 100); -- Give 100 initial credits
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
