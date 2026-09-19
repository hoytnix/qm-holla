import {
  IQuarkDatabase,
  AgentRecord,
  ProjectRecord,
  TaskRecord,
  KbRecord,
  DocumentRecord,
  SearchResult,
  MessageRecord,
} from './adapter';
import {
  DEFAULT_STRAW_HAT_AGENTS,
  DEFAULT_PROJECTS,
  DEFAULT_TASKS,
  DEFAULT_DOCUMENTS,
} from '@/lib/crew/default-crew';

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
  private memProjects: ProjectRecord[] = [];
  private memTasks: TaskRecord[] = [];
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
    if (this.memAgents.length === 0) {
      this.memAgents = [...DEFAULT_STRAW_HAT_AGENTS];
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

  // --- Projects ---
  async getProjects(): Promise<ProjectRecord[]> {
    if (this.worker) {
      return this.query<ProjectRecord>('SELECT * FROM projects ORDER BY created_at ASC');
    }
    return [...this.memProjects];
  }

  async getProjectsForAgent(agentId: string): Promise<ProjectRecord[]> {
    if (this.worker) {
      return this.query<ProjectRecord>('SELECT * FROM projects WHERE agent_id = ? ORDER BY created_at ASC', [agentId]);
    }
    return this.memProjects.filter((p) => p.agent_id === agentId);
  }

  async getProjectById(id: string): Promise<ProjectRecord | null> {
    if (this.worker) {
      const rows = await this.query<ProjectRecord>('SELECT * FROM projects WHERE id = ? LIMIT 1', [id]);
      return rows[0] || null;
    }
    return this.memProjects.find((p) => p.id === id) || null;
  }

  async saveProject(project: ProjectRecord): Promise<void> {
    if (this.worker) {
      await this.run(
        `INSERT OR REPLACE INTO projects (id, agent_id, title, description, category, is_private, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          project.id,
          project.agent_id,
          project.title,
          project.description || null,
          project.category,
          project.is_private ? 1 : 0,
        ]
      );
      return;
    }
    const idx = this.memProjects.findIndex((p) => p.id === project.id);
    if (idx >= 0) {
      this.memProjects[idx] = project;
    } else {
      this.memProjects.push(project);
    }
  }

  async deleteProject(id: string): Promise<void> {
    if (this.worker) {
      await this.run('DELETE FROM projects WHERE id = ?', [id]);
      return;
    }
    this.memProjects = this.memProjects.filter((p) => p.id !== id);
  }

  // --- Tasks ---
  async getTasks(projectId?: string): Promise<TaskRecord[]> {
    if (this.worker) {
      if (projectId) {
        return this.query<TaskRecord>('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC', [projectId]);
      }
      return this.query<TaskRecord>('SELECT * FROM tasks ORDER BY created_at ASC');
    }
    if (projectId) {
      return this.memTasks.filter((t) => t.project_id === projectId);
    }
    return [...this.memTasks];
  }

  async getTasksForProject(projectId: string): Promise<TaskRecord[]> {
    return this.getTasks(projectId);
  }

  async saveTask(task: TaskRecord): Promise<void> {
    if (this.worker) {
      await this.run(
        `INSERT OR REPLACE INTO tasks (id, project_id, agent_id, title, status, priority, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          task.id,
          task.project_id,
          task.agent_id,
          task.title,
          task.status || 'pending',
          task.priority || 'medium',
          task.completed_at || null,
        ]
      );
      return;
    }
    const idx = this.memTasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) {
      this.memTasks[idx] = task;
    } else {
      this.memTasks.push(task);
    }
  }

  async toggleTaskStatus(taskId: string): Promise<TaskRecord | null> {
    if (this.worker) {
      return this.sendToWorker<TaskRecord>('TOGGLE_TASK_STATUS', { taskId });
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
  async getKbs(): Promise<KbRecord[]> {
    if (this.worker) {
      return this.query<KbRecord>('SELECT * FROM kbs ORDER BY created_at ASC');
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

  async getAllDocuments(): Promise<DocumentRecord[]> {
    if (this.worker) {
      return this.query<DocumentRecord>('SELECT * FROM documents ORDER BY updated_at DESC');
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
}

// Global singleton instance
export const db = new OpfsDatabase();
