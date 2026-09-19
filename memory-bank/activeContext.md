# Active Context: Quarkmeme

## Current Focus & Status
- Completed Quarkmeme Autonomous OS: Master Implementation Plan (Phases 1 through 5).
- Verified production build (`pnpm build`) with zero compilation or lint errors across App Router routes.
- Enforced zero unbundled Unicode emojis across all UI components and replaced with deterministic `lucide-react` vector icons with explicit dimensions.

## Recent Changes
- **BYOK & Model Provider Settings Engine (Local-First OPFS SQLite)**:
  - Added `settings` table schema in [`schema.sql`](file:///home/oloty/Dev/qm-holla/lib/db/schema.sql) and [`db.worker.ts`](file:///home/oloty/Dev/qm-holla/workers/db.worker.ts) for local key-value configuration storage.
  - Implemented `GET_SETTING`, `SET_SETTING`, and `GET_ALL_SETTINGS` worker handlers in [`db.worker.ts`](file:///home/oloty/Dev/qm-holla/workers/db.worker.ts) and accessor methods in [`opfs-adapter.ts`](file:///home/oloty/Dev/qm-holla/lib/db/opfs-adapter.ts).
  - Created [`settings-context.tsx`](file:///home/oloty/Dev/qm-holla/lib/settings/settings-context.tsx) providing `useSettings()` with fast local cache hydration, OPFS SQLite persistence, transmission latency pinging, vault JSON export, and local storage flushing.
  - Refactored [`app/api/chat/route.ts`](file:///home/oloty/Dev/qm-holla/app/api/chat/route.ts) with Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/google`) to support runtime provider selection (OpenRouter, Google Gemini, OpenAI/Self-Hosted) from ephemeral client request headers (`x-llm-provider`, `x-llm-api-key`, `x-llm-base-url`, `x-llm-model`).
  - Built [`app/settings/page.tsx`](file:///home/oloty/Dev/qm-holla/app/settings/page.tsx) ("Ship's Engine & Settings") with provider selector cards, model preset dropdowns, hide/reveal password input with clipboard pasting, test ping latency verification, and local sovereign vault export.
  - Integrated Settings navigation link with amber unconfigured pulse badge in [`Navbar.tsx`](file:///home/oloty/Dev/qm-holla/components/layout/Navbar.tsx).
  - Added inline unconfigured warning cards with direct quick links to `/settings` in [`app/chat/page.tsx`](file:///home/oloty/Dev/qm-holla/app/chat/page.tsx) and [`VoiceHelmSheet.tsx`](file:///home/oloty/Dev/qm-holla/components/voice/VoiceHelmSheet.tsx).
- **Phase 1: Dynamic Radial Canvas & Mobile Project Workspaces**:
  - Implemented mobile-first gesture engine in [`RadialGraph.tsx`](file:///home/oloty/Dev/qm-holla/components/canvas/RadialGraph.tsx) supporting single-finger pan and multi-touch pinch-to-zoom (0.5x to 2.5x) with floating touch controls.
  - Implemented Level 0 to Level 3 radial hierarchy math: Luffy at (0, 0), 6 Crew Specialists at radius 180px, Project diamond nodes at radius 320px, and unfurled satellite checkboxes and teal circular 'K' badges at radius 420px+.
  - Created [`ProjectWorkspaceDrawer.tsx`](file:///home/oloty/Dev/qm-holla/components/canvas/ProjectWorkspaceDrawer.tsx) with branch expand/collapse action buttons and persistent horizontal scroll legend.
- **Phase 2: In-Database Local Markdown Vault & Storage (OPFS SQLite)**:
  - Updated [`schema.sql`](file:///home/oloty/Dev/qm-holla/lib/db/schema.sql) with `projects`, `documents` (with JSON metadata), `tasks`, and `documents_fts` with synchronization triggers.
  - Updated [`db.worker.ts`](file:///home/oloty/Dev/qm-holla/workers/db.worker.ts) and [`opfs-adapter.ts`](file:///home/oloty/Dev/qm-holla/lib/db/opfs-adapter.ts) with handlers for `SAVE_DOCUMENT`, `GET_DOCUMENTS_BY_PROJECT`, `SEARCH_DOCUMENTS`, and `TOGGLE_TASK_STATUS`.
  - Created [`MarkdownDrawer.tsx`](file:///home/oloty/Dev/qm-holla/components/vault/MarkdownDrawer.tsx) with debounced 500ms auto-save directly to OPFS SQLite and quick task creation.
- **Phase 3: The 6:00 AM Morning Planning Ritual & Daily Brief**:
  - Implemented [`MorningPlanningModal.tsx`](file:///home/oloty/Dev/qm-holla/components/planning/MorningPlanningModal.tsx) querying pending commitments and 24-hour wins with markdown export.
  - Implemented [`CaptainsLog.tsx`](file:///home/oloty/Dev/qm-holla/components/dashboard/CaptainsLog.tsx) hero card on [`app/page.tsx`](file:///home/oloty/Dev/qm-holla/app/page.tsx).
  - Added high-visibility crimson button with pulse indicator in [`Navbar.tsx`](file:///home/oloty/Dev/qm-holla/components/layout/Navbar.tsx).
- **Phase 4: Shared Multi-Agent Context & Transparent Progress Ledger**:
  - Updated [`orchestrator.ts`](file:///home/oloty/Dev/qm-holla/lib/ai/orchestrator.ts) with inter-agent shared memory bus and separation of duties policy.
  - Refactored [`app/crew/page.tsx`](file:///home/oloty/Dev/qm-holla/app/crew/page.tsx) with reporting hierarchy tags, open assignments badges, and role instructions inspection modal.
  - Created [`TeamActivityStream.tsx`](file:///home/oloty/Dev/qm-holla/components/crew/TeamActivityStream.tsx) displaying transparent progress with status chips.
- **Phase 5: Offline Voice Helm ("Speak with Luffy")**:
  - Built zero-cost offline STT & energetic Luffy persona TTS engine in [`speech-engine.ts`](file:///home/oloty/Dev/qm-holla/lib/voice/speech-engine.ts).
  - Created [`VoiceHelmSheet.tsx`](file:///home/oloty/Dev/qm-holla/components/voice/VoiceHelmSheet.tsx) with animated waveform, 90-second circular countdown ring, and audio controls.
- **Netlify OPFS SQLite Canvas Hang Fix & Immediate Render**:
  - Created [`public/_headers`](file:///home/oloty/Dev/qm-holla/public/_headers) and [`netlify.toml`](file:///home/oloty/Dev/qm-holla/netlify.toml) with COOP/COEP isolation and SQLite/WASM content-type headers.
  - Added 2500ms safety timeout, `crossOriginIsolated` check, worker error propagation, and memory stubbing in [`opfs-adapter.ts`](file:///home/oloty/Dev/qm-holla/lib/db/opfs-adapter.ts).
  - Handled fatal worker and promise rejection errors with explicit `INIT_ERROR` and `INIT_SUCCESS` messages in [`db.worker.ts`](file:///home/oloty/Dev/qm-holla/workers/db.worker.ts).
  - Made [`RadialGraph.tsx`](file:///home/oloty/Dev/qm-holla/components/canvas/RadialGraph.tsx) and [`app/page.tsx`](file:///home/oloty/Dev/qm-holla/app/page.tsx) non-blocking by immediately rendering the SVG canvas with default crew data and background hydration with an `OPFS Hydrating...` / `OPFS Active` status badge.
- **SQLite OPFS Proxy Query Parameter Error Resolution**:
  - Replaced bundled `@sqlite.org/sqlite-wasm` module import in [`workers/db.worker.ts`](file:///home/oloty/Dev/qm-holla/workers/db.worker.ts) with static `importScripts('/sqlite/sqlite3.js')`. This completely bypasses Webpack chunking and ensures `?vfs=opfs` query parameters are preserved without bundler stripping.
  - Deployed official SQLite WASM 3.53.4 release assets (`sqlite3.js`, `sqlite3.wasm`, `sqlite3-opfs-async-proxy.js`) to [`public/sqlite/`](file:///home/oloty/Dev/qm-holla/public/sqlite/).
  - Configured isolation and CORS headers (`Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`, `Access-Control-Allow-Origin: *`) for `/sqlite/*` in both [`public/_headers`](file:///home/oloty/Dev/qm-holla/public/_headers) and [`netlify.toml`](file:///home/oloty/Dev/qm-holla/netlify.toml).
  - Maintained full SQLite schema, auto-migrations, fallback in-memory database, and Straw Hat crew seeding routines.
  - Verified with `npx tsc --noEmit` and production build `pnpm build` (9/9 static routes generated cleanly).
- **SQLite WASM 404 Compile Error & Client Init Memoization**:
  - Configured explicit `locateFile: (file: string) => /sqlite/${file}` inside `sqlite3InitModule` in [`workers/db.worker.ts`](file:///home/oloty/Dev/qm-holla/workers/db.worker.ts) to force Emscripten to fetch `/sqlite/sqlite3.wasm` from static public assets rather than resolving relative to the worker script origin.
  - Hardened `OpfsDatabase.init()` in [`lib/db/opfs-adapter.ts`](file:///home/oloty/Dev/qm-holla/lib/db/opfs-adapter.ts): memoized `initPromise`, added `this.isReady` short-circuit guard, 3000ms timeout with fallback activation, and cleanly handled `INIT_SUCCESS` / `INIT_ERROR` message routing to prevent infinite initialization re-entry.
  - Configured explicit `Content-Type: application/wasm`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: require-corp`, and `Access-Control-Allow-Origin: *` headers for `/sqlite/*.wasm` in both [`public/_headers`](file:///home/oloty/Dev/qm-holla/public/_headers) and [`netlify.toml`](file:///home/oloty/Dev/qm-holla/netlify.toml).
  - Verified clean TypeScript checks (`npx tsc --noEmit`) and production build compilation (`pnpm build`).
- **Decouple SQLite Worker from Next.js Webpack Chunking**:
  - Created standalone static worker [`public/sqlite/db-worker.js`](file:///home/oloty/Dev/qm-holla/public/sqlite/db-worker.js) running pure JavaScript off the public directory without Webpack compilation or hashing.
  - Replaced Webpack worker dynamic instantiation in [`lib/db/opfs-adapter.ts`](file:///home/oloty/Dev/qm-holla/lib/db/opfs-adapter.ts) with direct static `new Worker('/sqlite/db-worker.js')`, preventing Next.js bundler rewriting of worker dependencies.
  - Configured `Cross-Origin-Resource-Policy: cross-origin` across `/*` and `/sqlite/*` in both [`public/_headers`](file:///home/oloty/Dev/qm-holla/public/_headers) and [`netlify.toml`](file:///home/oloty/Dev/qm-holla/netlify.toml) so nested worker threads and OPFS async proxy worker loading are never blocked under COEP.
  - Verified clean TypeScript validation (`npx tsc --noEmit`) and production build compilation (`pnpm build`).
- **Restore Official SQLite OPFS Proxy & Root Netlify Headers**:
  - Restored clean, official uncorrupted `sqlite3-opfs-async-proxy.js` directly from `@sqlite.org/sqlite-wasm` into [`public/sqlite/sqlite3-opfs-async-proxy.js`](file:///home/oloty/Dev/qm-holla/public/sqlite/sqlite3-opfs-async-proxy.js).
  - Placed `_headers` at the repository root [`/_headers`](file:///home/oloty/Dev/qm-holla/_headers) alongside fallback [`public/_headers`](file:///home/oloty/Dev/qm-holla/public/_headers) to guarantee COOP/COEP isolation and cross-origin resource policy on Netlify deployments.
  - Enhanced [`public/sqlite/db-worker.js`](file:///home/oloty/Dev/qm-holla/public/sqlite/db-worker.js) initialization with isolation metrics logging (`crossOriginIsolated`, `SharedArrayBuffer`, `navigator.storage`) and `sqlite3.oo1.OpfsDb` detection.
  - Verified production build (`pnpm build`) compiles 9/9 static routes cleanly.

## Invariants Maintained
1. Local-First OPFS SQLite storage guarantee (zero external database dependencies, credentials stored in client OPFS).
2. Ephemeral model routing invariant (keys passed dynamically per request without server storage).
3. Zero unbundled emojis law across all UI elements (all vector Lucide SVG icons).
4. 375px+ responsive mobile touch targets and `pb-safe` drawer layouts.
