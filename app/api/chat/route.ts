import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * DEPRECATED: Server-side AI chat API route has been completely eliminated.
 * Quarkmeme operates 100% client-side in the browser via lib/ai/client-runner.ts.
 * No user API keys or prompt payloads ever touch the backend server.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: 'Gone: Server-side AI processing has been deprecated. All LLM calls run 100% client-side in your browser via lib/ai/client-runner.ts.',
    },
    { status: 410 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      error: 'Gone: Server-side AI processing has been deprecated.',
    },
    { status: 410 }
  );
}
