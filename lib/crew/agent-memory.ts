import { DocumentRecord } from '@/lib/db/adapter';

export interface AgentMemoryBankFiles {
  projectbrief: string;
  productContext: string;
  systemPatterns: string;
  techContext: string;
  activeContext: string;
  progress: string;
}

export const CORE_MEMORY_FILES = [
  'projectbrief.md',
  'productContext.md',
  'systemPatterns.md',
  'techContext.md',
  'activeContext.md',
  'progress.md',
] as const;

export type CoreMemoryFileName = typeof CORE_MEMORY_FILES[number];

/**
 * Returns the virtual file path convention for an agent's Memory Bank file in the local Vault.
 * e.g. /memory-bank/agents/captain-core/projectbrief.md
 */
export function getAgentMemoryFilePath(agentId: string, fileName: string): string {
  const cleanName = fileName.endsWith('.md') ? fileName : `${fileName}.md`;
  return `/memory-bank/agents/${agentId}/${cleanName}`;
}

/**
 * Generates initial 6 core Memory Bank markdown documents for an agent based on their profile.
 */
export function generateAgentMemoryBankFiles(agent: {
  id: string;
  name: string;
  role_title: string;
  system_prompt: string;
  routing_description?: string | null;
  parent_agent_id?: string | null;
}): AgentMemoryBankFiles {
  const isCaptain = !agent.parent_agent_id || agent.id === 'captain-core';
  const role = agent.role_title;
  const name = agent.name;
  const routing = agent.routing_description || 'General domain specialist.';
  const systemPrompt = agent.system_prompt;

  return {
    projectbrief: `# Project Brief: ${name} (${role})

## Mission & Purpose
- **Designation**: ${name}
- **Fleet Role**: ${role}
- **Hierarchy Level**: ${isCaptain ? 'Level 0 (Core Orchestrator)' : 'Level 1 (Division Lead Specialist)'}
- **Primary Directives**: ${routing}

## Core Responsibilities
- Maintain domain sovereignty and provide specialized autonomous capabilities to the crew.
- Persist state, findings, and deliverables in client-side OPFS/IndexedDB storage with zero cloud leaks.
- Collaborate with sibling crew members through the orchestrator memory bus without violating domain boundaries.
`,

    productContext: `# Product Context: ${name}

## Domain Scope & User Interaction
- **Target Operations**: ${routing}
- **Interface Points**: The Helm (/chat), Crew Directory (/crew), and Knowledge Vault (/vault).
- **Delegation Protocol**:
  - Activated when queries match domain expertise: "${routing}".
  - Generates transparent activity traces and structured deliverables into the Vault.

## Tone & Operational Persona
${systemPrompt}
`,

    systemPatterns: `# System Patterns: ${name}

## Execution Architecture
1. **Re-hydration**: On every task execution, load isolated domain context from \`/memory-bank/agents/${agent.id}/\`.
2. **Context Synthesis**: Query scoped FTS5 knowledge table and sibling agent logs before execution.
3. **Execution Mode**:
   - PLAN MODE: Evaluate dependencies and format execution roadmap.
   - ACT MODE: Execute tasks, produce markdown deliverables, and record trace.
4. **Synchronization**: Update \`activeContext.md\` and \`progress.md\` upon task completion.

## Architectural Boundaries
- Do not modify sibling domain documents without explicit user or orchestrator delegation.
- Enforce deterministic outputs and graceful local synthesis during offline conditions.
`,

    techContext: `# Tech Context: ${name}

## Environment & Tooling
- **Runtime**: Client-side Next.js App Router Web Worker with SQLite WASM.
- **Storage Layer**: \`/memory-bank/agents/${agent.id}/\` virtual vault documents stored in SQLite/IndexedDB.
- **Search Engine**: SQLite FTS5 with BM25 ranking scoped to agent knowledge bases.
- **Model Providers**: Offline deterministic synthesis or configured LLM APIs via client settings.

## Constraints
- Zero cloud database bills: All agent memory resides locally.
- Strict token hygiene: Excerpts limited to relevant domain scope.
`,

    activeContext: `# Active Context: ${name}

## Current Status
- **Agent Lifecycle**: Active & Provisioned.
- **Current Focus**: Ready for task delegation and user instructions.
- **Active Projects & Tasks**: Synchronized with local SQLite database.

## Recent State Changes
- Memory Bank initialized with 6 core files under \`/memory-bank/agents/${agent.id}/\`.
- Domain directives rehydrated from system prompt.
`,

    progress: `# Progress & Deliverables: ${name}

## Milestone Status
- [x] Memory Bank Directory provisioned (\`/memory-bank/agents/${agent.id}/\`)
- [x] Core domain documentation seeded (6 core files)
- [x] Scoped knowledge base and project alignment established
- [ ] Active task pipeline execution

## Known Issues & Notes
- Ready for autonomous task execution and Helm dispatch.
`,
  };
}

/**
 * Converts generated Memory Bank files into DocumentRecord objects ready for database insertion.
 */
export function createMemoryBankDocumentRecords(
  agent: {
    id: string;
    name: string;
    role_title: string;
    system_prompt: string;
    routing_description?: string | null;
    parent_agent_id?: string | null;
  },
  projectId?: string,
  kbId?: string
): DocumentRecord[] {
  const files = generateAgentMemoryBankFiles(agent);
  const now = new Date().toISOString();

  return (Object.keys(files) as Array<keyof AgentMemoryBankFiles>).map((key) => {
    const fileName = `${key}.md`;
    const filePath = getAgentMemoryFilePath(agent.id, fileName);
    const docId = `mem-${agent.id}-${key}`;

    return {
      id: docId,
      project_id: projectId || null,
      kb_id: kbId || `kb-${agent.id}`,
      agent_id: agent.id,
      title: `${agent.name} - ${fileName}`,
      content: files[key],
      file_path: filePath,
      metadata: JSON.stringify({
        isMemoryBank: true,
        memoryFileName: fileName,
        tags: ['memory-bank', agent.id, key],
      }),
      created_at: now,
      updated_at: now,
    };
  });
}

/**
 * Ensures an agent has their 6 core Memory Bank files provisioned in the local SQLite Vault.
 * Checks for existing memory bank docs and inserts missing ones.
 */
export async function provisionAgentMemoryBank(
  database: {
    getDocumentsForAgent: (agentId: string) => Promise<DocumentRecord[]>;
    saveDocument: (doc: DocumentRecord) => Promise<void>;
  },
  agent: {
    id: string;
    name: string;
    role_title: string;
    system_prompt: string;
    routing_description?: string | null;
    parent_agent_id?: string | null;
  }
): Promise<DocumentRecord[]> {
  try {
    const existingDocs = await database.getDocumentsForAgent(agent.id);
    const existingMemoryDocs = existingDocs.filter(
      (d) => d.file_path && d.file_path.startsWith(`/memory-bank/agents/${agent.id}/`)
    );

    const generatedDocs = createMemoryBankDocumentRecords(agent);
    const savedDocs: DocumentRecord[] = [];

    for (const doc of generatedDocs) {
      const alreadyExists = existingMemoryDocs.find(
        (e) => e.file_path === doc.file_path || e.id === doc.id
      );

      if (!alreadyExists) {
        await database.saveDocument(doc);
        savedDocs.push(doc);
      } else {
        savedDocs.push(alreadyExists);
      }
    }

    return savedDocs;
  } catch (err) {
    console.warn(`Failed to provision memory bank for agent ${agent.id}:`, err);
    return createMemoryBankDocumentRecords(agent);
  }
}

/**
 * Loads an agent's Memory Bank from the local Vault and returns them as a structured map.
 */
export async function loadAgentMemoryBank(
  database: {
    getDocumentsForAgent: (agentId: string) => Promise<DocumentRecord[]>;
    saveDocument: (doc: DocumentRecord) => Promise<void>;
  },
  agent: {
    id: string;
    name: string;
    role_title: string;
    system_prompt: string;
    routing_description?: string | null;
    parent_agent_id?: string | null;
  }
): Promise<Record<string, DocumentRecord>> {
  const docs = await provisionAgentMemoryBank(database, agent);
  const memoryMap: Record<string, DocumentRecord> = {};

  for (const doc of docs) {
    const fileName = doc.file_path?.split('/').pop() || doc.title;
    memoryMap[fileName] = doc;
  }

  return memoryMap;
}

/**
 * Updates an agent's activeContext.md and progress.md in the Vault upon task completion.
 */
export async function syncAgentMemoryBankAfterTask(
  database: {
    getDocumentsForAgent: (agentId: string) => Promise<DocumentRecord[]>;
    saveDocument: (doc: DocumentRecord) => Promise<void>;
  },
  agent: {
    id: string;
    name: string;
    role_title: string;
    system_prompt: string;
    routing_description?: string | null;
    parent_agent_id?: string | null;
  },
  task: {
    id: string;
    title: string;
    project_id: string;
  },
  deliverableTitle?: string
): Promise<void> {
  try {
    const memory = await loadAgentMemoryBank(database, agent);
    const now = new Date().toISOString();
    const timeStr = new Date().toLocaleString();

    // 1. Update activeContext.md
    const activeDoc = memory['activeContext.md'];
    if (activeDoc) {
      const updatedActive = `${activeDoc.content.trim()}

### Recent Execution: ${task.title}
- **Task ID**: \`${task.id}\`
- **Project**: \`${task.project_id}\`
- **Completed At**: ${timeStr}
- **Deliverable**: ${deliverableTitle || 'Task completed and stored in local vault.'}
`;
      await database.saveDocument({
        ...activeDoc,
        content: updatedActive,
        updated_at: now,
      });
    }

    // 2. Update progress.md
    const progressDoc = memory['progress.md'];
    if (progressDoc) {
      const updatedProgress = `${progressDoc.content.trim()}
- [x] Executed task: "${task.title}" (Completed: ${timeStr})
`;
      await database.saveDocument({
        ...progressDoc,
        content: updatedProgress,
        updated_at: now,
      });
    }
  } catch (err) {
    console.warn(`Failed to sync agent Memory Bank after task ${task.id}:`, err);
  }
}

