/* Quarkmeme SQLite Engine - IndexedDB Backed */
'use strict';

try {
  importScripts('/sql-wasm.js');
} catch (e) {
  importScripts('https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.js');
}

let db = null;
let SQL = null;
let isInitialized = false;
let saveTimer = null;

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('quarkmeme_vault_v1', 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('db_store')) {
        req.result.createObjectStore('db_store');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadFromIDB() {
  try {
    const idb = await openIDB();
    return new Promise((resolve) => {
      const tx = idb.transaction('db_store', 'readonly');
      const store = tx.objectStore('db_store');
      const req = store.get('database.sqlite');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (_) {
    return null;
  }
}

async function saveToIDB(data) {
  try {
    const idb = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction('db_store', 'readwrite');
      const store = tx.objectStore('db_store');
      const req = store.put(data, 'database.sqlite');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[sqlite-engine] IDB write error:', err);
  }
}

function persistChanges() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (!db) return;
    try {
      const binary = db.export();
      await saveToIDB(binary);
      console.log('[sqlite-engine] State persisted to IndexedDB');
    } catch (err) {
      console.error('[sqlite-engine] Export failed:', err);
    }
  }, 200);
}

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
    title: 'IDB SQLite Engine Architecture',
    description: 'Zero-cloud persistent storage engine backed by IndexedDB binary persistence.',
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
    title: 'Configure IndexedDB binary debounced persistence',
    status: 'completed',
    priority: 'high',
    completed_at: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: 'task-franky-2',
    project_id: 'proj-opfs-engine',
    agent_id: 'shipwright-franky',
    title: 'Stress-test SQLite WASM query latency in Web Worker',
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
    content: `# Quarkmeme Local-First Manifesto\n\n> "True sovereignty begins when your thoughts remain inside your own vessel."\n\n## Core Principles\n1. Zero Cloud Database Bills\n2. Radial Spatial Intelligence\n3. Deterministic Memory via SQLite WASM + IndexedDB Persistence`,
    metadata: JSON.stringify({ tags: ['manifesto', 'local-first', 'sovereignty'], author: 'Robin' }),
  },
  {
    id: 'doc-opfs-arch',
    project_id: 'proj-opfs-engine',
    kb_id: 'kb-shipwright-franky',
    agent_id: 'shipwright-franky',
    title: 'IDB SQLite Engine Architecture.md',
    content: `# IDB SQLite Engine Architecture\n\nSUPER design specifications for browser persistence:\n- Web Worker Thread Isolation\n- Debounced IndexedDB Binary Storage\n- Universal Zero-Header Compatibility (No COOP/COEP needed)`,
    metadata: JSON.stringify({ tags: ['sqlite', 'indexeddb', 'architecture'], author: 'Franky' }),
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

function execToObjects(database, sql, bind = []) {
  const res = database.exec(sql, bind);
  if (!res || res.length === 0) return [];
  const { columns, values } = res[0];
  return values.map((row) => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

function runBootstrapMigrations(database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS company_profiles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owners TEXT NOT NULL,
      mission_vision TEXT NOT NULL,
      theme TEXT NOT NULL DEFAULT 'one-piece',
      custom_universe_query TEXT,
      custom_theme_config TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role_title TEXT NOT NULL,
      avatar_url TEXT,
      system_prompt TEXT NOT NULL,
      routing_description TEXT,
      parent_agent_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      is_private INTEGER DEFAULT 0,
      company_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS kbs (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      company_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      company_id TEXT,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      kb_id TEXT,
      agent_id TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      file_path TEXT,
      company_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL,
      sender_type TEXT NOT NULL,
      agent_id TEXT,
      content TEXT NOT NULL,
      delegation_trace TEXT,
      company_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    database.run('ALTER TABLE projects ADD COLUMN company_id TEXT');
  } catch (_) {}
  try {
    database.run('ALTER TABLE tasks ADD COLUMN company_id TEXT');
  } catch (_) {}
  try {
    database.run('ALTER TABLE documents ADD COLUMN company_id TEXT');
  } catch (_) {}
  try {
    database.run('ALTER TABLE kbs ADD COLUMN company_id TEXT');
  } catch (_) {}
  try {
    database.run('ALTER TABLE messages ADD COLUMN company_id TEXT');
  } catch (_) {}

  // Default LLM configuration seed
  const stmt = database.prepare("SELECT value FROM settings WHERE key = 'llm_config'");
  let hasConfig = false;
  if (stmt.step()) hasConfig = true;
  stmt.free();

  if (!hasConfig) {
    const defaultSettings = JSON.stringify({
      provider: 'gemini',
      apiKey: '',
      model: 'gemini-3.5-flash-lite',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      temperature: 0.7,
      maxTokens: 2048,
    });
    database.run('INSERT INTO settings (key, value) VALUES (?, ?)', ['llm_config', defaultSettings]);
  }

  // Seed default crew if agents table is empty
  const countStmt = database.prepare('SELECT COUNT(*) AS count FROM agents');
  let count = 0;
  if (countStmt.step()) {
    count = countStmt.getAsObject().count || 0;
  }
  countStmt.free();

  if (count === 0) {
    for (const agent of SEED_AGENTS) {
      database.run(
        `INSERT OR REPLACE INTO agents (id, name, role_title, avatar_url, system_prompt, routing_description, parent_agent_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          agent.id,
          agent.name,
          agent.role_title,
          agent.avatar_url,
          agent.system_prompt,
          agent.routing_description,
          agent.parent_agent_id,
        ]
      );
    }

    for (const proj of SEED_PROJECTS) {
      database.run(
        `INSERT OR REPLACE INTO projects (id, agent_id, title, description, category, is_private)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [proj.id, proj.agent_id, proj.title, proj.description, proj.category, proj.is_private]
      );

      database.run(
        `INSERT OR REPLACE INTO kbs (id, agent_id, name, description)
         VALUES (?, ?, ?, ?)`,
        [`kb-${proj.agent_id}`, proj.agent_id, `${proj.title} Collection`, proj.description]
      );
    }

    for (const task of SEED_TASKS) {
      database.run(
        `INSERT OR REPLACE INTO tasks (id, project_id, agent_id, title, status, priority, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [task.id, task.project_id, task.agent_id, task.title, task.status, task.priority, task.completed_at || null]
      );
    }

    for (const doc of SEED_DOCUMENTS) {
      database.run(
        `INSERT OR REPLACE INTO documents (id, project_id, kb_id, agent_id, title, content, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [doc.id, doc.project_id, doc.kb_id, doc.agent_id, doc.title, doc.content, doc.metadata]
      );
    }
  }
}

async function bootstrap() {
  if (isInitialized) return;

  try {
    SQL = await initSqlJs({
      locateFile: () => '/sql-wasm.wasm',
    });

    const existingBinary = await loadFromIDB();
    if (existingBinary) {
      db = new SQL.Database(existingBinary);
      console.log('[sqlite-engine] Database loaded from IndexedDB storage');
    } else {
      db = new SQL.Database();
      console.log('[sqlite-engine] Created new SQLite database in memory');
    }

    runBootstrapMigrations(db);
    persistChanges();

    isInitialized = true;
    self.postMessage({ type: 'INIT_SUCCESS', success: true });
  } catch (err) {
    console.error('[sqlite-engine] Initialization failed:', err);
    self.postMessage({
      type: 'INIT_ERROR',
      success: false,
      error: err && err.message ? err.message : String(err),
    });
  }
}

self.onmessage = async (e) => {
  const data = e.data || {};
  const id = data.id;
  const actionType = data.action || data.type;
  const payload = data.payload || {};

  if (actionType === 'INIT' || actionType === 'init') {
    await bootstrap();
    if (id) {
      self.postMessage({ id, type: 'INIT_SUCCESS', success: true, result: true });
    }
    return;
  }

  if (!db && !isInitialized) {
    await bootstrap();
  }

  try {
    switch (actionType) {
      case 'exec': {
        const rows = execToObjects(db, payload.sql, payload.bind || []);
        self.postMessage({ id, type: 'SUCCESS', success: true, data: rows, result: rows });
        break;
      }

      case 'run': {
        db.run(payload.sql, payload.bind || []);
        persistChanges();
        self.postMessage({ id, type: 'SUCCESS', success: true, result: true });
        break;
      }

      case 'EXECUTE_SQL': {
        const isSelect = payload.sql.trim().toUpperCase().startsWith('SELECT');
        if (isSelect) {
          const res = db.exec(payload.sql, payload.bind || []);
          const rows = res.length > 0 ? res[0].values : [];
          self.postMessage({ id, type: 'SUCCESS', success: true, data: rows, result: rows });
        } else {
          db.run(payload.sql, payload.bind || []);
          persistChanges();
          self.postMessage({ id, type: 'SUCCESS', success: true, result: [] });
        }
        break;
      }

      case 'GET_SETTING': {
        const stmt = db.prepare('SELECT value FROM settings WHERE key = ?');
        stmt.bind([payload.key]);
        const val = stmt.step() ? stmt.get()[0] : payload.defaultValue ?? null;
        stmt.free();
        self.postMessage({ id, type: 'SUCCESS', success: true, data: val, result: val });
        break;
      }

      case 'SET_SETTING': {
        db.run(
          'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
          [payload.key, payload.value]
        );
        persistChanges();
        self.postMessage({ id, type: 'SUCCESS', success: true, result: true });
        break;
      }

      case 'GET_ALL_SETTINGS': {
        const rows = execToObjects(db, 'SELECT key, value FROM settings');
        const settingsMap = {};
        for (const row of rows) {
          settingsMap[row.key] = row.value;
        }
        self.postMessage({ id, type: 'SUCCESS', success: true, data: settingsMap, result: settingsMap });
        break;
      }

      case 'GET_COMPANY_PROFILES': {
        const rows = execToObjects(db, 'SELECT * FROM company_profiles ORDER BY created_at ASC');
        self.postMessage({ id, type: 'SUCCESS', success: true, data: rows, result: rows });
        break;
      }

      case 'GET_COMPANY_PROFILE_BY_ID': {
        const rows = execToObjects(db, 'SELECT * FROM company_profiles WHERE id = ? LIMIT 1', [payload.id]);
        const profile = rows.length > 0 ? rows[0] : null;
        self.postMessage({ id, type: 'SUCCESS', success: true, data: profile, result: profile });
        break;
      }

      case 'SAVE_COMPANY_PROFILE': {
        const { profile } = payload;
        db.run(
          `INSERT OR REPLACE INTO company_profiles (id, name, owners, mission_vision, theme, custom_universe_query, custom_theme_config, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            profile.id,
            profile.name,
            profile.owners,
            profile.mission_vision,
            profile.theme || 'one-piece',
            profile.custom_universe_query || null,
            profile.custom_theme_config || null,
          ]
        );
        persistChanges();
        self.postMessage({ id, type: 'SUCCESS', success: true, result: true });
        break;
      }

      case 'DELETE_COMPANY_PROFILE': {
        const { id: companyId } = payload;
        db.run('DELETE FROM company_profiles WHERE id = ?', [companyId]);
        // Also clean up linked projects, tasks, documents
        db.run('DELETE FROM tasks WHERE company_id = ?', [companyId]);
        db.run('DELETE FROM documents WHERE company_id = ?', [companyId]);
        db.run('DELETE FROM projects WHERE company_id = ?', [companyId]);
        db.run('DELETE FROM kbs WHERE company_id = ?', [companyId]);
        db.run('DELETE FROM messages WHERE company_id = ?', [companyId]);
        persistChanges();
        self.postMessage({ id, type: 'SUCCESS', success: true, result: true });
        break;
      }

      case 'GET_AGENTS': {
        const rows = execToObjects(db, 'SELECT * FROM agents ORDER BY created_at ASC');
        self.postMessage({ id, type: 'SUCCESS', success: true, data: rows, result: rows });
        break;
      }

      case 'SAVE_DOCUMENT': {
        const { doc } = payload;
        db.run(
          `INSERT OR REPLACE INTO documents (id, project_id, kb_id, agent_id, title, content, metadata, file_path, company_id, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            doc.id,
            doc.project_id || null,
            doc.kb_id || null,
            doc.agent_id || null,
            doc.title,
            doc.content,
            doc.metadata || null,
            doc.file_path || null,
            doc.company_id || null,
          ]
        );
        persistChanges();
        self.postMessage({ id, type: 'SUCCESS', success: true, result: true });
        break;
      }

      case 'GET_DOCUMENTS_BY_PROJECT': {
        const rows = execToObjects(
          db,
          `SELECT * FROM documents WHERE project_id = ? ORDER BY updated_at DESC`,
          [payload.projectId]
        );
        self.postMessage({ id, type: 'SUCCESS', success: true, data: rows, result: rows });
        break;
      }

      case 'SEARCH_DOCUMENTS': {
        const { query, limit, agentId } = payload;
        let sql = `SELECT id, project_id, kb_id, agent_id, title, content, metadata FROM documents WHERE (title LIKE ? OR content LIKE ?)`;
        const term = `%${query || ''}%`;
        const params = [term, term];
        if (agentId) {
          sql += ` AND agent_id = ?`;
          params.push(agentId);
        }
        sql += ` ORDER BY updated_at DESC LIMIT ?`;
        params.push(limit || 10);
        const rows = execToObjects(db, sql, params);
        self.postMessage({ id, type: 'SUCCESS', success: true, data: rows, result: rows });
        break;
      }

      case 'TOGGLE_TASK_STATUS': {
        const { taskId } = payload;
        const tasks = execToObjects(db, 'SELECT * FROM tasks WHERE id = ? LIMIT 1', [taskId]);
        if (tasks.length === 0) {
          throw new Error(`Task with id ${taskId} not found`);
        }
        const currentTask = tasks[0];
        const nextStatus = currentTask.status === 'completed' ? 'pending' : 'completed';
        const completedAt = nextStatus === 'completed' ? new Date().toISOString() : null;

        db.run('UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?', [nextStatus, completedAt, taskId]);
        persistChanges();

        const updatedTask = {
          ...currentTask,
          status: nextStatus,
          completed_at: completedAt,
        };
        self.postMessage({ id, type: 'SUCCESS', success: true, data: updatedTask, result: updatedTask });
        break;
      }

      case 'UPDATE_TASK_STATUS': {
        const { taskId, status } = payload;
        const tasks = execToObjects(db, 'SELECT * FROM tasks WHERE id = ? LIMIT 1', [taskId]);
        if (tasks.length === 0) {
          throw new Error(`Task with id ${taskId} not found`);
        }
        const currentTask = tasks[0];
        const completedAt = status === 'completed' ? new Date().toISOString() : null;

        db.run('UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?', [status, completedAt, taskId]);
        persistChanges();

        const updatedTask = {
          ...currentTask,
          status,
          completed_at: completedAt,
        };
        self.postMessage({ id, type: 'SUCCESS', success: true, data: updatedTask, result: updatedTask });
        break;
      }

      default:
        self.postMessage({ id, type: 'ERROR', success: false, error: `Unknown type: ${actionType}` });
    }
  } catch (err) {
    self.postMessage({ id, type: 'ERROR', success: false, error: err?.message || String(err) });
  }
};
