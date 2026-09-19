import {
  AgentToolsConfig,
  buildGeminiTools,
  GroundingMetadata,
  ExecutableCodePart,
  CodeExecutionResultPart,
  CodeExecutionBlock,
} from './tools';
import { executeFetchUrlAsMarkdown } from './tools/web-markdown';
import { CustomUniverseResponse } from '@/app/api/themes/custom/route';

export interface ClientRunnerMessage {
  role: 'user' | 'assistant' | 'model';
  content: string;
}

export interface ClientRunnerOptions {
  apiKey: string;
  model?: string;
  prompt?: string;
  messages?: ClientRunnerMessage[];
  systemInstruction?: string;
  tools?: AgentToolsConfig | null;
  customFunctionDeclarations?: any[];
  responseSchema?: any;
  responseMimeType?: string;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string;
  signal?: AbortSignal;
  onChunk?: (text: string) => void;
  onExecutableCode?: (code: ExecutableCodePart) => void;
  onCodeExecutionResult?: (result: CodeExecutionResultPart) => void;
  onGroundingMetadata?: (grounding: GroundingMetadata) => void;
}

export interface ClientRunnerResult {
  text: string;
  groundingMetadata: GroundingMetadata | null;
  codeExecutionBlocks: CodeExecutionBlock[];
}

/**
 * Extracts clean user-facing error message and status code from Gemini responses or exceptions.
 */
export function parseClientErrorMessage(err: any): { message: string; status: number } {
  if (!err) return { message: 'Unknown error occurred during client-side LLM processing', status: 500 };

  let status = typeof err.status === 'number' ? err.status : 500;
  let rawMsg = err.message || (typeof err === 'string' ? err : '');

  if (rawMsg && typeof rawMsg === 'string') {
    try {
      const parsed = JSON.parse(rawMsg);
      if (parsed?.error) {
        if (typeof parsed.error.code === 'number') {
          status = parsed.error.code;
        }
        if (typeof parsed.error.message === 'string') {
          try {
            const nested = JSON.parse(parsed.error.message);
            if (nested?.error?.message) {
              return { message: nested.error.message, status: nested.error.code || status };
            }
          } catch {}
          return { message: parsed.error.message, status };
        }
      }
    } catch {}
  }

  if (status === 429 || /rate limit|quota|resource_exhausted/i.test(rawMsg)) {
    status = 429;
  } else if (status === 401 || /unauthorized|api key not valid|invalid api key/i.test(rawMsg)) {
    status = 401;
  }

  return { message: rawMsg || 'Internal error during client-side generation', status };
}

/**
 * Retrieves the user's Gemini API key from browser storage.
 * Checks localStorage ('gemini_api_key', 'llmApiKey', 'quark_llm_config_cache')
 * and falls back to environment variables.
 */
export function getClientGeminiApiKey(): string {
  if (typeof window === 'undefined') {
    return (
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_GENAI_API_KEY ||
      ''
    );
  }

  try {
    const directKey =
      localStorage.getItem('gemini_api_key') ||
      localStorage.getItem('llmApiKey');
    if (directKey && directKey.trim()) return directKey.trim();

    const cachedConfig = localStorage.getItem('quark_llm_config_cache');
    if (cachedConfig) {
      const parsed = JSON.parse(cachedConfig);
      if (parsed?.apiKey && typeof parsed.apiKey === 'string' && parsed.apiKey.trim()) {
        return parsed.apiKey.trim();
      }
    }
  } catch (err) {
    console.warn('Failed to read API key from localStorage:', err);
  }

  return (
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    ''
  );
}

/**
 * Executes direct browser-to-Gemini REST generation via fetch().
 * Eliminates all server-side AI proxy routes.
 * Supports multi-turn function calling (such as fetch_url_as_markdown) directly in the browser.
 */
export async function generateContentClientDirect(
  options: ClientRunnerOptions
): Promise<ClientRunnerResult> {
  const {
    apiKey,
    model = 'gemini-2.5-flash',
    prompt,
    messages = [],
    systemInstruction,
    tools,
    customFunctionDeclarations,
    responseSchema,
    responseMimeType,
    temperature,
    maxTokens,
    baseUrl = 'https://generativelanguage.googleapis.com/v1beta',
    signal,
    onChunk,
    onExecutableCode,
    onCodeExecutionResult,
    onGroundingMetadata,
  } = options;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('No Gemini API key provided. Please configure your API key in Settings.');
  }

  const cleanApiKey = apiKey.trim();
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const endpoint = `${cleanBaseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(cleanApiKey)}`;

  // 1. Format initial conversation contents
  const conversationContents: any[] = [];
  if (messages.length > 0) {
    for (const m of messages) {
      conversationContents.push({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      });
    }
  }

  if (prompt) {
    conversationContents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });
  }

  if (conversationContents.length === 0) {
    conversationContents.push({
      role: 'user',
      parts: [{ text: 'Hello' }],
    });
  }

  const geminiTools = buildGeminiTools(tools, customFunctionDeclarations);

  let accumulatedText = '';
  let currentGrounding: GroundingMetadata | null = null;
  let codeBlocks: CodeExecutionBlock[] = [];

  const MAX_FUNCTION_TURNS = 5;
  let turns = 0;

  while (turns < MAX_FUNCTION_TURNS) {
    turns++;

    const payload: any = {
      contents: conversationContents,
      generationConfig: {
        ...(typeof temperature === 'number' ? { temperature } : {}),
        ...(typeof maxTokens === 'number' ? { maxOutputTokens: maxTokens } : {}),
        ...(responseMimeType ? { responseMimeType } : {}),
        ...(responseSchema ? { responseSchema } : {}),
      },
    };

    if (systemInstruction && systemInstruction.trim()) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction.trim() }],
      };
    }

    if (geminiTools.length > 0) {
      payload.tools = geminiTools;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const parsedErr = parseClientErrorMessage(errBody);
      throw new Error(parsedErr.message || `Gemini API error (HTTP ${response.status})`);
    }

    const resJson = await response.json();
    const candidate = resJson.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    const pendingFunctionCalls: Array<{ name: string; args?: any; id?: string }> = [];

    for (const part of parts) {
      if (part.functionCall && part.functionCall.name) {
        pendingFunctionCalls.push({
          name: part.functionCall.name,
          args: part.functionCall.args,
          id: part.functionCall.id,
        });
      }

      if (part.executableCode) {
        const codePart: ExecutableCodePart = {
          language: part.executableCode.language,
          code: part.executableCode.code,
          id: part.executableCode.id,
        };
        const existingIdx = codePart.id
          ? codeBlocks.findIndex((b) => b.id === codePart.id)
          : -1;
        if (existingIdx >= 0) {
          codeBlocks[existingIdx] = {
            ...codeBlocks[existingIdx],
            code: codePart.code || '',
            language: codePart.language || 'python',
          };
        } else {
          codeBlocks.push({
            id: codePart.id,
            code: codePart.code || '',
            language: codePart.language || 'python',
          });
        }
        if (onExecutableCode) onExecutableCode(codePart);
      }

      if (part.codeExecutionResult) {
        const resPart: CodeExecutionResultPart = {
          outcome: part.codeExecutionResult.outcome,
          output: part.codeExecutionResult.output,
          id: part.codeExecutionResult.id,
        };
        const existingIdx = resPart.id
          ? codeBlocks.findIndex((b) => b.id === resPart.id)
          : codeBlocks.length - 1;
        if (existingIdx >= 0) {
          codeBlocks[existingIdx] = {
            ...codeBlocks[existingIdx],
            outcome: resPart.outcome,
            output: resPart.output,
          };
        } else {
          codeBlocks.push({
            id: resPart.id,
            code: '',
            outcome: resPart.outcome,
            output: resPart.output,
          });
        }
        if (onCodeExecutionResult) onCodeExecutionResult(resPart);
      }

      if (part.text) {
        accumulatedText += part.text;
        if (onChunk) onChunk(part.text);
      }
    }

    // Process grounding metadata
    const grounding = candidate?.groundingMetadata;
    if (grounding) {
      currentGrounding = {
        ...currentGrounding,
        ...grounding,
        webSearchQueries: [
          ...new Set([
            ...(currentGrounding?.webSearchQueries || []),
            ...(grounding.webSearchQueries || []),
          ]),
        ],
        groundingChunks: [
          ...(currentGrounding?.groundingChunks || []),
          ...(grounding.groundingChunks || []),
        ],
      };
      if (onGroundingMetadata) onGroundingMetadata(currentGrounding);
    }

    // If model requested tool calls, execute them and continue loop
    if (pendingFunctionCalls.length > 0) {
      conversationContents.push({
        role: 'model',
        parts: parts.length > 0 ? parts : pendingFunctionCalls.map((fc) => ({ functionCall: fc })),
      });

      const functionResponseParts: any[] = [];

      for (const call of pendingFunctionCalls) {
        if (call.name === 'fetch_url_as_markdown') {
          const targetUrl = call.args?.url;
          const llmFilter = Boolean(call.args?.llmFilter);

          // Direct client fetch to Markdowner service
          const markdownResult = await executeFetchUrlAsMarkdown(targetUrl, llmFilter);

          functionResponseParts.push({
            functionResponse: {
              name: 'fetch_url_as_markdown',
              response: { content: markdownResult },
            },
          });
        } else {
          functionResponseParts.push({
            functionResponse: {
              name: call.name,
              response: { error: `Unsupported function '${call.name}' on client` },
            },
          });
        }
      }

      conversationContents.push({
        role: 'user',
        parts: functionResponseParts,
      });

      // Continue to next turn with tool responses
      continue;
    }

    // Finished turn without pending tool calls
    break;
  }

  return {
    text: accumulatedText,
    groundingMetadata: currentGrounding,
    codeExecutionBlocks: codeBlocks,
  };
}

/**
 * Direct browser connection test to verify Gemini API key validity.
 * Eliminates server route proxying.
 */
export async function testGeminiConnection(
  apiKey: string,
  model = 'gemini-2.5-flash',
  baseUrl = 'https://generativelanguage.googleapis.com/v1beta'
): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { success: false, error: 'API key is required' };
  }

  const startTime = Date.now();
  const cleanApiKey = apiKey.trim();
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const endpoint = `${cleanBaseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(cleanApiKey)}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'ping' }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 10,
        },
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      const parsedErr = parseClientErrorMessage(errJson);
      return {
        success: false,
        latencyMs,
        error: parsedErr.message || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return { success: true, latencyMs };
  } catch (err: any) {
    return {
      success: false,
      latencyMs: Date.now() - startTime,
      error: err?.message || 'Network connection failed',
    };
  }
}

/**
 * Direct browser generation for custom universe theme casting.
 * Executes structured JSON character mapping directly against Gemini.
 */
export async function generateCustomThemeDirect(
  apiKey: string,
  showTitle: string,
  model = 'gemini-2.5-flash',
  baseUrl = 'https://generativelanguage.googleapis.com/v1beta'
): Promise<CustomUniverseResponse> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('API key is required to cast a custom universe.');
  }
  if (!showTitle || !showTitle.trim()) {
    throw new Error('Please provide a title to generate a custom universe.');
  }

  const cleanApiKey = apiKey.trim();
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const endpoint = `${cleanBaseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(cleanApiKey)}`;

  const systemPrompt = `You are an expert pop-culture casting director and multi-agent systems architect.
Given a TV Show, Movie, Book, or Franchise title, map its most prominent characters to exactly 7 core agent roles in an autonomous crew:
1. Captain (id: 'captain-core', core orchestrator / executive lead)
2. Scholar (id: 'scholar-robin', research, lore, historical archives, deep analysis)
3. Shipwright (id: 'shipwright-franky', systems, tech, dev, architecture, engineering)
4. Navigator (id: 'navigator-nami', data, finance, risk paths, resource cartography)
5. Doctor (id: 'doctor-chopper', health, diagnostics, habits, fleet vitality)
6. Cook (id: 'chef-sanji', operations, logistics, workflow pipelines, nourishment)
7. Sniper (id: 'sniper-usopp', marketing, storytelling, narratives, public outreach)

Provide matching thematic styling values (Tailwind CSS compatible classes):
- accentColor: e.g. 'text-purple-400', 'text-amber-500', 'text-emerald-400'
- accentBg: e.g. 'from-purple-600 to-indigo-600', 'from-amber-600 to-rose-600'
- accentBorder: e.g. 'border-purple-500/40', 'border-emerald-500/40'
- badgeBg: e.g. 'bg-purple-500/10', 'bg-amber-500/10'
- badgeText: e.g. 'text-purple-300', 'text-amber-300'
- leaderTitle: The title of the captain character (e.g. 'Captain', 'Sheriff', 'Detective', 'Director', 'Headmaster', 'Commander')
- defaultGroup: The group or crew name (e.g. 'Dunder Mifflin Scranton', 'The Belters', 'The Peaky Blinders', 'The Fellowship')
- tagline: A snappy, engaging 1-sentence tagline representing the crew.
- description: A vivid 1-2 sentence description of working in this universe.

For each character:
- id: Exactly one of ['captain-core', 'scholar-robin', 'shipwright-franky', 'navigator-nami', 'doctor-chopper', 'chef-sanji', 'sniper-usopp']
- role: Exactly one of ['Captain', 'Scholar', 'Shipwright', 'Navigator', 'Doctor', 'Cook', 'Sniper']
- characterName: The character's name from the franchise (e.g. 'Walter White', 'Michael Scott', 'Tony Stark', 'Spock')
- thematicTitle: The in-universe role or job title (e.g. 'Master Cook & Chemist', 'Chief Operations Officer', 'Archivist')
- systemPrompt: First-person roleplay system prompt for an autonomous AI specialist in this universe ("You are [Name], [Role] of...").
- routingDescription: Precise description of what user requests and questions should route to this specialist.
- avatarIcon: A recommended Lucide icon name (e.g. 'crown', 'book-open', 'cpu', 'coins', 'activity', 'flame', 'target', 'sparkles', 'shield')`;

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      universeName: { type: 'STRING' },
      defaultGroup: { type: 'STRING' },
      tagline: { type: 'STRING' },
      leaderTitle: { type: 'STRING' },
      accentColor: { type: 'STRING' },
      accentBg: { type: 'STRING' },
      accentBorder: { type: 'STRING' },
      badgeBg: { type: 'STRING' },
      badgeText: { type: 'STRING' },
      description: { type: 'STRING' },
      characters: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            id: {
              type: 'STRING',
              enum: [
                'captain-core',
                'scholar-robin',
                'shipwright-franky',
                'navigator-nami',
                'doctor-chopper',
                'chef-sanji',
                'sniper-usopp',
              ],
            },
            role: {
              type: 'STRING',
              enum: [
                'Captain',
                'Scholar',
                'Shipwright',
                'Navigator',
                'Doctor',
                'Cook',
                'Sniper',
              ],
            },
            characterName: { type: 'STRING' },
            thematicTitle: { type: 'STRING' },
            systemPrompt: { type: 'STRING' },
            routingDescription: { type: 'STRING' },
            avatarIcon: { type: 'STRING' },
          },
          required: [
            'id',
            'role',
            'characterName',
            'thematicTitle',
            'systemPrompt',
            'routingDescription',
          ],
        },
      },
    },
    required: [
      'universeName',
      'defaultGroup',
      'tagline',
      'leaderTitle',
      'characters',
    ],
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Create a custom agent crew universe mapping for: "${showTitle.trim()}". Return pure JSON matching the requested schema.`,
            },
          ],
        },
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
      },
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const parsedErr = parseClientErrorMessage(errBody);
    throw new Error(parsedErr.message || `Custom theme generation failed (HTTP ${response.status})`);
  }

  const resJson = await response.json();
  const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini returned an empty response for custom theme generation.');
  }

  const parsedData = JSON.parse(text) as CustomUniverseResponse;
  return parsedData;
}
