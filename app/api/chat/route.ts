import { NextRequest } from 'next/server';
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { messages, systemPrompt, apiKey: bodyApiKey, model: bodyModel, provider: bodyProvider, baseUrl: bodyBaseUrl } = body;

    // Extract ephemeral credentials from incoming headers or fallback to body payload
    const headerProvider = req.headers.get('x-llm-provider');
    const headerApiKey = req.headers.get('x-llm-api-key');
    const headerBaseUrl = req.headers.get('x-llm-base-url');
    const headerModel = req.headers.get('x-llm-model');

    const provider = headerProvider || bodyProvider || 'gemini';
    const apiKey = headerApiKey || bodyApiKey || (
      provider === 'gemini'
        ? process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
        : process.env.OPENAI_API_KEY
    );
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

    // Format messages for Vercel AI SDK Core
    const formattedMessages = (messages || []).map((m: any) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    }));

    let languageModel: any;

    if (provider === 'openrouter') {
      const openrouter = createOpenAI({
        baseURL: baseUrl || 'https://openrouter.ai/api/v1',
        apiKey: apiKey.trim(),
        headers: {
          'HTTP-Referer': 'https://quarkmeme.com',
          'X-Title': 'Quarkmeme',
        },
      });
      const selectedModel = model || 'google/gemini-2.5-flash';
      languageModel = openrouter(selectedModel);
    } else if (provider === 'gemini') {
      const google = createGoogleGenerativeAI({
        apiKey: apiKey.trim(),
        baseURL: baseUrl && baseUrl !== 'https://generativelanguage.googleapis.com/v1beta' ? baseUrl : undefined,
      });
      const selectedModel = model || 'gemini-2.5-flash';
      languageModel = google(selectedModel);
    } else {
      // openai_compatible (Ollama, Groq, vLLM, OpenAI official)
      const openai = createOpenAI({
        baseURL: baseUrl || 'https://api.openai.com/v1',
        apiKey: apiKey.trim(),
      });
      const selectedModel = model || 'gpt-4o-mini';
      languageModel = openai(selectedModel);
    }

    const result = streamText({
      model: languageModel,
      system: systemPrompt || 'You are Luffy, Captain of Quarkmeme.',
      messages: formattedMessages,
    });

    return result.toTextStreamResponse();
  } catch (err: any) {
    console.error('API /api/chat error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal Server Error during LLM streaming' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
