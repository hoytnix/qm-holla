# Active Context: Quarkmeme

## Current Focus & Status
- Fixed the critical theme selection bug where selecting a universe did not re-skin agents, crew database, or terminology across the app.
- Root causes: premature mounting of hardcoded One Piece defaults on mount, and `setTheme()` only updating static UI flags without writing themed agents to the database.

## Recent Changes
- **Theme Mapper (`lib/crew/theme-mapper.ts`)** [NEW]:
  - Created comprehensive dynamic theme-to-crew mapping utility covering all 7 built-in universes.
  - Maps the 7 abstract agent role slots (`captain-core`, `scholar-robin`, `shipwright-franky`, `navigator-nami`, `doctor-chopper`, `chef-sanji`, `sniper-usopp`) to universe-specific characters with themed names, system prompts, routing descriptions, and avatars.
  - Provides `getThemedAgents(theme)` for full AgentRecord[] generation and `getCharacterForSlot()` for individual lookups.
- **Settings Context (`lib/settings/settings-context.tsx`)**:
  - Rewired `setTheme()` to write themed agents to the database via `db.saveAgent()` using `getThemedAgents()`, then bump a reactive `themeVersion` counter.
  - Added `themeVersion: number` to `SettingsContextValue` so all consuming pages can reactively detect theme changes and reload agents from the database.
- **Canvas Page (`app/page.tsx`)**:
  - Removed premature `DEFAULT_CREW` / `DEFAULT_PROJECTS` initialization from `useState()`. State now starts empty and loads from DB.
  - Added `themeVersion`-reactive `useEffect` that reloads all fleet data from the database whenever the theme changes.
  - `selectedAgent` now refreshes its data on reload instead of getting stuck with stale character info.
- **RadialGraph (`components/canvas/RadialGraph.tsx`)**:
  - Replaced hardcoded `DEFAULT_CREW` fallback with theme-aware fallback using `getThemedAgents(currentTheme)`.
  - Canvas now immediately shows the correct universe characters even during DB initialization.
- **Crew Page (`app/crew/page.tsx`)**:
  - Added `themeVersion`-reactive `useEffect` to reload crew roster when theme changes.
- **Chat Page (`app/chat/page.tsx`)**:
  - Added `themeVersion`-reactive `useEffect` to reload agent list when theme changes.

## Invariants Maintained
1. Local-First SQLite storage guarantee (zero cloud database bills, themed agents persisted in browser OPFS SQLite).
2. Deterministic Canvas & Fallback Seed Law (canvas never renders blank; uses theme-aware fallback).
3. Zero unbundled emojis law across all UI components (all Lucide SVG vector icons).
4. 375px+ responsive mobile touch targets and clean layout navigation.
