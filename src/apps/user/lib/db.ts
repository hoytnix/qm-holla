import Dexie, { Table } from 'dexie';

export interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  thoughts?: string[];
  suggested_actions?: string[];
  created_at: Date;
  agent_id: string;
  conversation_id: string;
}

export interface Conversation {
  id: string;
  name: string;
  pinned: boolean;
  created_at: Date;
  agent_id?: string;
}

export class UserDatabase extends Dexie {
  messages!: Table<Message>;
  conversations!: Table<Conversation>;

  constructor() {
    super('SovereignForgeUserDB');
    this.version(2).stores({
      messages: '++id, role, created_at, agent_id, conversation_id',
      conversations: 'id, name, pinned, created_at'
    });
    this.version(3).stores({
      conversations: 'id, name, pinned, created_at, agent_id'
    }).upgrade(async tx => {
      const convs = await tx.table('conversations').toArray();
      for (const conv of convs) {
        const msg = await tx.table('messages').where('conversation_id').equals(conv.id).first();
        if (msg) {
          await tx.table('conversations').update(conv.id, { agent_id: msg.agent_id });
        }
      }
    });
  }
}

export const db = new UserDatabase();
