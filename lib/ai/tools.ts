import {
  fetchUrlAsMarkdownDeclaration,
  executeFetchUrlAsMarkdown,
} from './tools/web-markdown';

export { fetchUrlAsMarkdownDeclaration, executeFetchUrlAsMarkdown };

export interface AgentToolsConfig {
  googleSearch?: boolean;
  codeExecution?: boolean;
  fetchUrlMarkdown?: boolean;
  vaultRead?: boolean;
  vaultWrite?: boolean;
  sqliteQueryBuilder?: boolean;
}

export const vaultReadDeclaration = {
  name: 'vault_read',
  description: 'Reads a markdown document or specification from the local Vault by relative path (e.g. memory-bank/projectbrief.md, vault/specs/auth.md, or document titles). Returns the document content.',
  parameters: {
    type: 'OBJECT',
    properties: {
      path: {
        type: 'STRING',
        description: 'The path or file name of the document in the Vault (e.g. "memory-bank/projectbrief.md" or "vault/specs/auth.md")',
      },
    },
    required: ['path'],
  },
};

export const vaultWriteDeclaration = {
  name: 'vault_write',
  description: 'Writes, creates, or appends markdown documents, living specs, and research artifacts directly to the local SQLite Vault. Persists permanently with zero cloud bills.',
  parameters: {
    type: 'OBJECT',
    properties: {
      path: {
        type: 'STRING',
        description: 'The target path or title for the document in the Vault (e.g. "vault/specs/architecture.md")',
      },
      content: {
        type: 'STRING',
        description: 'The Markdown content to write to the document',
      },
      mode: {
        type: 'STRING',
        enum: ['overwrite', 'append'],
        description: 'Write mode: "overwrite" to replace existing content, or "append" to concatenate to existing content.',
      },
    },
    required: ['path', 'content', 'mode'],
  },
};

export const sqliteQueryBuilderDeclaration = {
  name: 'sqlite_query_builder',
  description: 'Executes a safe read/analytical SQL query against the local browser SQLite database. Rejects destructive statements (DROP, ALTER, TRUNCATE, PRAGMA). Returns tabular rows as JSON.',
  parameters: {
    type: 'OBJECT',
    properties: {
      query: {
        type: 'STRING',
        description: 'The SQL SELECT or analytical query to execute against the local SQLite database',
      },
      params: {
        type: 'ARRAY',
        items: {
          type: 'STRING',
        },
        description: 'Optional array of parameter values to bind to query placeholders (?)',
      },
    },
    required: ['query'],
  },
};

export type CustomToolId =
  | 'fetch_url_as_markdown'
  | 'vault_read'
  | 'vault_write'
  | 'sqlite_query_builder';

export type BuiltInToolId = 'googleSearch' | 'codeExecution';

export type ToolId = CustomToolId | BuiltInToolId;

/**
 * Registry map defining both custom functions and built-in Gemini tools.
 */
export const ALL_TOOLS_REGISTRY: Record<
  ToolId,
  | { type: 'custom'; declaration: any }
  | { type: 'builtin'; tool: { googleSearch: Record<string, never> } | { codeExecution: Record<string, never> } }
> = {
  fetch_url_as_markdown: {
    type: 'custom',
    declaration: fetchUrlAsMarkdownDeclaration,
  },
  vault_read: {
    type: 'custom',
    declaration: vaultReadDeclaration,
  },
  vault_write: {
    type: 'custom',
    declaration: vaultWriteDeclaration,
  },
  sqlite_query_builder: {
    type: 'custom',
    declaration: sqliteQueryBuilderDeclaration,
  },
  googleSearch: {
    type: 'builtin',
    tool: { googleSearch: {} },
  },
  codeExecution: {
    type: 'builtin',
    tool: { codeExecution: {} },
  },
};

/**
 * Filter tools for an agent by their tool IDs or config.
 * Groups custom function declarations under [{ functionDeclarations: [...] }]
 * and appends built-in tools ({ googleSearch: {} }, { codeExecution: {} }).
 */
export function filterToolsForAgent(agentToolIds: string[]): any[] {
  const tools: any[] = [];
  const customDecls: any[] = [];

  for (const id of agentToolIds) {
    const entry = ALL_TOOLS_REGISTRY[id as ToolId];
    if (!entry) continue;

    if (entry.type === 'custom') {
      if (!customDecls.some((d) => d.name === entry.declaration.name)) {
        customDecls.push(entry.declaration);
      }
    } else if (entry.type === 'builtin') {
      tools.push(entry.tool);
    }
  }

  if (customDecls.length > 0) {
    tools.unshift({ functionDeclarations: customDecls });
  }

  return tools;
}

export interface GeminiToolGoogleSearch {
  googleSearch: Record<string, never>;
}

export interface GeminiToolCodeExecution {
  codeExecution: Record<string, never>;
}

export interface GeminiToolFunctionDeclarations {
  functionDeclarations: any[];
}

export type GeminiTool =
  | GeminiToolGoogleSearch
  | GeminiToolCodeExecution
  | GeminiToolFunctionDeclarations;

/**
 * Formats tool options for Google Gemini API generateContent / generateContentStream calls.
 * Combines built-in tools (googleSearch, codeExecution) with custom function declarations
 * such as fetchUrlAsMarkdownDeclaration, vault_read, vault_write, and sqlite_query_builder.
 */
export function buildGeminiTools(
  toolsConfig?: AgentToolsConfig | null,
  customFunctionDeclarations?: any[]
): any[] {
  const toolIds: string[] = [];

  if (toolsConfig?.googleSearch) toolIds.push('googleSearch');
  if (toolsConfig?.codeExecution) toolIds.push('codeExecution');
  if (toolsConfig?.fetchUrlMarkdown) toolIds.push('fetch_url_as_markdown');
  if (toolsConfig?.vaultRead) toolIds.push('vault_read');
  if (toolsConfig?.vaultWrite) toolIds.push('vault_write');
  if (toolsConfig?.sqliteQueryBuilder) toolIds.push('sqlite_query_builder');

  const tools = filterToolsForAgent(toolIds);

  if (customFunctionDeclarations && customFunctionDeclarations.length > 0) {
    const existingDeclGroup = tools.find((t) => Array.isArray(t.functionDeclarations));
    if (existingDeclGroup) {
      for (const custom of customFunctionDeclarations) {
        if (!existingDeclGroup.functionDeclarations.some((f: any) => f.name === custom.name)) {
          existingDeclGroup.functionDeclarations.push(custom);
        }
      }
    } else {
      tools.unshift({ functionDeclarations: [...customFunctionDeclarations] });
    }
  }

  return tools;
}

export interface GroundingChunkWeb {
  uri?: string;
  title?: string;
}

export interface GroundingChunk {
  web?: GroundingChunkWeb;
}

export interface GroundingSupportSegment {
  startIndex?: number;
  endIndex?: number;
  text?: string;
}

export interface GroundingSupport {
  groundingChunkIndices?: number[];
  confidenceScores?: number[];
  segment?: GroundingSupportSegment;
}

export interface GroundingMetadata {
  webSearchQueries?: string[];
  groundingChunks?: GroundingChunk[];
  groundingSupports?: GroundingSupport[];
  searchEntryPoint?: {
    renderedContent?: string;
  };
}

export interface ExecutableCodePart {
  language?: string;
  code?: string;
  id?: string;
}

export interface CodeExecutionResultPart {
  outcome?: string; // 'OUTCOME_OK' | 'OUTCOME_FAILED' | 'OUTCOME_DEADLINE_EXCEEDED' | string
  output?: string;
  id?: string;
}

export interface CodeExecutionBlock {
  language?: string;
  code: string;
  output?: string;
  outcome?: string;
  id?: string;
}

export type ChatStreamEvent =
  | { type: 'text'; content: string }
  | { type: 'executable_code'; executableCode: ExecutableCodePart }
  | { type: 'code_execution_result'; codeExecutionResult: CodeExecutionResultPart }
  | { type: 'grounding_metadata'; groundingMetadata: GroundingMetadata }
  | { type: 'done' };

/**
 * Reads a streaming response from /api/chat.
 * Transparently supports both Server-Sent Events (SSE) with metadata
 * and standard plain text chunk streams.
 */
export async function readChatStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onEvent: (event: ChatStreamEvent) => void
): Promise<string> {
  const decoder = new TextDecoder();
  let accumulatedText = '';
  let buffer = '';
  let isSseStream: boolean | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;

    // Detect format from initial bytes if not determined
    if (isSseStream === null) {
      const trimmed = buffer.trimStart();
      if (trimmed.startsWith('data:')) {
        isSseStream = true;
      } else if (trimmed.length > 10) {
        isSseStream = false;
      }
    }

    if (isSseStream === false) {
      // Plain text stream
      accumulatedText += chunk;
      onEvent({ type: 'text', content: chunk });
      buffer = '';
      continue;
    }

    // Process SSE lines
    const lines = buffer.split('\n');
    // Keep the last partial line in buffer
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(':')) continue;

      if (trimmed.startsWith('data:')) {
        isSseStream = true;
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === '[DONE]') {
          onEvent({ type: 'done' });
          continue;
        }

        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.type === 'text') {
            const textContent = parsed.text || parsed.content || '';
            accumulatedText += textContent;
            onEvent({ type: 'text', content: textContent });
          } else if (parsed.type === 'executable_code') {
            onEvent({
              type: 'executable_code',
              executableCode: parsed.executableCode || parsed,
            });
          } else if (parsed.type === 'code_execution_result') {
            onEvent({
              type: 'code_execution_result',
              codeExecutionResult: parsed.codeExecutionResult || parsed,
            });
          } else if (parsed.type === 'grounding_metadata') {
            onEvent({
              type: 'grounding_metadata',
              groundingMetadata: parsed.groundingMetadata || parsed,
            });
          }
        } catch {
          // If not valid JSON, treat as raw text chunk
          accumulatedText += dataStr;
          onEvent({ type: 'text', content: dataStr });
        }
      } else if (isSseStream !== true) {
        // Plain text line
        accumulatedText += line + '\n';
        onEvent({ type: 'text', content: line + '\n' });
      }
    }
  }

  // Flush any remaining buffer if plain text
  if (buffer && isSseStream === false) {
    accumulatedText += buffer;
    onEvent({ type: 'text', content: buffer });
  }

  onEvent({ type: 'done' });
  return accumulatedText;
}
