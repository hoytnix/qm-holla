import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

export const runtime = 'nodejs';

// Schema for each agent assignment in the custom universe
const CustomAgentMappingSchema = z.object({
  id: z.enum([
    'captain-core',
    'scholar-robin',
    'shipwright-franky',
    'navigator-nami',
    'doctor-chopper',
    'chef-sanji',
    'sniper-usopp',
  ]),
  role: z.enum([
    'Captain',
    'Scholar',
    'Shipwright',
    'Navigator',
    'Doctor',
    'Cook',
    'Sniper',
  ]),
  characterName: z.string(),
  thematicTitle: z.string(),
  systemPrompt: z.string(),
  routingDescription: z.string(),
  avatarIcon: z.string().optional(),
});

// Full universe schema
const CustomUniverseResponseSchema = z.object({
  universeName: z.string(),
  defaultGroup: z.string(),
  tagline: z.string(),
  leaderTitle: z.string(),
  accentColor: z.string(),
  accentBg: z.string(),
  accentBorder: z.string(),
  badgeBg: z.string(),
  badgeText: z.string(),
  description: z.string(),
  characters: z.array(CustomAgentMappingSchema),
});

export type CustomUniverseResponse = z.infer<typeof CustomUniverseResponseSchema>;

function parseErrorMessage(err: any): { message: string; status: number } {
  if (!err) return { message: 'Unknown error occurred during custom theme generation', status: 500 };

  let status = typeof err.status === 'number' ? err.status : 500;
  let rawMsg = err.message || (typeof err === 'string' ? err : '');

  if (rawMsg && typeof rawMsg === 'string') {
    try {
      const parsed = JSON.parse(rawMsg);
      if (parsed?.error) {
        if (typeof parsed.error.code === 'number') status = parsed.error.code;
        if (typeof parsed.error.message === 'string') {
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

  return { message: rawMsg || 'Failed to generate custom theme', status };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      title,
      apiKey: bodyApiKey,
      provider: bodyProvider,
      model: bodyModel,
      baseUrl: bodyBaseUrl,
    } = body;

    const queryTitle = (title || req.nextUrl.searchParams.get('title') || '').trim();

    if (!queryTitle) {
      return NextResponse.json(
        { error: 'Please provide a movie or TV show title to generate a custom universe.' },
        { status: 400 }
      );
    }

    // Extract ephemeral credentials from incoming headers or fallback to body payload / env
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

    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json(
        {
          error:
            'No LLM API key configured. Please configure your API key in Settings before generating custom universes.',
        },
        { status: 401 }
      );
    }

    const cleanApiKey = apiKey.trim();

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

    // 1. Google Gemini via official @google/genai SDK
    if (provider === 'gemini') {
      const selectedModel = model || 'gemini-2.5-flash';
      const ai = new GoogleGenAI({
        apiKey: cleanApiKey,
        ...(baseUrl && baseUrl !== 'https://generativelanguage.googleapis.com/v1beta'
          ? { baseUrl }
          : {}),
      });

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Create a custom agent crew universe mapping for: "${queryTitle}". Return pure JSON matching the requested schema.`,
              },
            ],
          },
        ],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              universeName: { type: Type.STRING },
              defaultGroup: { type: Type.STRING },
              tagline: { type: Type.STRING },
              leaderTitle: { type: Type.STRING },
              accentColor: { type: Type.STRING },
              accentBg: { type: Type.STRING },
              accentBorder: { type: Type.STRING },
              badgeBg: { type: Type.STRING },
              badgeText: { type: Type.STRING },
              description: { type: Type.STRING },
              characters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: {
                      type: Type.STRING,
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
                      type: Type.STRING,
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
                    characterName: { type: Type.STRING },
                    thematicTitle: { type: Type.STRING },
                    systemPrompt: { type: Type.STRING },
                    routingDescription: { type: Type.STRING },
                    avatarIcon: { type: Type.STRING },
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
              'accentColor',
              'accentBg',
              'accentBorder',
              'badgeBg',
              'badgeText',
              'description',
              'characters',
            ],
          },
        },
      });

      const rawJson = response.text?.trim() || '{}';
      const parsedData = JSON.parse(rawJson);
      const validated = CustomUniverseResponseSchema.parse(parsedData);

      return NextResponse.json(validated);
    }

    // 2. OpenRouter or OpenAI-compatible provider via generateObject
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
      const openai = createOpenAI({
        baseURL: baseUrl || 'https://api.openai.com/v1',
        apiKey: cleanApiKey,
      });
      const selectedModel = model || 'gpt-4o-mini';
      languageModel = openai(selectedModel);
    }

    const { object } = await generateObject({
      model: languageModel,
      schema: CustomUniverseResponseSchema,
      system: systemPrompt,
      prompt: `Create a custom agent crew universe mapping for: "${queryTitle}".`,
    });

    return NextResponse.json(object);
  } catch (err: any) {
    const { message, status } = parseErrorMessage(err);
    console.error('API /api/themes/custom error:', { status, message });
    return NextResponse.json({ error: message }, { status });
  }
}
