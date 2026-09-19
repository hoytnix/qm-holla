# Active Context: Quarkmeme

## Current Focus & Status
- Implemented global system-level prompt setting in application settings with browser-secured OPFS SQLite persistence (`llm_system_prompt`), fast localStorage cache, and default sovereign operating rules.
- Added responsive textarea control in `app/settings/page.tsx` with live character counter and instant "Reset Default" action.
- Wired orchestrator and autonomous subagent execution engines (`lib/ai/orchestrator.ts`, `lib/ai/subagent-engine.ts`, `app/chat/page.tsx`) to inject the global system prompt across all LLM delegations, task completions, and chat interactions.

## Recent Changes
- **Settings Context & State Layer (`lib/settings/settings-context.tsx`)**:
  - Added `systemPrompt` to `LLMConfig`, `DEFAULT_GLOBAL_SYSTEM_PROMPT` constant, and `DEFAULT_CONFIG`.
  - Added SQLite load/save hydration for `llm_system_prompt` and cache synchronization in `quark_llm_config_cache`.
- **Application Settings UI (`app/settings/page.tsx`)**:
  - Integrated "Global System-Level Prompt & Directives" textarea section with Lucide `Terminal` and `RotateCcw` vector icons.
  - Provided direct editing, live character counting, and 1-click reset to default sovereign prompt.
- **Orchestration & Autonomous Subagent Engine (`lib/ai/orchestrator.ts`, `lib/ai/subagent-engine.ts`, `app/chat/page.tsx`)**:
  - Enhanced `assembleContext` to accept `customGlobalPrompt` or auto-resolve from SQLite `llm_system_prompt`.
  - Composed global system directives as top-level framing in `systemInstruction` ahead of domain agent prompts, local FTS5 BM25 retrieval blocks, and separation-of-duties guidelines.
  - Updated `subagentEngine.executeTask` to pass `config.systemPrompt` into context assembly for all background autonomous tasks.
  - Updated `app/chat/page.tsx` to pass `config.systemPrompt` into `assembleContext` for all conversational turns.
- **Production Build Validation**:
  - Clean TypeScript verification (`npx tsc --noEmit` - 0 errors).
  - Next.js production build (`pnpm build`) compiled cleanly (exit code 0, 9 static routes generated).

## Invariants Maintained
1. Local-First SQLite storage guarantee (zero cloud database bills, all state stored client-side in IndexedDB/OPFS).
2. Zero unbundled emojis law across all UI elements (all vector Lucide SVG icons).
3. 375px+ responsive mobile touch targets and `pb-safe` drawer layouts.
