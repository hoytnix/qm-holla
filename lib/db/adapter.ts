export interface AgentToolsConfig {
  googleSearch?: boolean;
  codeExecution?: boolean;
  fetchUrlMarkdown?: boolean;
  vaultRead?: boolean;
  vaultWrite?: boolean;
  sqliteQueryBuilder?: boolean;
}

export interface AgentRecord {
  id: string;
  name: string;
  role_title: string;
  avatar_url?: string | null;
  system_prompt: string;
  routing_description?: string | null;
  parent_agent_id?: string | null;
  model?: string | null;
  tools?: AgentToolsConfig | null;
  created_at?: string;
}

export interface ProjectRecord {
  id: string;
  agent_id: string;
  title: string;
  description?: string | null;
  category: string; // 'dev', 'marketing', 'finance', 'health', 'operations', 'research'
  is_private?: number; // 0 | 1
  company_id?: string | null;
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
  company_id?: string | null;
  completed_at?: string | null;
  created_at?: string;
}

export interface KbRecord {
  id: string;
  agent_id: string;
  name: string;
  description?: string | null;
  company_id?: string | null;
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
  company_id?: string | null;
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
  grounding_metadata?: string | null; // JSON string of GroundingMetadata
  code_execution?: string | null; // JSON string of CodeExecutionBlock[]
  company_id?: string | null;
  created_at?: string;
}

export interface CompanyProfile {
  id: string;
  name: string;
  owners: string;
  mission_vision: string;
  theme: string;
  custom_universe_query?: string | null;
  custom_theme_config?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface IQuarkDatabase {
  init(): Promise<void>;
  getAgents(): Promise<AgentRecord[]>;
  getAgentById(id: string): Promise<AgentRecord | null>;
  saveAgent(agent: AgentRecord): Promise<void>;
  deleteAgent?(id: string): Promise<void>;

  // Company Profiles
  getCompanyProfiles?(): Promise<CompanyProfile[]>;
  getCompanyProfileById?(id: string): Promise<CompanyProfile | null>;
  saveCompanyProfile?(profile: CompanyProfile): Promise<void>;
  deleteCompanyProfile?(id: string): Promise<void>;
  getActiveCompanyProfileId?(): Promise<string | null>;
  setActiveCompanyProfileId?(id: string): Promise<void>;

  // Projects
  getProjects(companyId?: string): Promise<ProjectRecord[]>;
  getProjectsForAgent(agentId: string, companyId?: string): Promise<ProjectRecord[]>;
  getProjectById(id: string): Promise<ProjectRecord | null>;
  saveProject(project: ProjectRecord): Promise<void>;
  deleteProject?(id: string): Promise<void>;

  // Tasks
  getTasks(projectId?: string, companyId?: string): Promise<TaskRecord[]>;
  getTasksForProject(projectId: string): Promise<TaskRecord[]>;
  saveTask(task: TaskRecord): Promise<void>;
  updateTaskStatus?(taskId: string, status: 'pending' | 'in_progress' | 'completed'): Promise<TaskRecord | null>;
  toggleTaskStatus(taskId: string): Promise<TaskRecord | null>;
  deleteTask?(id: string): Promise<void>;

  // Knowledge Bases & Documents
  getKbs(companyId?: string): Promise<KbRecord[]>;
  getKbsForAgent(agentId: string): Promise<KbRecord[]>;
  saveKb(kb: KbRecord): Promise<void>;
  getDocumentsForAgent(agentId: string): Promise<DocumentRecord[]>;
  getDocumentsForKb?(kbId: string): Promise<DocumentRecord[]>;
  getDocumentsByProject(projectId: string): Promise<DocumentRecord[]>;
  getAllDocuments?(companyId?: string): Promise<DocumentRecord[]>;
  getDocumentById?(id: string): Promise<DocumentRecord | null>;
  saveDocument(doc: DocumentRecord): Promise<void>;
  deleteDocument?(id: string): Promise<void>;
  searchKnowledge(query: string, limit?: number, agentId?: string): Promise<SearchResult[]>;
  searchDocuments(query: string, limit?: number, agentId?: string): Promise<SearchResult[]>;

  // Direct SQL Query Execution
  executeSql?<T = any>(sql: string, params?: any[]): Promise<T[]>;

  // Messages
  saveMessage(message: MessageRecord): Promise<void>;
  getMessages(threadId: string): Promise<MessageRecord[]>;
  clearMessages?(threadId?: string): Promise<void>;

  // Settings & BYOK
  getSetting(key: string, defaultValue?: string): Promise<string>;
  setSetting(key: string, value: string): Promise<void>;
  getAllSettings(): Promise<Record<string, string>>;
}

let activeDbInstance: IQuarkDatabase | null = null;

export function registerDb(dbInstance: IQuarkDatabase): void {
  activeDbInstance = dbInstance;
}

export function getDb(): IQuarkDatabase {
  if (!activeDbInstance) {
    // Dynamic fallback to opfs adapter singleton
    try {
      const { db } = require('./opfs-adapter');
      activeDbInstance = db;
    } catch {
      throw new Error('Database instance has not been registered yet.');
    }
  }
  return activeDbInstance!;
}
