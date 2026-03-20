export interface Project {
  id: string;
  name: string;
  title?: string;
  description?: string;
  created_at: string;
}

export interface KB {
  id: string;
  name: string;
  project_id?: string | null;
  kb_attachments?: any[];
}
