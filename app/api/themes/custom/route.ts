import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export interface CustomAgentMapping {
  id:
    | 'captain-core'
    | 'scholar-robin'
    | 'shipwright-franky'
    | 'navigator-nami'
    | 'doctor-chopper'
    | 'chef-sanji'
    | 'sniper-usopp';
  role:
    | 'Captain'
    | 'Scholar'
    | 'Shipwright'
    | 'Navigator'
    | 'Doctor'
    | 'Cook'
    | 'Sniper';
  characterName: string;
  thematicTitle: string;
  systemPrompt: string;
  routingDescription: string;
  avatarIcon?: string;
}

export interface CustomUniverseResponse {
  universeName: string;
  defaultGroup: string;
  tagline: string;
  leaderTitle: string;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  badgeBg: string;
  badgeText: string;
  description: string;
  characters: CustomAgentMapping[];
}

/**
 * DEPRECATED: Server-side AI theme casting route has been completely eliminated.
 * Quarkmeme operates 100% client-side in the browser via generateCustomThemeDirect in lib/ai/client-runner.ts.
 * No user API keys or prompt payloads ever touch the backend server.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Gone: Server-side custom theme generation has been deprecated. All custom universe casting runs 100% client-side in your browser via lib/ai/client-runner.ts.',
    },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      error: 'Gone: Server-side custom theme generation has been deprecated.',
    },
    { status: 410 }
  );
}
