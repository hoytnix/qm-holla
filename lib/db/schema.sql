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

-- Knowledge Bases & Areas
CREATE TABLE IF NOT EXISTS kbs (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  kb_id TEXT NOT NULL REFERENCES kbs(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  file_path TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Full Text Search for Retrieval
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
