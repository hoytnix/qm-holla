import {
  IQuarkDatabase,
  AgentRecord,
  KbRecord,
  DocumentRecord,
  SearchResult,
  MessageRecord,
} from './adapter';

class OpfsDatabase implements IQuarkDatabase {
  private worker: Worker | null = null;
  private pendingRequests = new Map<
    string,
    { resolve: (val: any) => void; reject: (err: any) => void }
  >();
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  // Fallback in-memory storage for SSR or environments without Web Worker
  private memAgents: AgentRecord[] = [];
  private memKbs: KbRecord[] = [];
  private memDocs: DocumentRecord[] = [];
  private memMessages: MessageRecord[] = [];
  private isWorkerSupported = false;

  constructor() {
    this.isWorkerSupported = typeof window !== 'undefined' && typeof Worker !== 'undefined';
  }

  public async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (this.isWorkerSupported) {
        try {
          this.worker = new Worker(new URL('../../workers/db.worker.ts', import.meta.url), {
            type: 'module',
          });

          this.worker.onmessage = (event: MessageEvent) => {
            const { id, success, data, error } = event.data;
            const pending = this.pendingRequests.get(id);
            if (pending) {
              this.pendingRequests.delete(id);
              if (success) {
                pending.resolve(data);
              } else {
                pending.reject(new Error(error));
              }
            }
          };

          await this.sendToWorker('init');
          this.initialized = true;
          await this.seedDefaultDataIfEmpty();
          return;
        } catch (err) {
          console.warn('Failed to start OPFS SQLite Web Worker, using memory fallback:', err);
          this.worker = null;
        }
      }

      this.initialized = true;
      await this.seedDefaultDataIfEmpty();
    })();

    return this.initPromise;
  }

  private sendToWorker<T = any>(action: string, payload?: any): Promise<T> {
    if (!this.worker) {
      return Promise.reject(new Error('Worker not available'));
    }

    const id = Math.random().toString(36).substring(2, 9);
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.worker!.postMessage({ id, action, payload });
    });
  }

  private async query<T = any>(sql: string, bind: any[] = []): Promise<T[]> {
    await this.init();
    if (this.worker) {
      return this.sendToWorker<T[]>('exec', { sql, bind });
    }
    return [];
  }

  private async run(sql: string, bind: any[] = []): Promise<void> {
    await this.init();
    if (this.worker) {
      await this.sendToWorker('run', { sql, bind });
    }
  }

  private async seedDefaultDataIfEmpty() {
    const agents = await this.getAgents();
    if (agents.length === 0) {
      // Default Captain Luffy Core Orchestrator
      const captain: AgentRecord = {
        id: 'captain-core',
        name: 'Luffy Core Orchestrator',
        role_title: 'Grand Line Fleet Captain & Core Router',
        avatar_url: '🏴‍☠️',
        system_prompt: `You are the Luffy Core Orchestrator of Quarkmeme. You steer the entire autonomous crew across the Grand Line of knowledge. Evaluate user queries, delegate with clarity to specialized officers, and synthesize final responses with unwavering conviction.`,
        routing_description: 'Handles top-level strategic queries, general questions, and orchestrates multi-agent tasks.',
        parent_agent_id: null,
      };

      const navigator: AgentRecord = {
        id: 'navigator-nami',
        name: 'Nami Navigator',
        role_title: 'Cartographer & Knowledge Scout',
        avatar_url: '🧭',
        system_prompt: `You are Nami, Chief Cartographer of Quarkmeme. You map local knowledge documents, index repositories, navigate complex directories, and chart optimal paths through stored lore.`,
        routing_description: 'Handles file system indexing, vault organization, search queries, and document navigation.',
        parent_agent_id: 'captain-core',
      };

      const scholar: AgentRecord = {
        id: 'scholar-robin',
        name: 'Robin Archaeologist',
        role_title: 'Historical Synthesis & Deep Research Specialist',
        avatar_url: '📜',
        system_prompt: `You are Nico Robin, Senior Archaeologist of Quarkmeme. You decipher dense texts, uncover hidden connections across historical logs, and synthesize deep document context with elegance.`,
        routing_description: 'Handles deep document analysis, synthesis, archival lore, and historical research queries.',
        parent_agent_id: 'captain-core',
      };

      const engineer: AgentRecord = {
        id: 'shipwright-franky',
        name: 'Franky Shipwright',
        role_title: 'System Architect & High-Octane Builder',
        avatar_url: '⚙️',
        system_prompt: `You are Franky, Master Shipwright of Quarkmeme. SUPER! You design resilient architectures, craft local-first schemas, and inspect engine health with unflinching precision.`,
        routing_description: 'Handles software architecture, SQLite schema engineering, local storage, and code construction.',
        parent_agent_id: 'captain-core',
      };

      await this.saveAgent(captain);
      await this.saveAgent(navigator);
      await this.saveAgent(scholar);
      await this.saveAgent(engineer);

      // Seed Initial Knowledge Base & Document
      const initialKb: KbRecord = {
        id: 'kb-grand-line-overview',
        agent_id: 'captain-core',
        name: 'Grand Line Navigation Lore',
        description: 'Core tactical manual and operational guidelines for Quarkmeme crew fleet.',
      };
      await this.saveKb(initialKb);

      await this.saveDocument({
        id: 'doc-quarkmeme-manifesto',
        kb_id: 'kb-grand-line-overview',
        title: 'Quarkmeme Local-First Manifesto',
        content: `Quarkmeme is an offline-ready autonomous multi-agent operating canvas. Running SQLite WASM on top of the browser's Origin Private File System (OPFS), user knowledge is preserved entirely on-device with zero forced latency and full cryptographic autonomy. When cloud coordination is desired, Turso libSQL sync serves as the seamless upgrade bridge.`,
      });
    }
  }

  // Implementation of IQuarkDatabase methods
  async getAgents(): Promise<AgentRecord[]> {
    if (this.worker) {
      return this.query<AgentRecord>('SELECT * FROM agents ORDER BY created_at ASC');
    }
    return [...this.memAgents];
  }

  async getAgentById(id: string): Promise<AgentRecord | null> {
    if (this.worker) {
      const rows = await this.query<AgentRecord>('SELECT * FROM agents WHERE id = ? LIMIT 1', [id]);
      return rows[0] || null;
    }
    return this.memAgents.find((a) => a.id === id) || null;
  }

  async saveAgent(agent: AgentRecord): Promise<void> {
    if (this.worker) {
      await this.run(
        `INSERT OR REPLACE INTO agents (id, name, role_title, avatar_url, system_prompt, routing_description, parent_agent_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          agent.id,
          agent.name,
          agent.role_title,
          agent.avatar_url || null,
          agent.system_prompt,
          agent.routing_description || null,
          agent.parent_agent_id || null,
        ]
      );
      return;
    }

    const idx = this.memAgents.findIndex((a) => a.id === agent.id);
    if (idx >= 0) {
      this.memAgents[idx] = agent;
    } else {
      this.memAgents.push(agent);
    }
  }

  async deleteAgent(id: string): Promise<void> {
    if (this.worker) {
      await this.run('DELETE FROM agents WHERE id = ?', [id]);
      return;
    }
    this.memAgents = this.memAgents.filter((a) => a.id !== id);
  }

  async getKbs(): Promise<KbRecord[]> {
    if (this.worker) {
      return this.query<KbRecord>('SELECT * FROM kbs ORDER BY created_at ASC');
    }
    return [...this.memKbs];
  }

  async getKbsForAgent(agentId: string): Promise<KbRecord[]> {
    if (this.worker) {
      return this.query<KbRecord>('SELECT * FROM kbs WHERE agent_id = ? ORDER BY created_at ASC', [
        agentId,
      ]);
    }
    return this.memKbs.filter((k) => k.agent_id === agentId);
  }

  async saveKb(kb: KbRecord): Promise<void> {
    if (this.worker) {
      await this.run(
        `INSERT OR REPLACE INTO kbs (id, agent_id, name, description)
         VALUES (?, ?, ?, ?)`,
        [kb.id, kb.agent_id, kb.name, kb.description || null]
      );
      return;
    }
    const idx = this.memKbs.findIndex((k) => k.id === kb.id);
    if (idx >= 0) {
      this.memKbs[idx] = kb;
    } else {
      this.memKbs.push(kb);
    }
  }

  async getDocumentsForAgent(agentId: string): Promise<DocumentRecord[]> {
    if (this.worker) {
      const sql = `
        SELECT d.* FROM documents d
        JOIN kbs k ON d.kb_id = k.id
        WHERE k.agent_id = ?
        ORDER BY d.updated_at DESC
      `;
      return this.query<DocumentRecord>(sql, [agentId]);
    }
    const kbIds = this.memKbs.filter((k) => k.agent_id === agentId).map((k) => k.id);
    return this.memDocs.filter((d) => kbIds.includes(d.kb_id));
  }

  async getDocumentsForKb(kbId: string): Promise<DocumentRecord[]> {
    if (this.worker) {
      return this.query<DocumentRecord>(
        'SELECT * FROM documents WHERE kb_id = ? ORDER BY updated_at DESC',
        [kbId]
      );
    }
    return this.memDocs.filter((d) => d.kb_id === kbId);
  }

  async getAllDocuments(): Promise<DocumentRecord[]> {
    if (this.worker) {
      return this.query<DocumentRecord>('SELECT * FROM documents ORDER BY updated_at DESC');
    }
    return [...this.memDocs];
  }

  async saveDocument(doc: DocumentRecord): Promise<void> {
    if (this.worker) {
      await this.run(
        `INSERT OR REPLACE INTO documents (id, kb_id, title, content, file_path)
         VALUES (?, ?, ?, ?, ?)`,
        [doc.id, doc.kb_id, doc.title, doc.content, doc.file_path || null]
      );
      return;
    }
    const idx = this.memDocs.findIndex((d) => d.id === doc.id);
    if (idx >= 0) {
      this.memDocs[idx] = doc;
    } else {
      this.memDocs.push(doc);
    }
  }

  async deleteDocument(id: string): Promise<void> {
    if (this.worker) {
      await this.run('DELETE FROM documents WHERE id = ?', [id]);
      return;
    }
    this.memDocs = this.memDocs.filter((d) => d.id !== id);
  }

  async searchKnowledge(
    query: string,
    limit: number = 5,
    agentId?: string
  ): Promise<SearchResult[]> {
    if (!query || !query.trim()) return [];
    // Sanitize query for FTS5 (escape quotes, split words with AND or OR)
    const sanitizedQuery = query
      .replace(/["'*]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .join(' OR ');

    if (!sanitizedQuery) return [];

    if (this.worker) {
      try {
        let sql = `
          SELECT d.id, d.kb_id, d.title, d.content, k.agent_id, bm25(documents_fts) as rank
          FROM documents_fts
          JOIN documents d ON documents_fts.rowid = d.rowid
          JOIN kbs k ON d.kb_id = k.id
          WHERE documents_fts MATCH ?
        `;
        const params: any[] = [sanitizedQuery];

        if (agentId) {
          sql += ` AND k.agent_id = ?`;
          params.push(agentId);
        }

        sql += ` ORDER BY rank LIMIT ?`;
        params.push(limit);

        return await this.query<SearchResult>(sql, params);
      } catch (e) {
        console.warn('FTS5 search failed, falling back to LIKE query:', e);
        // Fallback to LIKE search
        let sql = `
          SELECT d.id, d.kb_id, d.title, d.content, k.agent_id
          FROM documents d
          JOIN kbs k ON d.kb_id = k.id
          WHERE (d.title LIKE ? OR d.content LIKE ?)
        `;
        const term = `%${query}%`;
        const params: any[] = [term, term];

        if (agentId) {
          sql += ` AND k.agent_id = ?`;
          params.push(agentId);
        }

        sql += ` LIMIT ?`;
        params.push(limit);

        return await this.query<SearchResult>(sql, params);
      }
    }

    const qLower = query.toLowerCase();
    return this.memDocs
      .filter((d) => d.title.toLowerCase().includes(qLower) || d.content.toLowerCase().includes(qLower))
      .slice(0, limit)
      .map((d) => ({
        id: d.id,
        kb_id: d.kb_id,
        title: d.title,
        content: d.content,
      }));
  }

  async saveMessage(message: MessageRecord): Promise<void> {
    if (this.worker) {
      await this.run(
        `INSERT INTO messages (id, thread_id, sender_type, agent_id, content, delegation_trace)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          message.id,
          message.thread_id,
          message.sender_type,
          message.agent_id || null,
          message.content,
          message.delegation_trace || null,
        ]
      );
      return;
    }
    this.memMessages.push(message);
  }

  async getMessages(threadId: string): Promise<MessageRecord[]> {
    if (this.worker) {
      return this.query<MessageRecord>(
        'SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC',
        [threadId]
      );
    }
    return this.memMessages.filter((m) => m.thread_id === threadId);
  }

  async clearMessages(threadId?: string): Promise<void> {
    if (this.worker) {
      if (threadId) {
        await this.run('DELETE FROM messages WHERE thread_id = ?', [threadId]);
      } else {
        await this.run('DELETE FROM messages');
      }
      return;
    }
    if (threadId) {
      this.memMessages = this.memMessages.filter((m) => m.thread_id !== threadId);
    } else {
      this.memMessages = [];
    }
  }
}

// Global singleton instance
export const db = new OpfsDatabase();
