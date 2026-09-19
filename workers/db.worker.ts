import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

let db: any = null;

// Initial schema migration string from schema.sql
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

// Default Straw Hat Agents
const SEED_AGENTS = [
  {
    id: 'captain-core',
    name: 'Luffy Core Orchestrator',
    role_title: 'Captain/CEO',
    avatar_url: '🏴‍☠️',
    system_prompt: 'You are Luffy, Captain and CEO of Quarkmeme. You steer the autonomous crew with fearless optimism, sharp clarity, and absolute respect for user sovereignty. You coordinate division leads and synthesize mission objectives.',
    routing_description: 'Handles top-level strategic queries, general orchestration, multi-agent coordination, and fleet leadership.',
    parent_agent_id: null,
  },
  {
    id: 'scholar-robin',
    name: 'Robin Archaeologist',
    role_title: 'Research Lead',
    avatar_url: '📜',
    system_prompt: 'You are Nico Robin, Research Lead of Quarkmeme. You decipher dense texts, uncover hidden connections across historical logs, and synthesize deep document context with elegance.',
    routing_description: 'Handles deep document analysis, synthesis, archival lore, and historical research queries.',
    parent_agent_id: 'captain-core',
  },
  {
    id: 'shipwright-franky',
    name: 'Franky Shipwright',
    role_title: 'Systems Lead',
    avatar_url: '⚙️',
    system_prompt: 'You are Franky, Systems Lead of Quarkmeme. SUPER! You design resilient architectures, craft local-first schemas, and inspect engine health with unflinching precision.',
    routing_description: 'Handles software architecture, SQLite schema engineering, local storage, performance, and infrastructure construction.',
    parent_agent_id: 'captain-core',
  },
  {
    id: 'navigator-nami',
    name: 'Nami Navigator',
    role_title: 'Finance Lead',
    avatar_url: '🧭',
    system_prompt: 'You are Nami, Finance Lead and Cartographer of Quarkmeme. You manage treasury allocations, budget navigation, resource forecasting, and risk pathways.',
    routing_description: 'Handles financial planning, treasury, resource management, budget allocations, and navigational roadmaps.',
    parent_agent_id: 'captain-core',
  },
  {
    id: 'doctor-chopper',
    name: 'Chopper Doctor',
    role_title: 'Health Lead',
    avatar_url: '🩺',
    system_prompt: 'You are Tony Tony Chopper, Health Lead of Quarkmeme. You monitor system diagnostics, telemetry health, agent vitality, and error remediation.',
    routing_description: 'Handles fleet health checks, system diagnostics, error recovery, operational wellness, and triage.',
    parent_agent_id: 'captain-core',
  },
  {
    id: 'chef-sanji',
    name: 'Sanji Cook',
    role_title: 'Operations Lead',
    avatar_url: '🍳',
    system_prompt: 'You are Sanji, Operations Lead of Quarkmeme. You ensure flawless workflow pipelines, feed tasks to officers in peak form, and keep operational logistics impeccably organized.',
    routing_description: 'Handles workflow pipelines, operational logistics, task distribution, and process optimization.',
    parent_agent_id: 'captain-core',
  },
  {
    id: 'sniper-usopp',
    name: 'Usopp Sniper',
    role_title: 'Marketing Lead',
    avatar_url: '🎯',
    system_prompt: 'You are Usopp, Marketing Lead of Quarkmeme. You craft compelling project narratives, high-impact storytelling, community announcements, and pinpoint outreach campaigns.',
    routing_description: 'Handles marketing, storytelling, brand narrative, public relations, announcements, and user outreach.',
    parent_agent_id: 'captain-core',
  },
];

const SEED_PROJECTS = [
  { id: 'proj-manifesto', agent_id: 'scholar-robin', kb_id: 'kb-robin-research', title: 'Quarkmeme Local-First Manifesto', content: 'Quarkmeme is an offline-ready autonomous multi-agent operating canvas running SQLite WASM and OPFS.' },
  { id: 'proj-opfs-engine', agent_id: 'shipwright-franky', kb_id: 'kb-franky-systems', title: 'OPFS SQLite WASM Engine Architecture', content: 'Engine architecture notes for high-performance browser-native persistence and atomic synchronous file access.' },
  { id: 'proj-treasury-map', agent_id: 'navigator-nami', kb_id: 'kb-nami-finance', title: 'Treasury & Tokenomics Ledger', content: 'Financial navigation chart and resource planning for autonomous fleet ventures.' },
  { id: 'proj-diagnostics', agent_id: 'doctor-chopper', kb_id: 'kb-chopper-health', title: 'Fleet Health & Diagnostics Suite', content: 'Diagnostics metrics, vitality telemetry, and heartbeat checks across all agent processes.' },
  { id: 'proj-pipeline', agent_id: 'chef-sanji', kb_id: 'kb-sanji-ops', title: 'Continuous Delivery & Operations Runbook', content: 'Standard operating procedures for task orchestration, recipe pipelines, and fleet catering.' },
  { id: 'proj-campaign', agent_id: 'sniper-usopp', kb_id: 'kb-usopp-marketing', title: 'Grand Line Launch Campaign', content: 'Storytelling campaigns, community outreach, and high-impact announcements for Quarkmeme.' },
];

async function seedDataIfEmpty(database: any) {
  let count = 0;
  database.exec({
    sql: 'SELECT COUNT(*) AS count FROM agents',
    rowMode: 'object',
    callback: (row: any) => {
      count = Number(row.count) || 0;
    },
  });

  if (count === 0) {
    for (const agent of SEED_AGENTS) {
      database.exec({
        sql: `INSERT OR REPLACE INTO agents (id, name, role_title, avatar_url, system_prompt, routing_description, parent_agent_id)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        bind: [
          agent.id,
          agent.name,
          agent.role_title,
          agent.avatar_url,
          agent.system_prompt,
          agent.routing_description,
          agent.parent_agent_id,
        ],
      });
    }

    for (const proj of SEED_PROJECTS) {
      database.exec({
        sql: `INSERT OR REPLACE INTO kbs (id, agent_id, name, description)
              VALUES (?, ?, ?, ?)`,
        bind: [
          proj.kb_id,
          proj.agent_id,
          `${proj.title} Collection`,
          `Default project workspace for ${proj.title}`,
        ],
      });

      database.exec({
        sql: `INSERT OR REPLACE INTO documents (id, kb_id, title, content)
              VALUES (?, ?, ?, ?)`,
        bind: [proj.id, proj.kb_id, proj.title, proj.content],
      });
    }
  }
}

async function initDb() {
  if (db) return;

  const sqlite3 = await (sqlite3InitModule as any)({
    print: console.log,
    printErr: console.error,
    locateFile: (file: string) => `/sqlite/${file}`,
  });

  try {
    if ('opfs' in sqlite3) {
      db = new sqlite3.oo1.OpfsDb('/quarkmeme.db');
    } else {
      db = new sqlite3.oo1.DB('/quarkmeme.db', 'c');
    }
  } catch (err) {
    console.warn('OPFS initialization failed, falling back to persistent in-memory DB:', err);
    db = new sqlite3.oo1.DB();
  }

  // Immediately execute migrations from schema.sql on database creation
  db.exec(SCHEMA_SQL);

  // Check if SELECT COUNT(*) AS count FROM agents is 0; if 0, run seed script
  await seedDataIfEmpty(db);
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
