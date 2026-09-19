import { NextRequest } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { GoogleGenAI } from '@google/genai';
import { streamText } from 'ai';

export const runtime = 'nodejs';

function parseErrorMessage(err: any): { message: string; status: number } {
  if (!err) return { message: 'Unknown error occurred during LLM processing', status: 500 };

  let status = typeof err.status === 'number' ? err.status : 500;
  let rawMsg = err.message || (typeof err === 'string' ? err : '');

  // Attempt to parse JSON error wrappers from Gemini / OpenAI SDKs
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
          } catch {
            // Not nested JSON
          }
          return { message: parsed.error.message, status };
        }
      }
    } catch {
      // Not top-level JSON
    }
  }

  // Detect typical rate limits and auth failures
  if (status === 429 || /rate limit|quota|resource_exhausted/i.test(rawMsg)) {
    status = 429;
  } else if (status === 401 || /unauthorized|api key not valid|invalid api key/i.test(rawMsg)) {
    status = 401;
  }

  return { message: rawMsg || 'Internal error during LLM generation', status };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      messages = [],
      systemPrompt = 'You are Luffy, Captain of Quarkmeme.',
      apiKey: bodyApiKey,
      model: bodyModel,
      provider: bodyProvider,
      baseUrl: bodyBaseUrl,
      temperature,
      maxTokens,
    } = body;

    // Extract ephemeral credentials from incoming headers or fallback to body payload
    const headerProvider = req.headers.get('x-llm-provider');
    const headerApiKey = req.headers.get('x-llm-api-key');
    const headerBaseUrl = req.headers.get('x-llm-base-url');
    const headerModel = req.headers.get('x-llm-model');

    const provider = headerProvider || bodyProvider || 'gemini';
    const apiKey =
      headerApiKey ||
      bodyApiKey ||
      (provider === 'gemini'
        ? process.env.GEMINI_API_KEY ||
          process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
          process.env.GOOGLE_GENAI_API_KEY
        : process.env.OPENAI_API_KEY);
    const baseUrl = headerBaseUrl || bodyBaseUrl;
    const model = headerModel || bodyModel;

    // Guard check: If no API key is provided and no server-level fallback exists, return HTTP 401
    if (!apiKey || !apiKey.trim()) {
      return new Response(
        JSON.stringify({
          error: 'No LLM API key configured. Please visit Settings to set up your provider.',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const cleanApiKey = apiKey.trim();

    // 1. Google Gemini Provider via official @google/genai SDK
    if (provider === 'gemini') {
      const selectedModel = model || 'gemini-2.5-flash';
      const ai = new GoogleGenAI({
        apiKey: cleanApiKey,
        ...(baseUrl && baseUrl !== 'https://generativelanguage.googleapis.com/v1beta'
          ? { baseUrl }
          : {}),
      });

      // Prepare contents and system instruction
      const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
      let combinedSystem = systemPrompt || '';

      for (const m of messages) {
        let text = '';
        if (typeof m.content === 'string') {
          text = m.content;
        } else if (Array.isArray(m.content)) {
          text = m.content
            .map((part: any) =>
              typeof part === 'string' ? part : part?.text || JSON.stringify(part)
            )
            .join('\n');
        } else if (m.content) {
          text = JSON.stringify(m.content);
        }

        if (m.role === 'system') {
          combinedSystem = combinedSystem ? `${combinedSystem}\n\n${text}` : text;
        } else {
          contents.push({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: text || ' ' }],
          });
        }
      }

      if (contents.length === 0) {
        contents.push({
          role: 'user',
          parts: [{ text: 'Hello' }],
        });
      }

      const responseStream = await ai.models.generateContentStream({
        model: selectedModel,
        contents,
        config: {
          ...(combinedSystem ? { systemInstruction: combinedSystem } : {}),
          ...(typeof temperature === 'number' ? { temperature } : {}),
          ...(typeof maxTokens === 'number' ? { maxOutputTokens: maxTokens } : {}),
        },
      });

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of responseStream) {
              const text = chunk.text;
              if (text) {
                controller.enqueue(encoder.encode(text));
              }
            }
            controller.close();
          } catch (streamErr: any) {
            console.error('Gemini streaming transmission error:', streamErr);
            controller.error(streamErr);
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache, no-transform',
        },
      });
    }

    // 2. OpenRouter or OpenAI-compatible provider via Vercel AI SDK Core
    const formattedMessages = (messages || []).map((m: any) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    }));

    let languageModel: any;

    if (provider === 'openrouter') {
      const openrouter = createOpenAI({
        baseURL: baseUrl || 'https://openrouter.ai/api/v1',
        apiKey: cleanApiKey,
        headers: {
          'HTTP-Referer': 'https://quarkmeme.com',
          'X-Title': 'Quarkmeme',
        },
      });
      const selectedModel = model || 'google/gemini-2.5-flash';
      languageModel = openrouter(selectedModel);
    } else {
      // openai_compatible (Ollama, Groq, vLLM, OpenAI official)
      const openai = createOpenAI({
        baseURL: baseUrl || 'https://api.openai.com/v1',
        apiKey: cleanApiKey,
      });
      const selectedModel = model || 'gpt-4o-mini';
      languageModel = openai(selectedModel);
    }

    const result = streamText({
      model: languageModel,
      system: systemPrompt || 'You are Luffy, Captain of Quarkmeme.',
      messages: formattedMessages,
      ...(typeof temperature === 'number' ? { temperature } : {}),
      ...(typeof maxTokens === 'number' ? { maxTokens } : {}),
    });

    return result.toTextStreamResponse();
  } catch (err: any) {
    const { message, status } = parseErrorMessage(err);
    console.error('API /api/chat error:', { status, message });
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
