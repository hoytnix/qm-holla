import {
  fetchUrlAsMarkdownDeclaration,
  executeFetchUrlAsMarkdown,
} from './tools/web-markdown';

export { fetchUrlAsMarkdownDeclaration, executeFetchUrlAsMarkdown };

export interface AgentToolsConfig {
  googleSearch?: boolean;
  codeExecution?: boolean;
  fetchUrlMarkdown?: boolean;
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
 * such as fetchUrlAsMarkdownDeclaration.
 */
export function buildGeminiTools(
  toolsConfig?: AgentToolsConfig | null,
  customFunctionDeclarations?: any[]
): any[] {
  const tools: any[] = [];
  const functionDecls: any[] = customFunctionDeclarations ? [...customFunctionDeclarations] : [];

  if (toolsConfig?.googleSearch) {
    tools.push({ googleSearch: {} });
  }

  if (toolsConfig?.codeExecution) {
    tools.push({ codeExecution: {} });
  }

  if (toolsConfig?.fetchUrlMarkdown) {
    // Ensure fetchUrlAsMarkdownDeclaration is included if not already present
    if (!functionDecls.some((f) => f.name === fetchUrlAsMarkdownDeclaration.name)) {
      functionDecls.push(fetchUrlAsMarkdownDeclaration);
    }
  }

  if (functionDecls.length > 0) {
    tools.push({ functionDeclarations: functionDecls });
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
