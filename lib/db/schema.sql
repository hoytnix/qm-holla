-- Agents & Hierarchy
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  avatar_url TEXT,
  system_prompt TEXT NOT NULL,
  routing_description TEXT,
  parent_agent_id TEXT REFERENCES agents(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects & Leaf Workspaces
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'dev', 'marketing', 'finance', 'health', 'operations', 'research'
  is_private INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge Bases & Areas (compatible with vault collections)
CREATE TABLE IF NOT EXISTS kbs (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- In-Database Markdown Documents
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  kb_id TEXT REFERENCES kbs(id),
  agent_id TEXT REFERENCES agents(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT, -- JSON string for tags, frontmatter, and source context
  file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Subagent Tasks linked to Projects
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  title TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending' | 'in_progress' | 'completed'
  priority TEXT DEFAULT 'medium',
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Full-Text Search Virtual Table (FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
  title,
  content,
  content=documents,
  content_rowid=rowid
);

-- Chat Messages & Delegation Ledger
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  sender_type TEXT NOT NULL, -- 'user' | 'orchestrator' | 'agent'
  agent_id TEXT REFERENCES agents(id),
  content TEXT NOT NULL,
  delegation_trace TEXT, -- JSON payload of sub-agent hops
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Local Key-Value Configuration Storage (BYOK & Model Settings)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Triggers to keep FTS index synchronized with documents
CREATE TRIGGER IF NOT EXISTS documents_ai AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content);
END;

CREATE TRIGGER IF NOT EXISTS documents_ad AFTER DELETE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, content) VALUES('delete', old.rowid, old.title, old.content);
END;

CREATE TRIGGER IF NOT EXISTS documents_au AFTER UPDATE ON documents BEGIN
  INSERT INTO documents_fts(documents_fts, rowid, title, content) VALUES('delete', old.rowid, old.title, old.content);
  INSERT INTO documents_fts(rowid, title, content) VALUES (new.rowid, new.title, new.content);
END;
