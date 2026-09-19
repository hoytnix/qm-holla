# Active Context: Quarkmeme

## Current Focus & Status
- Updated agent instruction files (`GEMINI.md`, `AGENTS.md`, `CLAUDE.md`) to establish strict tool usage efficiency rules limiting `grep`, `find`, and shell searches to at most 30 lines per request.
- Maintained global system-level prompt setting in application settings with browser-secured OPFS SQLite persistence (`llm_system_prompt`), fast localStorage cache, and default sovereign operating rules.

## Recent Changes
- **Agent Instruction Files (`GEMINI.md`, `AGENTS.md`, `CLAUDE.md`)**:
  - Enforced a strict rule across all agent instructions requiring terminal search tools (`grep`, `find`) to limit output to at most 30 lines per request (e.g., piping to `head -n 30`).
  - Added strict failure condition in `GEMINI.md` barring unbounded or overly permissive searches to protect context limits and minimize token costs.
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
