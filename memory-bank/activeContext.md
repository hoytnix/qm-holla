# Active Context: Quarkmeme

## Current Focus & Status
- Migrated Quarkmeme SQLite persistence to robust, universal IndexedDB-backed SQLite WASM (`sql.js` + `idb-keyval`).
- Completely removed strict COOP (`same-origin`) and COEP (`require-corp`) header requirements, SharedArrayBuffer dependencies, and OPFS proxy workers.
- Verified production build (`pnpm build`) with zero compilation or lint errors across 9 static routes.
- Maintained Straw Hat multi-agent hierarchy, Level 0-3 radial graph canvas, and sovereign BYOK local settings.

## Recent Changes
- **Migrate to Robust IndexedDB-Backed SQLite WASM (`sql.js`)**:
  - Installed `sql.js`, `idb-keyval`, and `@types/sql.js`.
  - Copied official `sql-wasm.wasm` and `sql-wasm.js` into `/public`.
  - Replaced [`public/sqlite/db-worker.js`](file:///home/oloty/Dev/qm-holla/public/sqlite/db-worker.js) with a standalone, header-free IndexedDB-backed SQLite worker:
    - Restores binary state from IndexedDB (`quarkmeme_db_store` / `files` / `quarkmeme.db`) via native IndexedDB transactions.
    - Debounces state exports (250ms) to persist SQLite binary snapshots to IndexedDB.
    - Runs full bootstrap schema migrations (`settings`, `agents`, `projects`, `kbs`, `tasks`, `documents`, `messages`) and seeds default crew and LLM configuration if empty.
    - Supports `exec`, `run`, `EXECUTE_SQL`, `GET_SETTING`, `SET_SETTING`, `GET_ALL_SETTINGS`, `GET_AGENTS`, `SAVE_DOCUMENT`, `GET_DOCUMENTS_BY_PROJECT`, `SEARCH_DOCUMENTS`, and `TOGGLE_TASK_STATUS`.
  - Updated [`lib/db/opfs-adapter.ts`](file:///home/oloty/Dev/qm-holla/lib/db/opfs-adapter.ts):
    - Points cleanly to `/sqlite/db-worker.js`.
    - Reduced initialization timeout to 2000ms.
    - Removed `window.crossOriginIsolated` checks, allowing universal execution across all browsers, iframes, and deployment environments without COOP/COEP isolation.
  - Replaced legacy COOP/COEP isolation headers in [`_headers`](file:///home/oloty/Dev/qm-holla/_headers), [`public/_headers`](file:///home/oloty/Dev/qm-holla/public/_headers), [`netlify.toml`](file:///home/oloty/Dev/qm-holla/netlify.toml), and [`next.config.ts`](file:///home/oloty/Dev/qm-holla/next.config.ts) with permissive `Access-Control-Allow-Origin: *` and `Content-Type: application/wasm` for `/sql-wasm.wasm`.
  - Validated type safety via `npx tsc --noEmit` and verified production build with `pnpm build`.

## Invariants Maintained
1. Local-First SQLite storage guarantee (zero cloud database bills, all state stored client-side in IndexedDB).
2. Ephemeral model routing invariant (keys passed dynamically per request without server storage).
3. Zero unbundled emojis law across all UI elements (all vector Lucide SVG icons).
4. 375px+ responsive mobile touch targets and `pb-safe` drawer layouts.
