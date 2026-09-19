# Active Context: Quarkmeme

## Current Focus & Status
- Eliminated React infinite re-render / `postMessage` waterfall loops by guarding background hydration across components (`RadialGraph`, `CanvasPage`, `SettingsProvider`).
- Cache-busted the SQLite worker by renaming from `db-worker.js` to `/sqlite/sqlite-engine.js` with timestamp busting (`?t=${Date.now()}`) and purged old worker files.
- Verified production build (`pnpm build`) with zero compilation or lint errors across 9 static routes.
- Fully operational local IndexedDB persistence via `sql.js` with auto-debounced database state export.

## Recent Changes
- **Requests Per Minute (RPM) Rate Limit Setting**:
  - Updated [`lib/settings/settings-context.tsx`](file:///home/oloty/Dev/qm-holla/lib/settings/settings-context.tsx) to add `requestsPerMinute: number` to `LLMConfig` with default `4`.
  - Added hydration and persistence support in `SettingsProvider` for key `llm_rpm` in local storage and SQLite.
  - Updated [`app/settings/page.tsx`](file:///home/oloty/Dev/qm-holla/app/settings/page.tsx) to add dual controls: a synchronized number input and slider for adjusting Requests Per Minute with informative rate-pacing guidance and the Lucide `Gauge` icon.
- **Mobile Navigation Menu Toggle**:
  - Updated [`components/layout/Navbar.tsx`](file:///home/oloty/Dev/qm-holla/components/layout/Navbar.tsx) with a visible mobile hamburger menu button (`Menu` / `X` icons).
  - Wired toggle state to open a slide-out navigation drawer with a darkened backdrop overlay and body scroll-lock.
  - Enabled full mobile access to navigation routes including `/settings`, `/vault`, `/crew`, `/chat`, and `/`.
  - Auto-closes mobile drawer on route navigation and backdrop clicks.
- **Production Build Validation**:
  - Validated clean TypeScript compilation via `npx tsc --noEmit`.
  - Validated production build (`pnpm build`) with zero errors across all 9 static routes.

## Invariants Maintained
1. Local-First SQLite storage guarantee (zero cloud database bills, all state stored client-side in IndexedDB).
2. Ephemeral model routing invariant (keys passed dynamically per request without server storage).
3. Zero unbundled emojis law across all UI elements (all vector Lucide SVG icons).
4. 375px+ responsive mobile touch targets and `pb-safe` drawer layouts.
