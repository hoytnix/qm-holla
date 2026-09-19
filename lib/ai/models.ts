export interface ModelOption {
  label: string;
  value: string;
  desc: string;
  category?: string;
  recommended?: boolean;
}

/**
 * Complete Google AI Studio model registry.
 * Exactly matching specified models:
 * Gemini 3.8 Flash, Gemini 3.6 Flash, Deep Research Pro Preview, Gemini 2 Flash,
 * Gemini 2 Flash Lite, Computer Use Preview, Gemini 2.5 Flash, Nano Banana (Gemini 2.5 Flash Preview Image),
 * Gemini 2.5 Flash Lite, Gemini 2.5 Flash TTS, Gemini 2.5 Pro, Gemini 2.5 Pro TTS, Gemini 3 Flash,
 * Nano Banana Pro (Gemini 3 Pro Image), Gemini 3.1 Pro, Nano Banana 2 (Gemini 3.1 Flash Image),
 * Gemini 3.1 Flash Lite, Nano Banana 2 Lite (Gemini 3.1 Flash Lite Image), Gemini 3.1 Flash TTS,
 * Gemini 3.5 Flash, and Gemini 3.5 Flash Lite.
 */
export const GOOGLE_AI_STUDIO_MODELS: ModelOption[] = [
  {
    label: 'Gemini 3.8 Flash',
    value: 'gemini-3.8-flash',
    desc: 'Cutting-edge high-throughput flagship multimodal flash model',
    category: 'Flagship Flash',
    recommended: true,
  },
  {
    label: 'Gemini 3.6 Flash',
    value: 'gemini-3.6-flash',
    desc: 'High-speed reasoning and low-latency agent orchestration',
    category: 'Flagship Flash',
  },
  {
    label: 'Deep Research Pro Preview',
    value: 'deep-research-pro-preview',
    desc: 'Autonomous multi-step recursive web exploration and synthesis',
    category: 'Research & Agents',
  },
  {
    label: 'Gemini 2 Flash',
    value: 'gemini-2.0-flash',
    desc: 'Second generation balanced speed and intelligence',
    category: 'Gemini 2.0',
  },
  {
    label: 'Gemini 2 Flash Lite',
    value: 'gemini-2.0-flash-lite',
    desc: 'Ultra-lightweight second generation rapid inference',
    category: 'Gemini 2.0',
  },
  {
    label: 'Computer Use Preview',
    value: 'computer-use-preview',
    desc: 'Autonomous GUI navigation and OS interaction specialist',
    category: 'Research & Agents',
  },
  {
    label: 'Gemini 2.5 Flash',
    value: 'gemini-2.5-flash',
    desc: 'High-efficiency fast multimodal reasoning tier',
    category: 'Gemini 2.5',
  },
  {
    label: 'Nano Banana (Gemini 2.5 Flash Preview Image)',
    value: 'nano-banana',
    desc: 'Compact diffusion-integrated preview vision generation engine',
    category: 'Vision & Image',
  },
  {
    label: 'Gemini 2.5 Flash Lite',
    value: 'gemini-2.5-flash-lite',
    desc: 'Extremely lightweight, zero-latency daily workflow model',
    category: 'Gemini 2.5',
  },
  {
    label: 'Gemini 2.5 Flash TTS',
    value: 'gemini-2.5-flash-tts',
    desc: 'Real-time text-to-speech voice generation with low latency',
    category: 'Audio & Speech',
  },
  {
    label: 'Gemini 2.5 Pro',
    value: 'gemini-2.5-pro',
    desc: 'Complex code synthesis, math reasoning, and 2M token context',
    category: 'Gemini 2.5',
  },
  {
    label: 'Gemini 2.5 Pro TTS',
    value: 'gemini-2.5-pro-tts',
    desc: 'High-fidelity expressive studio narration speech engine',
    category: 'Audio & Speech',
  },
  {
    label: 'Gemini 3 Flash',
    value: 'gemini-3-flash',
    desc: 'Next-generation foundation multimodal flash model',
    category: 'Gemini 3.0',
  },
  {
    label: 'Nano Banana Pro (Gemini 3 Pro Image)',
    value: 'nano-banana-pro',
    desc: 'Pro-grade high-fidelity image rendering and multimodal vision',
    category: 'Vision & Image',
  },
  {
    label: 'Gemini 3.1 Pro',
    value: 'gemini-3.1-pro',
    desc: 'Advanced enterprise reasoning, architecture synthesis, and logic',
    category: 'Gemini 3.1',
  },
  {
    label: 'Nano Banana 2 (Gemini 3.1 Flash Image)',
    value: 'nano-banana-2',
    desc: 'Second-generation rapid image synthesis and visual reasoning',
    category: 'Vision & Image',
  },
  {
    label: 'Gemini 3.1 Flash Lite',
    value: 'gemini-3.1-flash-lite',
    desc: 'Efficient lightweight multimodal model with high rate limits',
    category: 'Gemini 3.1',
  },
  {
    label: 'Nano Banana 2 Lite (Gemini 3.1 Flash Lite Image)',
    value: 'nano-banana-2-lite',
    desc: 'Lightweight on-device image generation preview pipeline',
    category: 'Vision & Image',
  },
  {
    label: 'Gemini 3.1 Flash TTS',
    value: 'gemini-3.1-flash-tts',
    desc: 'Low-latency natural conversational audio streaming model',
    category: 'Audio & Speech',
  },
  {
    label: 'Gemini 3.5 Flash',
    value: 'gemini-3.5-flash',
    desc: 'Supercharged 3.5-generation balanced multimodal performance',
    category: 'Gemini 3.5',
  },
  {
    label: 'Gemini 3.5 Flash Lite',
    value: 'gemini-3.5-flash-lite',
    desc: 'Rapid token streaming and efficient tool call execution',
    category: 'Gemini 3.5',
  },
];
