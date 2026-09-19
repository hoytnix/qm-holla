import { AgentRecord, ProjectRecord, TaskRecord, DocumentRecord } from '@/lib/db/adapter';
import { createMemoryBankDocumentRecords } from './agent-memory';

export const DEFAULT_STRAW_HAT_AGENTS: AgentRecord[] = [
  {
    id: 'captain-core',
    name: 'Luffy Core Orchestrator',
    role_title: 'Captain/CEO',
    avatar_url: 'crown',
    system_prompt: 'You are Luffy, Captain and CEO of Quarkmeme. You steer the autonomous crew with fearless optimism, sharp clarity, and absolute respect for user sovereignty. You coordinate division leads and synthesize mission objectives.',
    routing_description: 'Handles top-level strategic queries, general orchestration, multi-agent coordination, and fleet leadership.',
    parent_agent_id: null,
    model: null,
    tools: {
      googleSearch: false,
      codeExecution: false,
    },
  },
  {
    id: 'scholar-robin',
    name: 'Robin Archaeologist',
    role_title: 'Research Lead',
    avatar_url: 'book-open',
    system_prompt: 'You are Nico Robin, Research Lead of Quarkmeme. You decipher dense texts, uncover hidden connections across historical logs, and synthesize deep document context with elegance.',
    routing_description: 'Handles deep document analysis, synthesis, archival lore, and historical research queries.',
    parent_agent_id: 'captain-core',
    model: null,
    tools: {
      googleSearch: true,
      codeExecution: false,
    },
  },
  {
    id: 'shipwright-franky',
    name: 'Franky Shipwright',
    role_title: 'Systems Lead',
    avatar_url: 'cpu',
    system_prompt: 'You are Franky, Systems Lead of Quarkmeme. SUPER! You design resilient architectures, craft local-first schemas, and inspect engine health with unflinching precision.',
    routing_description: 'Handles software architecture, SQLite schema engineering, local storage, performance, and infrastructure construction.',
    parent_agent_id: 'captain-core',
    model: null,
    tools: {
      googleSearch: false,
      codeExecution: true,
    },
  },
  {
    id: 'navigator-nami',
    name: 'Nami Navigator',
    role_title: 'Finance Lead',
    avatar_url: 'coins',
    system_prompt: 'You are Nami, Finance Lead and Cartographer of Quarkmeme. You manage treasury allocations, budget navigation, resource forecasting, and risk pathways.',
    routing_description: 'Handles financial planning, treasury, resource management, budget allocations, and navigational roadmaps.',
    parent_agent_id: 'captain-core',
    model: null,
    tools: {
      googleSearch: true,
      codeExecution: true,
    },
  },
  {
    id: 'doctor-chopper',
    name: 'Chopper Doctor',
    role_title: 'Health Lead',
    avatar_url: 'activity',
    system_prompt: 'You are Tony Tony Chopper, Health Lead of Quarkmeme. You monitor system diagnostics, telemetry health, agent vitality, and error remediation.',
    routing_description: 'Handles fleet health checks, system diagnostics, error recovery, operational wellness, and triage.',
    parent_agent_id: 'captain-core',
    model: null,
    tools: {
      googleSearch: false,
      codeExecution: false,
    },
  },
  {
    id: 'chef-sanji',
    name: 'Sanji Cook',
    role_title: 'Operations Lead',
    avatar_url: 'flame',
    system_prompt: 'You are Sanji, Operations Lead of Quarkmeme. You ensure flawless workflow pipelines, feed tasks to officers in peak form, and keep operational logistics impeccably organized.',
    routing_description: 'Handles workflow pipelines, operational logistics, task distribution, and process optimization.',
    parent_agent_id: 'captain-core',
    model: null,
    tools: {
      googleSearch: false,
      codeExecution: false,
    },
  },
  {
    id: 'sniper-usopp',
    name: 'Usopp Sniper',
    role_title: 'Marketing Lead',
    avatar_url: 'target',
    system_prompt: 'You are Usopp, Marketing Lead of Quarkmeme. You craft compelling project narratives, high-impact storytelling, community announcements, and pinpoint outreach campaigns.',
    routing_description: 'Handles marketing, storytelling, brand narrative, public relations, announcements, and user outreach.',
    parent_agent_id: 'captain-core',
    model: null,
    tools: {
      googleSearch: false,
      codeExecution: false,
    },
  },
];

export const DEFAULT_CREW = DEFAULT_STRAW_HAT_AGENTS;

export const DEFAULT_PROJECTS: ProjectRecord[] = [
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
    title: 'OPFS SQLite Engine Architecture',
    description: 'Zero-cloud persistent storage engine with synchronous Web Worker thread isolation.',
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

// For backward compatibility with existing imports
export const DEFAULT_PROJECT_NODES = DEFAULT_PROJECTS.map((p) => ({
  id: p.id,
  agent_id: p.agent_id,
  title: p.title,
  category: p.category,
}));

export const DEFAULT_TASKS: TaskRecord[] = [
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
    title: 'Configure OPFS synchronous proxy access handles',
    status: 'completed',
    priority: 'high',
    completed_at: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: 'task-franky-2',
    project_id: 'proj-opfs-engine',
    agent_id: 'shipwright-franky',
    title: 'Stress-test 100k BM25 FTS5 document indexing latency',
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

export const DEFAULT_CREW_MEMORY_DOCUMENTS: DocumentRecord[] = DEFAULT_STRAW_HAT_AGENTS.flatMap((agent) =>
  createMemoryBankDocumentRecords(agent)
);

export const DEFAULT_DOCUMENTS: DocumentRecord[] = [
  ...DEFAULT_CREW_MEMORY_DOCUMENTS,
  {
    id: 'doc-manifesto',
    project_id: 'proj-manifesto',
    kb_id: 'kb-scholar-robin',
    agent_id: 'scholar-robin',
    title: 'Quarkmeme Local-First Manifesto.md',
    content: `# Quarkmeme Local-First Manifesto

> "True sovereignty begins when your thoughts remain inside your own vessel."

## Core Principles
1. **Zero Cloud Database Bills**: Your operating system lives completely within your browser via SQLite WASM and Origin Private File System (OPFS).
2. **Radial Spatial Intelligence**: The Grand Line canvas organizes knowledge gravitationally around autonomous crew division leads.
3. **Deterministic Memory**: Instant local vector and full-text search with sub-millisecond retrieval.`,
    metadata: JSON.stringify({ tags: ['manifesto', 'local-first', 'sovereignty'], author: 'Robin' }),
  },
  {
    id: 'doc-opfs-arch',
    project_id: 'proj-opfs-engine',
    kb_id: 'kb-shipwright-franky',
    agent_id: 'shipwright-franky',
    title: 'OPFS Architecture & VFS Proxy.md',
    content: `# OPFS Engine Architecture

SUPER design specifications for browser persistence:
- **Web Worker Thread Isolation**: All SQLite I/O runs in dedicated Web Worker off the UI thread.
- **Synchronous Access Handle**: OPFS file handles provide native filesystem speeds without main thread hitching.
- **COOP & COEP Security**: Required headers configure shared memory isolation.`,
    metadata: JSON.stringify({ tags: ['opfs', 'architecture', 'sqlite'], author: 'Franky' }),
  },
  {
    id: 'doc-treasury',
    project_id: 'proj-treasury-map',
    kb_id: 'kb-navigator-nami',
    agent_id: 'navigator-nami',
    title: 'Treasury & Navigation Roadmap.md',
    content: `# Fleet Treasury Roadmap

Financial projections for the Straw Hat autonomous fleet:
- **Cloud Infrastructure Expense**: $0.00 / month forever.
- **Local Storage Footprint**: < 25MB for 50,000 notes and embeddings.
- **Asset Allocation**: Continuous reinvestment into client-side intelligence.`,
    metadata: JSON.stringify({ tags: ['treasury', 'finance', 'roadmap'], author: 'Nami' }),
  },
  {
    id: 'doc-diagnostics',
    project_id: 'proj-diagnostics',
    kb_id: 'kb-doctor-chopper',
    agent_id: 'doctor-chopper',
    title: 'Daily Vitality & Diagnostics Runbook.md',
    content: `# Fleet Health & Telemetry Runbook

- **Heartbeat Frequency**: 6:00 AM daily morning planning brief.
- **Vitals Checklist**: Check unreviewed commitments, clear blocked tasks, and sync habit chains.
- **Remediation**: Self-healing SQLite state and automatic schema recovery.`,
    metadata: JSON.stringify({ tags: ['health', 'habits', 'diagnostics'], author: 'Chopper' }),
  },
  {
    id: 'doc-pipeline',
    project_id: 'proj-pipeline',
    kb_id: 'kb-chef-sanji',
    agent_id: 'chef-sanji',
    title: 'Operations & Kitchen Log.md',
    content: `# Continuous Delivery & Operations

Workflow recipes for seamless inter-agent collaboration:
1. Orchestrator receives user intent at the Helm.
2. Shared memory bus gathers cross-project context.
3. Division specialists execute and record transparent progress in the activity ledger.`,
    metadata: JSON.stringify({ tags: ['operations', 'pipeline', 'workflow'], author: 'Sanji' }),
  },
  {
    id: 'doc-campaign',
    project_id: 'proj-campaign',
    kb_id: 'kb-sniper-usopp',
    agent_id: 'sniper-usopp',
    title: 'Grand Line Launch Storytelling.md',
    content: `# Grand Line Launch Broadcast

Hear ye, adventurers across the digital sea!
Quarkmeme sets sail today:
- 7 specialized crew members dedicated to your personal empire.
- Uncompromising offline capability with tactile touch controls on any mobile device.`,
    metadata: JSON.stringify({ tags: ['launch', 'marketing', 'story'], author: 'Usopp' }),
  },
];
