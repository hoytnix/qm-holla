import {
  IQuarkDatabase,
  AgentRecord,
  ProjectRecord,
  TaskRecord,
  KbRecord,
  DocumentRecord,
  SearchResult,
  MessageRecord,
  CompanyProfile,
} from './adapter';
import {
  DEFAULT_STRAW_HAT_AGENTS,
  DEFAULT_CREW,
  DEFAULT_PROJECTS,
  DEFAULT_TASKS,
  DEFAULT_DOCUMENTS,
} from '@/lib/crew/default-crew';
import { provisionAgentMemoryBank } from '@/lib/crew/agent-memory';

class OpfsDatabase implements IQuarkDatabase {
  private worker: Worker | null = null;
  private pendingRequests = new Map<
    string,
    { resolve: (val: any) => void; reject: (err: any) => void }
  >();
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  public isReady = false;
  public usingFallback = false;

  // Fallback in-memory storage for SSR or environments without Web Worker
  private memAgents: AgentRecord[] = [];
  private memProjects: ProjectRecord[] = [];
  private memTasks: TaskRecord[] = [];
  private memKbs: KbRecord[] = [];
  private memDocs: DocumentRecord[] = [];
  private memMessages: MessageRecord[] = [];
  private memCompanyProfiles: CompanyProfile[] = [];
  private isWorkerSupported = false;

  constructor() {
    this.isWorkerSupported = typeof window !== 'undefined' && typeof Worker !== 'undefined';
    if (this.isWorkerSupported) {
      try {
        // Timestamp parameter guarantees a fresh fetch and bypasses PWA service-worker cache
        this.worker = new Worker(`/sqlite/sqlite-engine.js?t=${Date.now()}`);

        this.worker.onmessage = (event: MessageEvent) => {
          const { id, type, success, data, result, error } = event.data || {};
          if (id && this.pendingRequests.has(id)) {
            const { resolve, reject } = this.pendingRequests.get(id)!;
            this.pendingRequests.delete(id);
            if (success || type === 'SUCCESS') {
              resolve(data !== undefined ? data : result);
            } else {
              reject(new Error(error || 'Worker request failed'));
            }
          }
        };

        this.worker.onerror = (err) => {
          console.warn('Unhandled error from /sqlite/sqlite-engine.js:', err);
        };
      } catch (e) {
        console.warn('Could not instantiate /sqlite/sqlite-engine.js:', e);
      }
    }
  }

  public async init(): Promise<void> {
    if (this.isReady) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (typeof window === 'undefined' || !this.worker) {
        this.isReady = true;
        this.usingFallback = true;
        this.initialized = true;
        await this.seedDefaultDataIfEmpty();
        return;
      }

      try {
        await new Promise<void>((resolve) => {
          // Fast 2000ms safety timeout since sql.js does not require OPFS async proxies
          const timeout = setTimeout(() => {
            console.warn('Worker initialization timed out after 2s; operating in fallback mode.');
            this.isReady = true;
            this.usingFallback = true;
            this.initialized = true;
            resolve();
          }, 2000);

          const onInitMessage = (e: MessageEvent) => {
            if (e.data?.type === 'INIT_SUCCESS') {
              clearTimeout(timeout);
              this.isReady = true;
              this.usingFallback = false;
              this.initialized = true;
              this.worker?.removeEventListener('message', onInitMessage);
              resolve();
            } else if (e.data?.type === 'INIT_ERROR') {
              clearTimeout(timeout);
              console.warn('db-worker.js reported INIT_ERROR, using fallback:', e.data.error);
              this.isReady = true;
              this.usingFallback = true;
              this.initialized = true;
              this.worker?.removeEventListener('message', onInitMessage);
              resolve();
            }
          };

          this.worker?.addEventListener('message', onInitMessage);
          this.worker?.postMessage({ type: 'INIT', action: 'init' });
        });

        if (!this.usingFallback) {
          this.isReady = true;
          this.initialized = true;
          return;
        }
      } catch (err) {
        console.warn('Failed to initialize static db-worker.js, switching gracefully to in-memory fallback:', err);
      }

      this.isReady = true;
      this.usingFallback = true;
      this.initialized = true;
      await this.seedDefaultDataIfEmpty();
    })();

    return this.initPromise;
  }

  private sendToWorker<T = any>(action: string, payload?: any): Promise<T> {
    if (!this.worker || this.usingFallback) {
      return Promise.reject(new Error('Worker not available'));
    }

    const id = Math.random().toString(36).substring(2, 9);
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      try {
        this.worker!.postMessage({ id, action, payload });
      } catch (postErr) {
        this.pendingRequests.delete(id);
        reject(postErr);
      }
    });
  }

  private async query<T = any>(sql: string, bind: any[] = []): Promise<T[]> {
    await this.init();
    if (!this.usingFallback && this.worker) {
      return this.sendToWorker<T[]>('exec', { sql, bind });
    }
    return [];
  }

  private async run(sql: string, bind: any[] = []): Promise<void> {
    await this.init();
    if (!this.usingFallback && this.worker) {
      await this.sendToWorker('run', { sql, bind });
    }
  }

  private async seedDefaultDataIfEmpty() {
    if (this.memAgents.length === 0) {
      this.memAgents = [...DEFAULT_CREW];
    }
    if (this.memProjects.length === 0) {
      this.memProjects = [...DEFAULT_PROJECTS];
    }
    if (this.memTasks.length === 0) {
      this.memTasks = [...DEFAULT_TASKS];
    }
    if (this.memDocs.length === 0) {
      this.memDocs = [...DEFAULT_DOCUMENTS];
    }
    if (this.memKbs.length === 0) {
      this.memKbs = DEFAULT_PROJECTS.map((p) => ({
        id: `kb-${p.agent_id}`,
        agent_id: p.agent_id,
        name: `${p.title} Collection`,
        description: p.description,
      }));
    }
  }

  // --- Agents ---
  async getAgents(): Promise<AgentRecord[]> {
    if (!this.usingFallback && this.worker) {
      try {
        const rows = await this.query<AgentRecord>('SELECT * FROM agents ORDER BY created_at ASC');
        if (rows && rows.length > 0) return rows;
      } catch (err) {
        console.warn('Worker getAgents failed, falling back to memory/defaults:', err);
      }
    }
    if (this.memAgents.length === 0) {
      await this.seedDefaultDataIfEmpty();
    }
    return [...this.memAgents];
  }

  async getAgentById(id: string): Promise<AgentRecord | null> {
    if (!this.usingFallback && this.worker) {
      try {
        const rows = await this.query<AgentRecord>('SELECT * FROM agents WHERE id = ? LIMIT 1', [id]);
        return rows[0] || null;
      } catch (err) {
        console.warn('Worker getAgentById failed, falling back to memory:', err);
      }
    }
    if (this.memAgents.length === 0) {
      await this.seedDefaultDataIfEmpty();
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
    } else {
      const idx = this.memAgents.findIndex((a) => a.id === agent.id);
      if (idx >= 0) {
        this.memAgents[idx] = agent;
      } else {
        this.memAgents.push(agent);
      }
    }

    // Auto-provision the dedicated /memory-bank/agents/[agent-id]/ virtual files in Vault
    try {
      await provisionAgentMemoryBank(this, agent);
    } catch (err) {
      console.warn(`Memory bank auto-provisioning skipped for ${agent.id}:`, err);
    }
  }

  async deleteAgent(id: string): Promise<void> {
    if (this.worker) {
      await this.run('DELETE FROM agents WHERE id = ?', [id]);
      return;
    }
    this.memAgents = this.memAgents.filter((a) => a.id !== id);
  }

  // --- Company Profiles ---
  async getCompanyProfiles(): Promise<CompanyProfile[]> {
    if (!this.usingFallback && this.worker) {
      try {
        const rows = await this.sendToWorker<CompanyProfile[]>('GET_COMPANY_PROFILES');
        if (rows) return rows;
      } catch (err) {
        console.warn('Worker getCompanyProfiles failed, falling back to memory:', err);
      }
    }
    return [...this.memCompanyProfiles];
  }

  async getCompanyProfileById(id: string): Promise<CompanyProfile | null> {
    if (!this.usingFallback && this.worker) {
      try {
        return await this.sendToWorker<CompanyProfile | null>('GET_COMPANY_PROFILE_BY_ID', { id });
      } catch (err) {
        console.warn('Worker getCompanyProfileById failed, falling back to memory:', err);
      }
    }
    return this.memCompanyProfiles.find((c) => c.id === id) || null;
  }

  async saveCompanyProfile(profile: CompanyProfile): Promise<void> {
    if (!this.usingFallback && this.worker) {
      try {
        await this.sendToWorker('SAVE_COMPANY_PROFILE', { profile });
      } catch (err) {
        console.warn('Worker saveCompanyProfile failed, saving in memory:', err);
      }
    }
    const idx = this.memCompanyProfiles.findIndex((c) => c.id === profile.id);
    if (idx >= 0) {
      this.memCompanyProfiles[idx] = profile;
    } else {
      this.memCompanyProfiles.push(profile);
    }
  }

  async deleteCompanyProfile(id: string): Promise<void> {
    if (!this.usingFallback && this.worker) {
      try {
        await this.sendToWorker('DELETE_COMPANY_PROFILE', { id });
      } catch (err) {
        console.warn('Worker deleteCompanyProfile failed, deleting in memory:', err);
      }
    }
    this.memCompanyProfiles = this.memCompanyProfiles.filter((c) => c.id !== id);
    this.memTasks = this.memTasks.filter((t) => t.company_id !== id);
    this.memProjects = this.memProjects.filter((p) => p.company_id !== id);
    this.memDocs = this.memDocs.filter((d) => d.company_id !== id);
    this.memKbs = this.memKbs.filter((k) => k.company_id !== id);
  }

  async getActiveCompanyProfileId(): Promise<string | null> {
    return this.getSetting('active_company_profile_id', '');
  }

  async setActiveCompanyProfileId(id: string): Promise<void> {
    await this.setSetting('active_company_profile_id', id);
  }

  // --- Projects ---
  async getProjects(companyId?: string): Promise<ProjectRecord[]> {
    if (!this.usingFallback && this.worker) {
      try {
        let sql = 'SELECT * FROM projects';
        const params: any[] = [];
        if (companyId) {
          sql += ' WHERE company_id = ? OR company_id IS NULL';
          params.push(companyId);
        }
        sql += ' ORDER BY created_at ASC';
        const rows = await this.query<ProjectRecord>(sql, params);
        if (rows && rows.length > 0) return rows;
      } catch (err) {
        console.warn('Worker getProjects failed, falling back to memory/defaults:', err);
      }
    }
    if (this.memProjects.length === 0) {
      await this.seedDefaultDataIfEmpty();
    }
    if (companyId) {
      return this.memProjects.filter((p) => !p.company_id || p.company_id === companyId);
    }
    return [...this.memProjects];
  }

  async getProjectsForAgent(agentId: string, companyId?: string): Promise<ProjectRecord[]> {
    if (!this.usingFallback && this.worker) {
      try {
        let sql = 'SELECT * FROM projects WHERE agent_id = ?';
        const params: any[] = [agentId];
        if (companyId) {
          sql += ' AND (company_id = ? OR company_id IS NULL)';
          params.push(companyId);
        }
        sql += ' ORDER BY created_at ASC';
        return await this.query<ProjectRecord>(sql, params);
      } catch (err) {
        console.warn('Worker getProjectsForAgent failed, falling back to memory:', err);
      }
    }
    if (this.memProjects.length === 0) {
      await this.seedDefaultDataIfEmpty();
    }
    return this.memProjects.filter((p) => p.agent_id === agentId && (!companyId || !p.company_id || p.company_id === companyId));
  }

  async getProjectById(id: string): Promise<ProjectRecord | null> {
    if (!this.usingFallback && this.worker) {
      try {
        const rows = await this.query<ProjectRecord>('SELECT * FROM projects WHERE id = ? LIMIT 1', [id]);
        return rows[0] || null;
      } catch (err) {
        console.warn('Worker getProjectById failed, falling back to memory:', err);
      }
    }
    if (this.memProjects.length === 0) {
      await this.seedDefaultDataIfEmpty();
    }
    return this.memProjects.find((p) => p.id === id) || null;
  }

  async saveProject(project: ProjectRecord): Promise<void> {
    if (!this.usingFallback && this.worker) {
      try {
        await this.run(
          `INSERT OR REPLACE INTO projects (id, agent_id, title, description, category, is_private, company_id, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            project.id,
            project.agent_id,
            project.title,
            project.description || null,
            project.category,
            project.is_private ? 1 : 0,
            project.company_id || null,
          ]
        );
        return;
      } catch (err) {
        console.warn('Worker saveProject failed, saving in memory:', err);
      }
    }
    const idx = this.memProjects.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      this.memProjects[idx] = project;
    } else {
      this.memProjects.push(project);
    }
  }

  async deleteProject(id: string): Promise<void> {
    if (!this.usingFallback && this.worker) {
      try {
        await this.run('DELETE FROM projects WHERE id = ?', [id]);
        return;
      } catch (err) {
        console.warn('Worker deleteProject failed, deleting in memory:', err);
      }
    }
    this.memProjects = this.memProjects.filter((p) => p.id !== id);
  }

  // --- Tasks ---
  async getTasks(projectId?: string, companyId?: string): Promise<TaskRecord[]> {
    if (!this.usingFallback && this.worker) {
      try {
        let sql = 'SELECT * FROM tasks WHERE 1=1';
        const params: any[] = [];
        if (projectId) {
          sql += ' AND project_id = ?';
          params.push(projectId);
        }
        if (companyId) {
          sql += ' AND (company_id = ? OR company_id IS NULL)';
          params.push(companyId);
        }
        sql += ' ORDER BY created_at ASC';
        const rows = await this.query<TaskRecord>(sql, params);
        if (rows && rows.length > 0) return rows;
      } catch (err) {
        console.warn('Worker getTasks failed, falling back to memory/defaults:', err);
      }
    }
    if (this.memTasks.length === 0) {
      await this.seedDefaultDataIfEmpty();
    }
    let res = [...this.memTasks];
    if (projectId) {
      res = res.filter((t) => t.project_id === projectId);
    }
    if (companyId) {
      res = res.filter((t) => !t.company_id || t.company_id === companyId);
    }
    return res;
  }

  async getTasksForProject(projectId: string): Promise<TaskRecord[]> {
    return this.getTasks(projectId);
  }

  async saveTask(task: TaskRecord): Promise<void> {
    if (!this.usingFallback && this.worker) {
      try {
        await this.run(
          `INSERT OR REPLACE INTO tasks (id, project_id, agent_id, title, status, priority, company_id, completed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            task.id,
            task.project_id,
            task.agent_id,
            task.title,
            task.status || 'pending',
            task.priority || 'medium',
            task.company_id || null,
            task.completed_at || null,
          ]
        );
        return;
      } catch (err) {
        console.warn('Worker saveTask failed, saving in memory:', err);
      }
    }
    const idx = this.memTasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) {
      this.memTasks[idx] = task;
    } else {
      this.memTasks.push(task);
    }
  }

  async updateTaskStatus(
    taskId: string,
    status: 'pending' | 'in_progress' | 'completed'
  ): Promise<TaskRecord | null> {
    if (!this.usingFallback && this.worker) {
      try {
        return await this.sendToWorker<TaskRecord>('UPDATE_TASK_STATUS', { taskId, status });
      } catch (err) {
        console.warn('Worker updateTaskStatus failed, updating in memory:', err);
      }
    }
    const task = this.memTasks.find((t) => t.id === taskId);
    if (!task) return null;
    task.status = status;
    task.completed_at = status === 'completed' ? new Date().toISOString() : null;
    return { ...task };
  }

  async toggleTaskStatus(taskId: string): Promise<TaskRecord | null> {
    if (!this.usingFallback && this.worker) {
      try {
        return await this.sendToWorker<TaskRecord>('TOGGLE_TASK_STATUS', { taskId });
      } catch (err) {
        console.warn('Worker toggleTaskStatus failed, toggling in memory:', err);
      }
    }
    const task = this.memTasks.find((t) => t.id === taskId);
    if (!task) return null;
    task.status = task.status === 'completed' ? 'pending' : 'completed';
    task.completed_at = task.status === 'completed' ? new Date().toISOString() : null;
    return { ...task };
  }

  async deleteTask(id: string): Promise<void> {
    if (this.worker) {
      await this.run('DELETE FROM tasks WHERE id = ?', [id]);
      return;
    }
    this.memTasks = this.memTasks.filter((t) => t.id !== id);
  }

  // --- Knowledge Bases & Documents ---
  async getKbs(companyId?: string): Promise<KbRecord[]> {
    if (this.worker) {
      let sql = 'SELECT * FROM kbs';
      const params: any[] = [];
      if (companyId) {
        sql += ' WHERE company_id = ? OR company_id IS NULL';
        params.push(companyId);
      }
      sql += ' ORDER BY created_at ASC';
      return this.query<KbRecord>(sql, params);
    }
    if (companyId) {
      return this.memKbs.filter((k) => !k.company_id || k.company_id === companyId);
    }
    return [...this.memKbs];
  }

  async getKbsForAgent(agentId: string): Promise<KbRecord[]> {
    if (this.worker) {
      return this.query<KbRecord>('SELECT * FROM kbs WHERE agent_id = ? ORDER BY created_at ASC', [agentId]);
    }
    return this.memKbs.filter((k) => k.agent_id === agentId);
  }

  async saveKb(kb: KbRecord): Promise<void> {
    if (this.worker) {
      await this.run(
        `INSERT OR REPLACE INTO kbs (id, agent_id, name, description, company_id)
         VALUES (?, ?, ?, ?, ?)`,
        [kb.id, kb.agent_id, kb.name, kb.description || null, kb.company_id || null]
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
        SELECT * FROM documents
        WHERE agent_id = ?
        ORDER BY updated_at DESC
      `;
      return this.query<DocumentRecord>(sql, [agentId]);
    }
    return this.memDocs.filter((d) => d.agent_id === agentId);
  }

  async getDocumentsForKb(kbId: string): Promise<DocumentRecord[]> {
    if (this.worker) {
      return this.query<DocumentRecord>('SELECT * FROM documents WHERE kb_id = ? ORDER BY updated_at DESC', [kbId]);
    }
    return this.memDocs.filter((d) => d.kb_id === kbId);
  }

  async getDocumentsByProject(projectId: string): Promise<DocumentRecord[]> {
    if (this.worker) {
      return this.sendToWorker<DocumentRecord[]>('GET_DOCUMENTS_BY_PROJECT', { projectId });
    }
    return this.memDocs.filter((d) => d.project_id === projectId);
  }

  async getAllDocuments(companyId?: string): Promise<DocumentRecord[]> {
    if (this.worker) {
      let sql = 'SELECT * FROM documents';
      const params: any[] = [];
      if (companyId) {
        sql += ' WHERE company_id = ? OR company_id IS NULL';
        params.push(companyId);
      }
      sql += ' ORDER BY updated_at DESC';
      return this.query<DocumentRecord>(sql, params);
    }
    if (companyId) {
      return this.memDocs.filter((d) => !d.company_id || d.company_id === companyId);
    }
    return [...this.memDocs];
  }

  async getDocumentById(id: string): Promise<DocumentRecord | null> {
    if (this.worker) {
      const rows = await this.query<DocumentRecord>('SELECT * FROM documents WHERE id = ? LIMIT 1', [id]);
      return rows[0] || null;
    }
    return this.memDocs.find((d) => d.id === id) || null;
  }

  async saveDocument(doc: DocumentRecord): Promise<void> {
    if (this.worker) {
      await this.sendToWorker('SAVE_DOCUMENT', { doc });
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
    return this.searchDocuments(query, limit, agentId);
  }

  async searchDocuments(
    query: string,
    limit: number = 10,
    agentId?: string
  ): Promise<SearchResult[]> {
    if (!query || !query.trim()) return [];
    if (this.worker) {
      return this.sendToWorker<SearchResult[]>('SEARCH_DOCUMENTS', { query, limit, agentId });
    }

    const qLower = query.toLowerCase();
    return this.memDocs
      .filter((d) => d.title.toLowerCase().includes(qLower) || d.content.toLowerCase().includes(qLower))
      .slice(0, limit)
      .map((d) => ({
        id: d.id,
        project_id: d.project_id,
        kb_id: d.kb_id,
        agent_id: d.agent_id || undefined,
        title: d.title,
        content: d.content,
        metadata: d.metadata,
      }));
  }

  // --- Messages ---
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

  // --- Settings & BYOK ---
  private memSettings: Record<string, string> = {};

  async getSetting(key: string, defaultValue: string = ''): Promise<string> {
    if (!this.usingFallback && this.worker) {
      try {
        const val = await this.sendToWorker<string>('GET_SETTING', { key, defaultValue });
        return val !== undefined && val !== null ? val : defaultValue;
      } catch (err) {
        console.warn('Worker getSetting failed, checking memory:', err);
      }
    }
    return this.memSettings[key] !== undefined ? this.memSettings[key] : defaultValue;
  }

  async setSetting(key: string, value: string): Promise<void> {
    this.memSettings[key] = value;
    if (!this.usingFallback && this.worker) {
      try {
        await this.sendToWorker('SET_SETTING', { key, value });
        return;
      } catch (err) {
        console.warn('Worker setSetting failed, saved in memory:', err);
      }
    }
  }

  async getAllSettings(): Promise<Record<string, string>> {
    if (!this.usingFallback && this.worker) {
      try {
        const res = await this.sendToWorker<Record<string, string>>('GET_ALL_SETTINGS');
        return { ...this.memSettings, ...res };
      } catch (err) {
        console.warn('Worker getAllSettings failed, returning memory settings:', err);
      }
    }
    return { ...this.memSettings };
  }
}

// Global singleton instance
export const db = new OpfsDatabase();
export const opfsAdapter = db;
