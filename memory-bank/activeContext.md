# Active Context: Quarkmeme

## Current Focus & Status
- Eliminated React infinite re-render / `postMessage` waterfall loops by guarding background hydration across components (`RadialGraph`, `CanvasPage`, `SettingsProvider`).
- Cache-busted the SQLite worker by renaming from `db-worker.js` to `/sqlite/sqlite-engine.js` with timestamp busting (`?t=${Date.now()}`) and purged old worker files.
- Verified production build (`pnpm build`) with zero compilation or lint errors across 9 static routes.
- Fully operational local IndexedDB persistence via `sql.js` with auto-debounced database state export.

## Recent Changes
- **Break React Re-render Loop & Force Clean SQLite Worker**:
  - In [`components/canvas/RadialGraph.tsx`](file:///home/oloty/Dev/qm-holla/components/canvas/RadialGraph.tsx), guarded the background SQLite hydration `useEffect` with `hasInitialized = useRef(false)`, ensuring it runs strictly once per component lifecycle and prevents state updates from triggering repeated `postMessage` loops.
  - In [`app/page.tsx`](file:///home/oloty/Dev/qm-holla/app/page.tsx), added `hasLoadedRef = useRef(false)` guard to `loadFleetData()` with strictly empty dependency array `[]`.
  - In [`lib/settings/settings-context.tsx`](file:///home/oloty/Dev/qm-holla/lib/settings/settings-context.tsx), guarded `SettingsProvider` hydration with `hasLoadedRef = useRef(false)` to prevent redundant DB reads.
  - Renamed and created [`public/sqlite/sqlite-engine.js`](file:///home/oloty/Dev/qm-holla/public/sqlite/sqlite-engine.js) with fresh IndexedDB store (`quarkmeme_vault_v1` / `db_store` / `database.sqlite`), debounced binary save (200ms), and full Straw Hat crew / project / task / document bootstrap migrations.
  - Deleted legacy [`public/sqlite/db-worker.js`](file:///home/oloty/Dev/qm-holla/public/sqlite/db-worker.js).
  - Updated [`lib/db/opfs-adapter.ts`](file:///home/oloty/Dev/qm-holla/lib/db/opfs-adapter.ts) to instantiate `new Worker('/sqlite/sqlite-engine.js?t=' + Date.now())` to permanently purge service worker and browser file caching.
  - Validated type safety via `npx tsc --noEmit` and production build with `pnpm build`.

## Invariants Maintained
1. Local-First SQLite storage guarantee (zero cloud database bills, all state stored client-side in IndexedDB).
2. Ephemeral model routing invariant (keys passed dynamically per request without server storage).
3. Zero unbundled emojis law across all UI elements (all vector Lucide SVG icons).
4. 375px+ responsive mobile touch targets and `pb-safe` drawer layouts.
