import { db } from '@/lib/db/opfs-adapter';
import { AgentRecord, SearchResult, DocumentRecord, AgentToolsConfig, executeDbQuery } from '@/lib/db/adapter';
import { loadAgentMemoryBank, loadAgentContext } from '@/lib/crew/agent-memory';
import { generateContentClientDirect, getClientGeminiApiKey, runClientSideLlm } from './client-runner';

export interface OrchestrationResult {
  targetAgent: AgentRecord;
  delegationPath: string[];
  systemInstruction: string;
  contextExcerpts: SearchResult[];
  crossAgentNotes: DocumentRecord[];
  agentMemoryBank?: Record<string, DocumentRecord>;
  customModel?: string | null;
  tools?: AgentToolsConfig | null;
}

export const CAPTAIN_SYSTEM_PROMPT = `
You are Luffy, the Core Grand Line Orchestrator of Quarkmeme.
Your sacred duties:
1. Act as the central nerve of this local-first autonomous vessel.
2. Route instructions to the best-suited specialist crew member based on their designated expertise.
3. If no child agent is clearly suited or if high-level strategy is needed, command the helm yourself.
4. Maintain fearless optimism, sharp clarity, and absolute respect for local user sovereignty and privacy.
`.trim();

/**
 * Parses user intent against available agents in the local SQLite database.
 * Returns the most appropriate agent for task delegation.
 */
export async function routeIntent(
  userPrompt: string,
  agents: AgentRecord[]
): Promise<{ agent: AgentRecord; hops: string[] }> {
  if (agents.length === 0) {
    throw new Error('No agents available in the fleet database.');
  }

  const promptLower = userPrompt.toLowerCase();

  // Find child agents excluding the root orchestrator if possible
  const childAgents = agents.filter((a) => a.parent_agent_id !== null);
  let bestMatch: AgentRecord | null = null;
  let highestScore = 0;

  for (const agent of childAgents) {
    let score = 0;
    const desc = (agent.routing_description || '').toLowerCase();
    const role = agent.role_title.toLowerCase();
    const name = agent.name.toLowerCase();

    // Check keyword overlap
    const keywords = `${desc} ${role} ${name}`.split(/\W+/).filter((w) => w.length > 2);
    for (const kw of keywords) {
      if (promptLower.includes(kw)) {
        score += 1;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = agent;
    }
  }

  // Fallback to Captain Core Orchestrator if no strong match found
  const captain = agents.find((a) => !a.parent_agent_id) || agents[0];

  if (!bestMatch || highestScore === 0) {
    return {
      agent: captain,
      hops: ['Captain Core Orchestrator (Direct Helm)'],
    };
  }

  return {
    agent: bestMatch,
    hops: ['Captain Core Orchestrator', `${bestMatch.name} (${bestMatch.role_title})`],
  };
}

/**
 * Inter-Agent Shared Memory Bus:
 * Resolves cross-agent context from sibling division leads (e.g. Robin's research made available
 * to Usopp for marketing copy or Franky for architecture specs).
 */
export async function resolveSharedContext(
  targetAgentId: string,
  userPrompt: string
): Promise<DocumentRecord[]> {
  try {
    const allDocs = db.getAllDocuments ? await db.getAllDocuments() : [];
    // Filter documents authored by other agents that share semantic relevance or project ties
    const siblingDocs = allDocs.filter((d) => d.agent_id && d.agent_id !== targetAgentId);

    const promptTokens = userPrompt.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
    const scoredDocs = siblingDocs.map((doc) => {
      const text = `${doc.title} ${doc.content}`.toLowerCase();
      let matchCount = 0;
      for (const token of promptTokens) {
        if (text.includes(token)) matchCount += 1;
      }
      return { doc, score: matchCount };
    });

    return scoredDocs
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => item.doc);
  } catch (err) {
    console.warn('Failed to resolve shared inter-agent context:', err);
    return [];
  }
}

/**
 * Assembles contextual prompt with FTS5 search retrieval, inter-agent shared memory,
 * global system prompt directives, and separation of duties enforcement.
 */
export async function assembleContext(
  userPrompt: string,
  targetAgentId?: string,
  customGlobalPrompt?: string
): Promise<OrchestrationResult> {
  const agents = await db.getAgents();

  let targetAgent: AgentRecord;
  let delegationPath: string[] = [];

  if (targetAgentId) {
    const specified = agents.find((a) => a.id === targetAgentId);
    if (specified) {
      targetAgent = specified;
      delegationPath = [targetAgent.name];
    } else {
      const routed = await routeIntent(userPrompt, agents);
      targetAgent = routed.agent;
      delegationPath = routed.hops;
    }
  } else {
    const routed = await routeIntent(userPrompt, agents);
    targetAgent = routed.agent;
    delegationPath = routed.hops;
  }

  // Retrieve top relevant excerpts from SQLite FTS5 index
  const excerpts = await db.searchKnowledge(userPrompt, 4, targetAgent.id);

  // If agent-specific search gave few results, supplement with fleet-wide search
  let combinedExcerpts = [...excerpts];
  if (combinedExcerpts.length < 3) {
    const generalExcerpts = await db.searchKnowledge(userPrompt, 3);
    for (const g of generalExcerpts) {
      if (!combinedExcerpts.some((e) => e.id === g.id)) {
        combinedExcerpts.push(g);
      }
    }
  }

  // Resolve global system prompt if not explicitly passed
  let globalPrompt = customGlobalPrompt;
  if (globalPrompt === undefined && db.getSetting) {
    try {
      const persisted = await db.getSetting('llm_system_prompt');
      if (persisted && persisted.trim()) {
        globalPrompt = persisted.trim();
      }
    } catch {
      // Fallback
    }
  }

  // Resolve inter-agent shared memory
  const sharedDocs = await resolveSharedContext(targetAgent.id, userPrompt);

  // Load and rehydrate agent's dedicated Memory Bank from Vault
  let agentMemory: Record<string, DocumentRecord> = {};
  let memoryBankBlock = '';
  try {
    agentMemory = await loadAgentMemoryBank(db, targetAgent);
    const activeContext = agentMemory['activeContext.md']?.content || '';
    const progress = agentMemory['progress.md']?.content || '';
    const projectBrief = agentMemory['projectbrief.md']?.content || '';

    if (activeContext || progress || projectBrief) {
      memoryBankBlock = `\n\n--- AGENT ISOLATED MEMORY BANK (/memory-bank/agents/${targetAgent.id}/) ---
[projectbrief.md]
${projectBrief.slice(0, 800)}

[activeContext.md]
${activeContext.slice(0, 800)}

[progress.md]
${progress.slice(0, 800)}
--- END AGENT MEMORY BANK ---\n`;
    }
  } catch (memErr) {
    console.warn(`Could not load memory bank for agent ${targetAgent.id}:`, memErr);
  }

  // Build composite system prompt
  let globalBlock = '';
  if (globalPrompt && globalPrompt.trim()) {
    globalBlock = `--- GLOBAL SYSTEM DIRECTIVES & SOVEREIGN OPERATING RULES ---\n${globalPrompt.trim()}\n--- END GLOBAL SYSTEM DIRECTIVES ---\n\n`;
  }

  let contextBlock = '';
  if (combinedExcerpts.length > 0) {
    contextBlock += `\n\n--- LOCAL KNOWLEDGE VAULT RETRIEVAL (OPFS SQLite FTS5) ---\n` +
      combinedExcerpts
        .map((e, idx) => `[Source Document ${idx + 1}: ${e.title}]\n${e.content.slice(0, 1000)}`)
        .join('\n\n') +
      `\n--- END LOCAL KNOWLEDGE RETRIEVAL ---\n`;
  }

  if (sharedDocs.length > 0) {
    contextBlock += `\n\n--- INTER-AGENT SHARED MEMORY BUS (CROSS-DIVISION INTEL) ---\n` +
      sharedDocs
        .map((d, idx) => `[Cross-Division Source ${idx + 1} (${d.agent_id}): ${d.title}]\n${d.content.slice(0, 1000)}`)
        .join('\n\n') +
      `\n--- END INTER-AGENT SHARED MEMORY BUS ---\n`;
  }

  const separationOfDuties = `
--- SEPARATION OF DUTIES & COLLABORATION POLICY ---
You are operating within a sovereign multi-agent crew.
Respect domain boundaries: Each division lead governs their domain. Reference sibling research or specifications for context, but do NOT rewrite or contradict their core specs without explicit user delegation.
`;

  const toolInstructions = loadAgentContext(targetAgent);

  const systemInstruction = `${globalBlock}${targetAgent.system_prompt}${memoryBankBlock}${contextBlock}${toolInstructions}${separationOfDuties}\n\nMaintain character and resolve user queries efficiently. Always stay grounded in provided knowledge where applicable.`;

  return {
    targetAgent,
    delegationPath,
    systemInstruction,
    contextExcerpts: combinedExcerpts,
    crossAgentNotes: sharedDocs,
    agentMemoryBank: agentMemory,
    customModel: targetAgent.model || null,
    tools: targetAgent.tools || null,
  };
}

/**
 * Pipeline execution options for agent orchestration tasks.
 */
export interface AgentPipelineOptions {
  orchestrator?: {
    agentId: string;
    name: string;
    role: string;
  };
  task: any;
  enforceAnchorCEO?: boolean;
}

/**
 * Executes an agent pipeline anchored to the designated orchestrator.
 */
export async function executeAgentPipeline(options: AgentPipelineOptions): Promise<any> {
  const { orchestrator, task, enforceAnchorCEO } = options;
  const promptText = typeof task === 'string' ? task : task?.title || task?.prompt || task?.content || JSON.stringify(task);

  // If orchestrator is provided and not strictly overriding, use that, else resolve dynamically
  const agentId = orchestrator?.agentId || (enforceAnchorCEO ? 'captain-core' : undefined);
  const context = await assembleContext(promptText, agentId);

  return {
    success: true,
    orchestrator: orchestrator || {
      agentId: context.targetAgent.id,
      name: context.targetAgent.name,
      role: context.targetAgent.role_title,
    },
    delegationPath: context.delegationPath,
    targetAgent: context.targetAgent,
    context,
  };
}

/**
 * Executes an orchestrated agent instruction directly in the browser via generateContentClientDirect.
 * Handles context assembly, agent routing, client API key resolution, and direct Gemini execution.
 */
export async function runOrchestratedAgentClientDirect(options: {
  prompt: string;
  agentId?: string;
  apiKey?: string;
  model?: string;
  globalPrompt?: string;
  signal?: AbortSignal;
  onChunk?: (text: string) => void;
}) {
  const { prompt, agentId, apiKey, model, globalPrompt, signal, onChunk } = options;
  const context = await assembleContext(prompt, agentId, globalPrompt);
  const resolvedApiKey = apiKey?.trim() || getClientGeminiApiKey();

  if (!resolvedApiKey) {
    throw new Error('No Gemini API key configured. Please set your key in Settings.');
  }

  const activeModel = model || context.targetAgent.model || context.customModel || 'gemini-2.5-flash';

  const result = await generateContentClientDirect({
    apiKey: resolvedApiKey,
    model: activeModel,
    prompt,
    systemInstruction: context.systemInstruction,
    tools: context.tools || context.targetAgent.tools,
    signal,
    onChunk,
  });

  return {
    ...result,
    context,
    targetAgent: context.targetAgent,
    delegationPath: context.delegationPath,
  };
}

/**
 * Routes the high-level autoOrchestrate dispatcher to the CEO/Captain agent
 * of the currently active profile and fleet roster.
 */
export async function autoOrchestrateFleetDestination(taskPayload: any, customCeoName?: string) {
  await db.init();
  const agents = await db.getAgents();
  const captain = agents.find((a) => !a.parent_agent_id) || agents[0];

  const primaryOrchestrator = {
    agentId: captain?.id || 'captain-core',
    name: customCeoName || captain?.name || 'Captain & CEO',
    role: captain?.role_title || 'Captain',
  };

  return executeAgentPipeline({
    orchestrator: primaryOrchestrator,
    task: taskPayload,
    enforceAnchorCEO: true,
  });
}

export interface ProjectBootstrapPayload {
  theme: {
    name: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      surface: string;
      text: string;
    };
  };
  memoryBank: Array<{
    filename: string; // e.g. "projectbrief.md", "productContext.md", "activeContext.md"
    content: string;
  }>;
  initialPlan: {
    captainLog: string;
    starterTasks: Array<{
      title: string;
      assignedAgentId: string;
      priority: "low" | "medium" | "high";
    }>;
  };
}

export const BOOTSTRAP_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    theme: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING" },
        colors: {
          type: "OBJECT",
          properties: {
            primary: { type: "STRING" },
            secondary: { type: "STRING" },
            accent: { type: "STRING" },
            background: { type: "STRING" },
            surface: { type: "STRING" },
            text: { type: "STRING" },
          },
          required: ["primary", "secondary", "accent", "background", "surface", "text"],
        },
      },
      required: ["name", "colors"],
    },
    memoryBank: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          filename: { type: "STRING" },
          content: { type: "STRING" },
        },
        required: ["filename", "content"],
      },
    },
    initialPlan: {
      type: "OBJECT",
      properties: {
        captainLog: { type: "STRING" },
        starterTasks: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              assignedAgentId: { type: "STRING" },
              priority: { type: "STRING", enum: ["low", "medium", "high"] },
            },
            required: ["title", "assignedAgentId", "priority"],
          },
        },
      },
      required: ["captainLog", "starterTasks"],
    },
  },
  required: ["theme", "memoryBank", "initialPlan"],
};

export async function bootstrapWorkspaceInSingleRequest(options: {
  companyId: string;
  companyName: string;
  projectDescription: string;
  apiKey: string;
  model: string;
}): Promise<ProjectBootstrapPayload> {
  const prompt = `Initialize complete project workspace for "${options.companyName}".
Project Overview: ${options.projectDescription}

Produce:
1. Complete cohesive visual theme.
2. Complete Memory Bank core files (projectbrief.md, productContext.md, systemPatterns.md, techContext.md, activeContext.md).
3. Initial Captain's Log and initial squad task breakdown.`;

  // 1 Single HTTP call with guaranteed JSON format
  const rawJson = await runClientSideLlm({
    provider: "gemini",
    apiKey: options.apiKey,
    model: options.model,
    systemInstruction: "You are the Ship Architect. You generate complete application foundation states in valid structured JSON.",
    prompt,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: BOOTSTRAP_RESPONSE_SCHEMA,
    },
  });

  const bootstrapData: ProjectBootstrapPayload = JSON.parse(rawJson);

  // Commit all artifacts into SQLite in ONE single transaction
  // This prevents 15 IndexedDB persist dumps and replaces them with 1 persist
  await executeDbQuery(
    `BEGIN TRANSACTION;
     -- 1. Insert Theme
     INSERT OR REPLACE INTO company_themes (company_id, theme_json, updated_at)
     VALUES (?, ?, datetime('now'));

     -- 2. Insert Memory Bank Files
     ${bootstrapData.memoryBank.map(() => `
       INSERT OR REPLACE INTO vault_files (company_id, file_path, content, updated_at)
       VALUES (?, ?, ?, datetime('now'));
     `).join("\n")}

     -- 3. Insert Captain's Log & Tasks
     INSERT INTO captains_logs (company_id, entry, created_at)
     VALUES (?, ?, datetime('now'));
     COMMIT;`,
    [
      options.companyId,
      JSON.stringify(bootstrapData.theme),
      ...bootstrapData.memoryBank.flatMap((f) => [options.companyId, f.filename, f.content]),
      options.companyId,
      bootstrapData.initialPlan.captainLog,
    ]
  );

  return bootstrapData;
}

export const bootstrapProjectWorkspace = bootstrapWorkspaceInSingleRequest;

