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

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  is_private INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
  project_id TEXT REFERENCES projects(id),
  kb_id TEXT REFERENCES kbs(id),
  agent_id TEXT REFERENCES agents(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT,
  file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  title TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

const SEED_AGENTS = [
  {
    id: 'captain-core',
    name: 'Luffy Core Orchestrator',
    role_title: 'Captain/CEO',
    avatar_url: 'crown',
    system_prompt: 'You are Luffy, Captain and CEO of Quarkmeme. You steer the autonomous crew with fearless optimism, sharp clarity, and absolute respect for user sovereignty. You coordinate division leads and synthesize mission objectives.',
    routing_description: 'Handles top-level strategic queries, general orchestration, multi-agent coordination, and fleet leadership.',
    parent_agent_id: null,
  },
  {
    id: 'scholar-robin',
    name: 'Robin Archaeologist',
    role_title: 'Research Lead',
    avatar_url: 'book-open',
    system_prompt: 'You are Nico Robin, Research Lead of Quarkmeme. You decipher dense texts, uncover hidden connections across historical logs, and synthesize deep document context with elegance.',
    routing_description: 'Handles deep document analysis, synthesis, archival lore, and historical research queries.',
    parent_agent_id: 'captain-core',
  },
  {
    id: 'shipwright-franky',
    name: 'Franky Shipwright',
    role_title: 'Systems Lead',
    avatar_url: 'cpu',
    system_prompt: 'You are Franky, Systems Lead of Quarkmeme. SUPER! You design resilient architectures, craft local-first schemas, and inspect engine health with unflinching precision.',
    routing_description: 'Handles software architecture, SQLite schema engineering, local storage, performance, and infrastructure construction.',
    parent_agent_id: 'captain-core',
  },
  {
    id: 'navigator-nami',
    name: 'Nami Navigator',
    role_title: 'Finance Lead',
    avatar_url: 'coins',
    system_prompt: 'You are Nami, Finance Lead and Cartographer of Quarkmeme. You manage treasury allocations, budget navigation, resource forecasting, and risk pathways.',
    routing_description: 'Handles financial planning, treasury, resource management, budget allocations, and navigational roadmaps.',
    parent_agent_id: 'captain-core',
  },
  {
    id: 'doctor-chopper',
    name: 'Chopper Doctor',
    role_title: 'Health Lead',
    avatar_url: 'activity',
    system_prompt: 'You are Tony Tony Chopper, Health Lead of Quarkmeme. You monitor system diagnostics, telemetry health, agent vitality, and error remediation.',
    routing_description: 'Handles fleet health checks, system diagnostics, error recovery, operational wellness, and triage.',
    parent_agent_id: 'captain-core',
  },
  {
    id: 'chef-sanji',
    name: 'Sanji Cook',
    role_title: 'Operations Lead',
    avatar_url: 'flame',
    system_prompt: 'You are Sanji, Operations Lead of Quarkmeme. You ensure flawless workflow pipelines, feed tasks to officers in peak form, and keep operational logistics impeccably organized.',
    routing_description: 'Handles workflow pipelines, operational logistics, task distribution, and process optimization.',
    parent_agent_id: 'captain-core',
  },
  {
    id: 'sniper-usopp',
    name: 'Usopp Sniper',
    role_title: 'Marketing Lead',
    avatar_url: 'target',
    system_prompt: 'You are Usopp, Marketing Lead of Quarkmeme. You craft compelling project narratives, high-impact storytelling, community announcements, and pinpoint outreach campaigns.',
    routing_description: 'Handles marketing, storytelling, brand narrative, public relations, announcements, and user outreach.',
    parent_agent_id: 'captain-core',
  },
];

const SEED_PROJECTS = [
  {
    id: 'proj-manifesto',
    agent_id: 'scholar-robin',
    title: 'Quarkmeme Local-First Manifesto',
    description: 'Decentralized local-first OS manifesto and archaeological archives.',
    category: 'research',
    is_private: 0,
  },
  {
    id: 'proj-opfs-engine',
    agent_id: 'shipwright-franky',
    title: 'OPFS SQLite Engine Architecture',
    description: 'Zero-cloud persistent storage engine with synchronous Web Worker thread isolation.',
    category: 'dev',
    is_private: 1,
  },
  {
    id: 'proj-treasury-map',
    agent_id: 'navigator-nami',
    title: 'Treasury & Tokenomics Ledger',
    description: 'Financial navigation chart, budget runway, and sovereign asset projections.',
    category: 'finance',
    is_private: 1,
  },
  {
    id: 'proj-diagnostics',
    agent_id: 'doctor-chopper',
    title: 'Fleet Health & Diagnostics Suite',
    description: 'Telemetry monitoring, habit consistency routines, and agent process health.',
    category: 'health',
    is_private: 0,
  },
  {
    id: 'proj-pipeline',
    agent_id: 'chef-sanji',
    title: 'Continuous Delivery & Operations',
    description: 'Operational pipelines, cross-division logistical flow, and standard runbooks.',
    category: 'operations',
    is_private: 0,
  },
  {
    id: 'proj-campaign',
    agent_id: 'sniper-usopp',
    title: 'Grand Line Launch Campaign',
    description: 'Community narrative, high-visibility storytelling, and release broadcasts.',
    category: 'marketing',
    is_private: 0,
  },
];

const SEED_TASKS = [
  {
    id: 'task-robin-1',
    project_id: 'proj-manifesto',
    agent_id: 'scholar-robin',
    title: 'Archive Grand Line archaeological stone scripts',
    status: 'completed',
    priority: 'high',
    completed_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'task-robin-2',
    project_id: 'proj-manifesto',
    agent_id: 'scholar-robin',
    title: 'Synthesize Poneglyph cryptographic lore fragments',
    status: 'pending',
    priority: 'medium',
  },
  {
    id: 'task-franky-1',
    project_id: 'proj-opfs-engine',
    agent_id: 'shipwright-franky',
    title: 'Configure OPFS synchronous proxy access handles',
    status: 'completed',
    priority: 'high',
    completed_at: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: 'task-franky-2',
    project_id: 'proj-opfs-engine',
    agent_id: 'shipwright-franky',
    title: 'Stress-test 100k BM25 FTS5 document indexing latency',
    status: 'pending',
    priority: 'high',
  },
  {
    id: 'task-nami-1',
    project_id: 'proj-treasury-map',
    agent_id: 'navigator-nami',
    title: 'Audit Grand Line supply provisions and Berry reserves',
    status: 'completed',
    priority: 'high',
    completed_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'task-nami-2',
    project_id: 'proj-treasury-map',
    agent_id: 'navigator-nami',
    title: 'Model 12-month zero-cloud sovereign hosting ledger',
    status: 'pending',
    priority: 'medium',
  },
  {
    id: 'task-chopper-1',
    project_id: 'proj-diagnostics',
    agent_id: 'doctor-chopper',
    title: 'Check agent memory leak telemetry in Web Worker',
    status: 'completed',
    priority: 'medium',
    completed_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'task-chopper-2',
    project_id: 'proj-diagnostics',
    agent_id: 'doctor-chopper',
    title: 'Verify 6:00 AM wakefulness and daily habit reminders',
    status: 'pending',
    priority: 'low',
  },
  {
    id: 'task-sanji-1',
    project_id: 'proj-pipeline',
    agent_id: 'chef-sanji',
    title: 'Prepare hot rations and task distribution queue',
    status: 'completed',
    priority: 'high',
    completed_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: 'task-sanji-2',
    project_id: 'proj-pipeline',
    agent_id: 'chef-sanji',
    title: 'Optimize cross-agent context dispatch pipelines',
    status: 'pending',
    priority: 'high',
  },
  {
    id: 'task-usopp-1',
    project_id: 'proj-campaign',
    agent_id: 'sniper-usopp',
    title: 'Draft Grand Line Launch announcement broadcast',
    status: 'completed',
    priority: 'high',
    completed_at: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: 'task-usopp-2',
    project_id: 'proj-campaign',
    agent_id: 'sniper-usopp',
    title: 'Design viral bounty posters for autonomous fleet release',
    status: 'pending',
    priority: 'medium',
  },
];

const SEED_DOCUMENTS = [
  {
    id: 'doc-manifesto',
    project_id: 'proj-manifesto',
    kb_id: 'kb-scholar-robin',
    agent_id: 'scholar-robin',
    title: 'Quarkmeme Local-First Manifesto.md',
    content: `# Quarkmeme Local-First Manifesto\n\n> "True sovereignty begins when your thoughts remain inside your own vessel."\n\n## Core Principles\n1. Zero Cloud Database Bills\n2. Radial Spatial Intelligence\n3. Deterministic Memory via SQLite WASM + OPFS`,
    metadata: JSON.stringify({ tags: ['manifesto', 'local-first', 'sovereignty'], author: 'Robin' }),
  },
  {
    id: 'doc-opfs-arch',
    project_id: 'proj-opfs-engine',
    kb_id: 'kb-shipwright-franky',
    agent_id: 'shipwright-franky',
    title: 'OPFS Architecture & VFS Proxy.md',
    content: `# OPFS Engine Architecture\n\nSUPER design specifications for browser persistence:\n- Web Worker Thread Isolation\n- Synchronous Access Handle\n- COOP & COEP Security Headers`,
    metadata: JSON.stringify({ tags: ['opfs', 'architecture', 'sqlite'], author: 'Franky' }),
  },
  {
    id: 'doc-treasury',
    project_id: 'proj-treasury-map',
    kb_id: 'kb-navigator-nami',
    agent_id: 'navigator-nami',
    title: 'Treasury & Navigation Roadmap.md',
    content: `# Fleet Treasury Roadmap\n\nFinancial projections for the Straw Hat autonomous fleet:\n- Cloud Expense: $0.00 / month\n- Local Storage: < 25MB footprint\n- Asset Allocation: Sovereign intelligence`,
    metadata: JSON.stringify({ tags: ['treasury', 'finance', 'roadmap'], author: 'Nami' }),
  },
  {
    id: 'doc-diagnostics',
    project_id: 'proj-diagnostics',
    kb_id: 'kb-doctor-chopper',
    agent_id: 'doctor-chopper',
    title: 'Daily Vitality & Diagnostics Runbook.md',
    content: `# Fleet Health & Telemetry Runbook\n\n- Heartbeat Frequency: 6:00 AM daily morning planning brief.\n- Vitals Checklist: Unreviewed commitments and habit chains.\n- Remediation: Self-healing SQLite state.`,
    metadata: JSON.stringify({ tags: ['health', 'habits', 'diagnostics'], author: 'Chopper' }),
  },
  {
    id: 'doc-pipeline',
    project_id: 'proj-pipeline',
    kb_id: 'kb-chef-sanji',
    agent_id: 'chef-sanji',
    title: 'Operations & Kitchen Log.md',
    content: `# Continuous Delivery & Operations\n\nWorkflow recipes for seamless inter-agent collaboration:\n1. Orchestrator receives user intent at the Helm.\n2. Shared memory bus gathers cross-project context.\n3. Transparent activity ledger updates.`,
    metadata: JSON.stringify({ tags: ['operations', 'pipeline', 'workflow'], author: 'Sanji' }),
  },
  {
    id: 'doc-campaign',
    project_id: 'proj-campaign',
    kb_id: 'kb-sniper-usopp',
    agent_id: 'sniper-usopp',
    title: 'Grand Line Launch Storytelling.md',
    content: `# Grand Line Launch Broadcast\n\nHear ye, adventurers across the digital sea!\nQuarkmeme sets sail today with 7 specialized crew members dedicated to your personal empire.`,
    metadata: JSON.stringify({ tags: ['launch', 'marketing', 'story'], author: 'Usopp' }),
  },
];

async function seedDataIfEmpty(database: any) {
  let agentCount = 0;
  database.exec({
    sql: 'SELECT COUNT(*) AS count FROM agents',
    rowMode: 'object',
    callback: (row: any) => {
      agentCount = Number(row.count) || 0;
    },
  });

  if (agentCount === 0) {
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
  }

  let projectCount = 0;
  database.exec({
    sql: 'SELECT COUNT(*) AS count FROM projects',
    rowMode: 'object',
    callback: (row: any) => {
      projectCount = Number(row.count) || 0;
    },
  });

  if (projectCount === 0) {
    for (const proj of SEED_PROJECTS) {
      database.exec({
        sql: `INSERT OR REPLACE INTO projects (id, agent_id, title, description, category, is_private)
              VALUES (?, ?, ?, ?, ?, ?)`,
        bind: [
          proj.id,
          proj.agent_id,
          proj.title,
          proj.description,
          proj.category,
          proj.is_private,
        ],
      });

      database.exec({
        sql: `INSERT OR REPLACE INTO kbs (id, agent_id, name, description)
              VALUES (?, ?, ?, ?)`,
        bind: [
          `kb-${proj.agent_id}`,
          proj.agent_id,
          `${proj.title} Collection`,
          proj.description,
        ],
      });
    }

    for (const task of SEED_TASKS) {
      database.exec({
        sql: `INSERT OR REPLACE INTO tasks (id, project_id, agent_id, title, status, priority, completed_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        bind: [
          task.id,
          task.project_id,
          task.agent_id,
          task.title,
          task.status,
          task.priority,
          task.completed_at || null,
        ],
      });
    }

    for (const doc of SEED_DOCUMENTS) {
      database.exec({
        sql: `INSERT OR REPLACE INTO documents (id, project_id, kb_id, agent_id, title, content, metadata)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        bind: [
          doc.id,
          doc.project_id,
          doc.kb_id,
          doc.agent_id,
          doc.title,
          doc.content,
          doc.metadata,
        ],
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

  // Check if count is 0; if 0, run seed script
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

      case 'SAVE_DOCUMENT': {
        const { doc } = payload;
        db.exec({
          sql: `INSERT OR REPLACE INTO documents (id, project_id, kb_id, agent_id, title, content, metadata, file_path, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          bind: [
            doc.id,
            doc.project_id || null,
            doc.kb_id || null,
            doc.agent_id || null,
            doc.title,
            doc.content,
            doc.metadata || null,
            doc.file_path || null,
          ],
        });
        self.postMessage({ id, success: true });
        break;
      }

      case 'GET_DOCUMENTS_BY_PROJECT': {
        const { projectId } = payload;
        const rows: any[] = [];
        db.exec({
          sql: `SELECT * FROM documents WHERE project_id = ? ORDER BY updated_at DESC`,
          bind: [projectId],
          rowMode: 'object',
          callback: (row: any) => {
            rows.push(row);
          },
        });
        self.postMessage({ id, success: true, data: rows });
        break;
      }

      case 'SEARCH_DOCUMENTS': {
        const { query, limit, agentId } = payload;
        const sanitizedQuery = (query || '')
          .replace(/["'*]/g, ' ')
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .join(' OR ');

        const rows: any[] = [];
        if (sanitizedQuery) {
          try {
            let sql = `
              SELECT d.id, d.project_id, d.kb_id, d.agent_id, d.title, d.content, d.metadata, bm25(documents_fts) as rank
              FROM documents_fts
              JOIN documents d ON documents_fts.rowid = d.rowid
              WHERE documents_fts MATCH ?
            `;
            const params: any[] = [sanitizedQuery];
            if (agentId) {
              sql += ` AND d.agent_id = ?`;
              params.push(agentId);
            }
            sql += ` ORDER BY rank LIMIT ?`;
            params.push(limit || 10);

            db.exec({
              sql,
              bind: params,
              rowMode: 'object',
              callback: (row: any) => {
                rows.push(row);
              },
            });
          } catch (e) {
            // Fallback LIKE
            let sql = `
              SELECT d.id, d.project_id, d.kb_id, d.agent_id, d.title, d.content, d.metadata
              FROM documents d
              WHERE (d.title LIKE ? OR d.content LIKE ?)
            `;
            const term = `%${query}%`;
            const params: any[] = [term, term];
            if (agentId) {
              sql += ` AND d.agent_id = ?`;
              params.push(agentId);
            }
            sql += ` LIMIT ?`;
            params.push(limit || 10);

            db.exec({
              sql,
              bind: params,
              rowMode: 'object',
              callback: (row: any) => {
                rows.push(row);
              },
            });
          }
        }
        self.postMessage({ id, success: true, data: rows });
        break;
      }

      case 'TOGGLE_TASK_STATUS': {
        const { taskId } = payload;
        let currentTask: any = null;
        db.exec({
          sql: `SELECT * FROM tasks WHERE id = ? LIMIT 1`,
          bind: [taskId],
          rowMode: 'object',
          callback: (row: any) => {
            currentTask = row;
          },
        });

        if (!currentTask) {
          throw new Error(`Task with id ${taskId} not found`);
        }

        const nextStatus = currentTask.status === 'completed' ? 'pending' : 'completed';
        const completedAt = nextStatus === 'completed' ? new Date().toISOString() : null;

        db.exec({
          sql: `UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?`,
          bind: [nextStatus, completedAt, taskId],
        });

        const updatedTask = {
          ...currentTask,
          status: nextStatus,
          completed_at: completedAt,
        };

        self.postMessage({ id, success: true, data: updatedTask });
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
