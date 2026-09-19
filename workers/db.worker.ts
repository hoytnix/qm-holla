import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

let db: any = null;

// Initial schema migration string
const SCHEMA_SQL = `
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

CREATE TABLE IF NOT EXISTS kbs (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  kb_id TEXT NOT NULL REFERENCES kbs(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  file_path TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
  title,
  content,
  content=documents,
  content_rowid=rowid
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  sender_type TEXT NOT NULL,
  agent_id TEXT REFERENCES agents(id),
  content TEXT NOT NULL,
  delegation_trace TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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
`;

async function initDb() {
  if (db) return;
  const sqlite3 = await (sqlite3InitModule as any)({
    print: console.log,
    printErr: console.error,
  });

  if ('opfs' in sqlite3) {
    db = new sqlite3.oo1.OpfsDb('/quarkmeme.db');
  } else {
    console.warn('OPFS not supported in this environment, falling back to in-memory transient DB');
    db = new sqlite3.oo1.DB(':memory:');
  }

  // Run schema migrations
  db.exec(SCHEMA_SQL);
}

// Handle incoming messages from the main thread
self.onmessage = async (e: MessageEvent) => {
  const { id, action, payload } = e.data;

  try {
    if (action === 'init') {
      await initDb();
      self.postMessage({ id, success: true });
      return;
    }

    if (!db) {
      await initDb();
    }

    switch (action) {
      case 'exec': {
        const { sql, bind } = payload;
        const rows: any[] = [];
        db.exec({
          sql,
          bind: bind || [],
          rowMode: 'object',
          callback: (row: any) => {
            rows.push(row);
          },
        });
        self.postMessage({ id, success: true, data: rows });
        break;
      }

      case 'run': {
        const { sql, bind } = payload;
        db.exec({
          sql,
          bind: bind || [],
        });
        self.postMessage({ id, success: true });
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    self.postMessage({
      id,
      success: false,
      error: error?.message || String(error),
    });
  }
};
