export interface AgentRecord {
  id: string;
  name: string;
  role_title: string;
  avatar_url?: string | null;
  system_prompt: string;
  routing_description?: string | null;
  parent_agent_id?: string | null;
  created_at?: string;
}

export interface ProjectRecord {
  id: string;
  agent_id: string;
  title: string;
  description?: string | null;
  category: string; // 'dev', 'marketing', 'finance', 'health', 'operations', 'research'
  is_private?: number; // 0 | 1
  created_at?: string;
  updated_at?: string;
}

export interface TaskRecord {
  id: string;
  project_id: string;
  agent_id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority?: 'low' | 'medium' | 'high';
  completed_at?: string | null;
  created_at?: string;
}

export interface KbRecord {
  id: string;
  agent_id: string;
  name: string;
  description?: string | null;
  created_at?: string;
}

export interface DocumentRecord {
  id: string;
  project_id?: string | null;
  kb_id?: string | null;
  agent_id?: string | null;
  title: string;
  content: string;
  metadata?: string | null; // JSON string for tags, frontmatter, and source context
  file_path?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SearchResult {
  id: string;
  kb_id?: string | null;
  project_id?: string | null;
  agent_id?: string;
  title: string;
  content: string;
  metadata?: string | null;
  rank?: number;
}

export interface MessageRecord {
  id: string;
  thread_id: string;
  sender_type: 'user' | 'orchestrator' | 'agent';
  agent_id?: string | null;
  content: string;
  delegation_trace?: string | null; // JSON string
  created_at?: string;
}

export interface IQuarkDatabase {
  init(): Promise<void>;
  getAgents(): Promise<AgentRecord[]>;
  getAgentById(id: string): Promise<AgentRecord | null>;
  saveAgent(agent: AgentRecord): Promise<void>;
  deleteAgent?(id: string): Promise<void>;

  // Projects
  getProjects(): Promise<ProjectRecord[]>;
  getProjectsForAgent(agentId: string): Promise<ProjectRecord[]>;
  getProjectById(id: string): Promise<ProjectRecord | null>;
  saveProject(project: ProjectRecord): Promise<void>;
  deleteProject?(id: string): Promise<void>;

  // Tasks
  getTasks(projectId?: string): Promise<TaskRecord[]>;
  getTasksForProject(projectId: string): Promise<TaskRecord[]>;
  saveTask(task: TaskRecord): Promise<void>;
  toggleTaskStatus(taskId: string): Promise<TaskRecord | null>;
  deleteTask?(id: string): Promise<void>;

  // Knowledge Bases & Documents
  getKbs(): Promise<KbRecord[]>;
  getKbsForAgent(agentId: string): Promise<KbRecord[]>;
  saveKb(kb: KbRecord): Promise<void>;
  getDocumentsForAgent(agentId: string): Promise<DocumentRecord[]>;
  getDocumentsForKb?(kbId: string): Promise<DocumentRecord[]>;
  getDocumentsByProject(projectId: string): Promise<DocumentRecord[]>;
  getAllDocuments?(): Promise<DocumentRecord[]>;
  getDocumentById?(id: string): Promise<DocumentRecord | null>;
  saveDocument(doc: DocumentRecord): Promise<void>;
  deleteDocument?(id: string): Promise<void>;
  searchKnowledge(query: string, limit?: number, agentId?: string): Promise<SearchResult[]>;
  searchDocuments(query: string, limit?: number, agentId?: string): Promise<SearchResult[]>;

  // Messages
  saveMessage(message: MessageRecord): Promise<void>;
  getMessages(threadId: string): Promise<MessageRecord[]>;
  clearMessages?(threadId?: string): Promise<void>;
}
