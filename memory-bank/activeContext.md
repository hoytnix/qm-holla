# Active Context: Quarkmeme

## Current Focus & Status
- Resolved the 500 Internal Server Error in `/api/chat` and stabilized the autonomous subagent execution pipeline.
- Replaced outdated `@ai-sdk/google` integration with the official, installed `@google/genai` SDK (`GoogleGenAI`), eliminating the `AI_UnsupportedModelVersionError` (unsupported model version v4 error with AI SDK 5).
- Hardened `/api/chat` with structured error status parsing (HTTP 401 for invalid/missing keys, HTTP 429 for rate limits/quota exhaustion, and detailed human-readable error messages).
- Fortified `lib/ai/subagent-engine.ts` with comprehensive try/catch blocks, error logging, and seamless fallback to deterministic local synthesis with persisted audit notes in vault deliverables.

## Recent Changes
- **Chat Route (`app/api/chat/route.ts`)**:
  - Migrated Gemini provider to `@google/genai` with streaming `generateContentStream`, `systemInstruction`, `temperature`, and `maxOutputTokens`.
  - Added robust nested JSON error extraction in `parseErrorMessage` to cleanly surface Google RPC / API errors without 500 crashes.
  - Retained OpenRouter and OpenAI-compatible provider integrations via `@ai-sdk/openai`.
- **Subagent Execution Engine (`lib/ai/subagent-engine.ts`)**:
  - Wrapped LLM streaming requests in dedicated try/catch with fallback reason tracking.
  - Forwarded `temperature` and `maxTokens` from `config`.
  - Persisted fallback metadata into generated deliverables to ensure transparent auditing without queue halting.
- **Production Build Validation**:
  - Clean TypeScript typecheck (`npx tsc --noEmit`).
  - Next.js production build (`pnpm build`) compiled cleanly.

## Invariants Maintained
1. Local-First SQLite storage guarantee (zero cloud database bills, all state stored client-side in IndexedDB).
2. Ephemeral model routing invariant (keys passed dynamically per request without server storage).
3. Zero unbundled emojis law across all UI elements (all vector Lucide SVG icons).
4. 375px+ responsive mobile touch targets and `pb-safe` drawer layouts.
