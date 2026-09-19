# Active Context: Quarkmeme

## Current Focus & Status
- Implemented the Custom Universe & LLM Configuration vault, enabling users to enter an arbitrary TV show or movie to dynamically cast and re-skin the 7 core agent roles using structured LLM output:
  1. LLM API Key Configuration Vault in Settings with interactive validation and connection status badges.
  2. Conditional gating on the "Custom" theme option (locked until LLM API key configured with guidance modal/alert).
  3. Structured AI Character Mapper API endpoint (`/api/themes/custom`) casting franchise characters into the 7 division leads with thematic descriptions and styling.

## Recent Changes
- **Theme Registry (`lib/settings/themes.ts`)**:
  - Added `'custom'` to `AppTheme` union and configured default custom fallback entry in `THEMES`.
- **Settings Context (`lib/settings/settings-context.tsx`)**:
  - Added `llmApiKey: string`, `customUniverseQuery: string`, and `isLlmConfigured: boolean`.
  - Added setters `setLlmApiKey(key)`, `setCustomUniverseQuery(query)`, and `setCustomThemeConfig(config)`.
  - Dual-layer persistence across `localStorage` (`quark_custom_universe_query`, `quark_custom_theme_config`) and OPFS SQLite (`custom_universe_query`, `custom_theme_config`).
  - Dynamic `themeConfig` resolution when `currentTheme === 'custom'`.
- **Global Theme Icons**:
  - Updated `THEME_ICONS` records in `components/layout/Navbar.tsx` and `components/dashboard/CaptainsLog.tsx` with `custom: Sparkles`.
- **Structured AI Character Mapper API (`app/api/themes/custom/route.ts`)**:
  - Implemented POST endpoint accepting `{ title, apiKey, provider, model, baseUrl }` or HTTP headers (`x-llm-api-key`, etc.).
  - Returns structured JSON validated via Zod schema mapping franchise characters to the 7 roles (`captain-core`, `scholar-robin`, `shipwright-franky`, `navigator-nami`, `doctor-chopper`, `chef-sanji`, `sniper-usopp`).
  - Supports Google Gemini (via `@google/genai` `responseSchema`) and OpenRouter/OpenAI-compatible (via Vercel AI SDK `generateObject`).
- **Theme Selection Modal (`components/settings/ThemeSelectionModal.tsx`)**:
  - Added conditional gating on the "Custom" card: if `!isLlmConfigured`, clicking opens a prompt modal explaining that an LLM key is required and provides a button to configure in Settings.
  - When "Custom" is selected and configured, displays an inline input to type any movie/TV show and click "Cast Universe", which calls `/api/themes/custom`, updates all 7 agent records in OPFS SQLite, and sets the active theme.
- **Settings Page (`app/settings/page.tsx`)**:
  - Updated Section 1 (Theme Selector) with Custom theme card, lock indicator, and inline movie/TV casting UI.
  - Added LLM Configuration status badge indicating whether LLM is active and ready for Custom Themes.
  - Cleaned up duplicate inputs; hooked API key input directly to `setLlmApiKey`.
- **Verification & Invariant Validation**:
  - Verified with `npx tsc --noEmit` (0 errors).
  - Production build verified via `pnpm build` (exit code 0, 10 static/dynamic routes generated).

## Invariants Maintained
1. Local-First SQLite storage guarantee (zero cloud database bills, settings and themes persisted in browser OPFS SQLite).
2. Zero unbundled emojis law across all UI components (all Lucide SVG vector icons).
3. 375px+ responsive mobile touch targets and clean layout navigation.

