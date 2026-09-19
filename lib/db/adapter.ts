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

export interface KbRecord {
  id: string;
  agent_id: string;
  name: string;
  description?: string | null;
  created_at?: string;
}

export interface DocumentRecord {
  id: string;
  kb_id: string;
  title: string;
  content: string;
  file_path?: string | null;
  updated_at?: string;
}

export interface SearchResult {
  id: string;
  kb_id: string;
  agent_id?: string;
  title: string;
  content: string;
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
  getKbs(): Promise<KbRecord[]>;
  getKbsForAgent(agentId: string): Promise<KbRecord[]>;
  saveKb(kb: KbRecord): Promise<void>;
  getDocumentsForAgent(agentId: string): Promise<DocumentRecord[]>;
  getDocumentsForKb?(kbId: string): Promise<DocumentRecord[]>;
  getAllDocuments?(): Promise<DocumentRecord[]>;
  saveDocument(doc: DocumentRecord): Promise<void>;
  deleteDocument?(id: string): Promise<void>;
  searchKnowledge(query: string, limit?: number, agentId?: string): Promise<SearchResult[]>;
  saveMessage(message: MessageRecord): Promise<void>;
  getMessages(threadId: string): Promise<MessageRecord[]>;
  clearMessages?(threadId?: string): Promise<void>;
}
