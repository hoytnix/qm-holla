import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { messages, systemPrompt, apiKey, model, provider } = await req.json();

    const selectedProvider = provider || (apiKey?.startsWith('sk-') ? 'openai' : 'gemini');
    const key =
      apiKey ||
      (selectedProvider === 'gemini'
        ? process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
        : process.env.OPENAI_API_KEY);

    // If no external key is provided, stream a friendly fallback offline response
    if (!key) {
      const offlineMsg = `[Quarkmeme Local Mode]\nNo API key configured in browser settings or environment variables. Working offline with local SQLite WASM & OPFS storage. To enable live inference, provide an OpenAI or Gemini API key in Settings.`;

      const stream = new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          let pos = 0;
          const chunkSize = 16;
          const interval = setInterval(() => {
            if (pos < offlineMsg.length) {
              const chunk = offlineMsg.slice(pos, pos + chunkSize);
              pos += chunkSize;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
            } else {
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              clearInterval(interval);
              controller.close();
            }
          }, 35);
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Direct fetch streaming to OpenAI-compatible endpoint or Gemini
    if (selectedProvider === 'gemini') {
      const geminiModel = model || 'gemini-2.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?alt=sse&key=${key}`;

      const contents = (messages || []).map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const body: any = {
        contents,
      };

      if (systemPrompt) {
        body.systemInstruction = {
          parts: [{ text: systemPrompt }],
        };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return new Response(JSON.stringify({ error: `Gemini API Error: ${errorText}` }), {
          status: res.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Transform Gemini SSE to simple text chunks
      const reader = res.body?.getReader();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          if (!reader) {
            controller.close();
            return;
          }
          let buffer = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const dataStr = line.replace(/^data: /, '').trim();
                  if (!dataStr) continue;
                  try {
                    const parsed = JSON.parse(dataStr);
                    const candidate = parsed.candidates?.[0];
                    const chunk = candidate?.content?.parts?.[0]?.text;
                    if (chunk) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
                      );
                    }
                  } catch {}
                }
              }
            }
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } catch (err: any) {
            controller.error(err);
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } else {
      // OpenAI streaming standard
      const openaiModel = model || 'gpt-4o-mini';
      const formattedMessages = [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        ...(messages || []).map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
      ];

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: openaiModel,
          messages: formattedMessages,
          stream: true,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return new Response(JSON.stringify({ error: `OpenAI API Error: ${errorText}` }), {
          status: res.status,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const reader = res.body?.getReader();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          if (!reader) {
            controller.close();
            return;
          }
          let buffer = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const dataStr = line.slice(6).trim();
                  if (dataStr === '[DONE]') {
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    continue;
                  }
                  try {
                    const parsed = JSON.parse(dataStr);
                    const chunk = parsed.choices?.[0]?.delta?.content;
                    if (chunk) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
                      );
                    }
                  } catch {}
                }
              }
            }
            controller.close();
          } catch (err: any) {
            controller.error(err);
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
