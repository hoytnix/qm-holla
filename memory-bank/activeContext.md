# Active Context: Quarkmeme

## Current Focus & Status
- Restored smooth mobile viewport scrolling with natural vertical flow past the Captain's Log down to bottom specifications and controls.
- Isolated canvas drag and touch gestures with `touch-none` and responsive viewport scaling (`h-[65vh] sm:h-[75vh] min-h-[420px]`).
- Added floating exploration & scroll guidance handle: `"Drag to explore universe · Scroll down for logs"`.
- Verified production build (`pnpm build`) with zero compilation or lint errors across 9 static routes.

## Recent Changes
- **Mobile Viewport Scrolling & Touch Isolation**:
  - In [`app/globals.css`](file:///home/oloty/Dev/qm-holla/app/globals.css), removed `overflow-hidden` from `body` and replaced with `min-h-screen overflow-x-hidden overflow-y-auto` with smooth scrolling.
  - In [`app/page.tsx`](file:///home/oloty/Dev/qm-holla/app/page.tsx), refactored the main layout to flow vertically with `pb-16`, wrapping the canvas in a responsive container (`h-[65vh] sm:h-[75vh] min-h-[420px] sm:min-h-[580px]`) that allows natural page scrolling past Captain's Log to secondary cards and specifications.
  - In [`components/canvas/RadialGraph.tsx`](file:///home/oloty/Dev/qm-holla/components/canvas/RadialGraph.tsx):
    - Added `touch-none` and `overflow-hidden` to the inner `<svg>` and canvas container to isolate drag/pan/pinch gestures strictly to the radial map without jittering the parent page.
    - Added a floating glass guidance handle: `"Drag to explore universe · Scroll down for logs"`.
    - Maintained accessible touch target dimensions (`min-h-[44px] min-w-[44px]`) across specialist nodes and project workspace diamond nodes.
  - Validated type safety via `npx tsc --noEmit` and production build with `pnpm build`.

## Invariants Maintained
1. Local-First SQLite storage guarantee (zero cloud database bills, all state stored client-side in IndexedDB).
2. Ephemeral model routing invariant (keys passed dynamically per request without server storage).
3. Zero unbundled emojis law across all UI elements (all vector Lucide SVG icons).
4. 375px+ responsive mobile touch targets and `pb-safe` drawer layouts.
