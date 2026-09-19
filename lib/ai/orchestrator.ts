import { db } from '@/lib/db/opfs-adapter';
import { AgentRecord, SearchResult } from '@/lib/db/adapter';

export interface OrchestrationResult {
  targetAgent: AgentRecord;
  delegationPath: string[];
  systemInstruction: string;
  contextExcerpts: SearchResult[];
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
 * Assembles contextual prompt with FTS5 search retrieval and agent personality
 */
export async function assembleContext(
  userPrompt: string,
  targetAgentId?: string
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

  // Build composite system prompt
  let contextBlock = '';
  if (combinedExcerpts.length > 0) {
    contextBlock = `\n\n--- LOCAL KNOWLEDGE VAULT RETRIEVAL (OPFS SQLite FTS5) ---\n` +
      combinedExcerpts
        .map((e, idx) => `[Source Document ${idx + 1}: ${e.title}]\n${e.content.slice(0, 1000)}`)
        .join('\n\n') +
      `\n--- END LOCAL KNOWLEDGE RETRIEVAL ---\n`;
  }

  const systemInstruction = `${targetAgent.system_prompt}${contextBlock}\n\nMaintain character and resolve user queries efficiently. Always stay grounded in provided knowledge where applicable.`;

  return {
    targetAgent,
    delegationPath,
    systemInstruction,
    contextExcerpts: combinedExcerpts,
  };
}
