# Active Context: Quarkmeme

## Current Focus & Status
- Fixed **Startup Onboarding Sequence for Incognito & Clean Sessions**:
  - **`isLoading` State Lock Resolution (`lib/settings/settings-context.tsx`)**:
    - Removed `if (mounted)` guard around `setIsLoading(false)` in `load()`'s `finally` block. In React 19 development mode or strict hydration cycles, the effect cleanup unmount flipped `mounted = false` while `hasLoadedRef.current = true` prevented subsequent re-runs, leaving `isLoading` permanently stuck on `true` and blocking `LlmSetupModal` (`!isLoading && !isLlmVerified`).
  - **Theme Selection Gate Fix (`lib/settings/settings-context.tsx`)**:
    - Corrected `hasSelectedTheme` default state to `false` (from `true`) so fresh or incognito sessions without saved SQLite/localStorage theme selections reliably trigger `ThemeSelectionModal` after company onboarding.
  - **Context Modal Propagation (`lib/settings/settings-context.tsx`, `components/settings/ThemeSelectionModal.tsx`)**:
    - Added `isThemeModalOpen: boolean` and `closeThemeModal: () => void` to `SettingsContextValue` and exported them from `SettingsContext.Provider`.
    - Updated `ThemeSelectionModal` to destructure and consume `isThemeModalOpen` in `isOpen: (forceOpen || isThemeModalOpen || !hasSelectedTheme) && !isGated`.
    - Ensured `closeThemeModal()` is executed whenever `ThemeSelectionModal` is dismissed or confirmed.
- Implemented **100% Client-Side AI Execution Architecture (Direct Browser Execution)**:
  - **Direct Browser Client Runner (`lib/ai/client-runner.ts`)**:
    - Created `generateContentClientDirect()` executing direct browser-to-Gemini REST generation via `fetch()` to `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`.
    - Added full parameter support: `apiKey`, `model`, `prompt`, `messages`, `systemInstruction`, `tools`, `responseSchema`, `temperature`, and `maxTokens`.
    - Implemented response parsing directly in the browser: text chunks, candidate function call interception, grounding metadata extraction, and executable code / results parsing.
    - Built multi-turn client-side function calling loop: executes `fetch_url_as_markdown` via direct browser fetch to `https://md.dhr.wtf/?url=...` and feeds `functionResponse` directly back to Gemini.
    - Implemented `testGeminiConnection(apiKey, model, baseUrl)` running a minimal `"ping"` payload directly in the browser to verify key validity without server proxying.
    - Implemented `generateCustomThemeDirect(apiKey, showTitle, model, baseUrl)` for structured JSON character casting directly in the browser.
    - Added `getClientGeminiApiKey()` resolving API keys from `localStorage` (`gemini_api_key`, `llmApiKey`, `quark_llm_config_cache`) or client env vars.
  - **Subagent Engine Refactor (`lib/ai/subagent-engine.ts`)**:
    - Replaced all calls to `fetch('/api/chat')` with `generateContentClientDirect()`.
    - Reads API key directly from configuration or browser storage via `getClientGeminiApiKey()`.
    - Preserved AbortSignal cancellation support for halting active tasks.
  - **Orchestrator Refactor (`lib/ai/orchestrator.ts`)**:
    - Added browser-executable `runOrchestratedAgentClientDirect()` consuming `client-runner.ts` and local API keys rather than server routes.
  - **Chat Page Refactor (`app/chat/page.tsx`)**:
    - Replaced `fetch('/api/chat')` with direct `generateContentClientDirect()`.
    - Handles interactive streaming text accumulation, grounding citations, and collapsible code execution blocks entirely on the client.
  - **Voice Helm Refactor (`components/voice/VoiceHelmSheet.tsx`)**:
    - Ensured voice speech-to-text input routes directly to `generateContentClientDirect()` instead of server endpoints.
  - **LLM Setup Modal & Settings Context (`components/settings/LlmSetupModal.tsx`, `lib/settings/settings-context.tsx`)**:
    - Updated connection testing to execute `testGeminiConnection()` directly from the browser.
  - **Custom Universe Theme Generator (`components/settings/ThemeSelectionModal.tsx`, `app/settings/page.tsx`)**:
    - Replaced calls to `/api/themes/custom` with `generateCustomThemeDirect()`.
  - **Server Route Deprecation (`app/api/chat/route.ts`, `app/api/themes/custom/route.ts`)**:
    - Deprecated server routes with HTTP 410 Gone responses to guarantee zero API keys or user prompts ever touch our backend server or server logs.
- Implemented **Team Activity Stream Real Data Integration**:
  - **Removed Mock Placeholders (`components/crew/TeamActivityStream.tsx`)**:
    - Eliminated hardcoded placeholder activities array (`act-1` through `act-6` mock entries).
    - Refactored component to build the activity stream strictly from genuine `tasks` passed via props (`TaskRecord[]`).
    - Derived clean agent display name and timestamps (`completed_at` or `created_at`).
    - Added an empty state card (`No team activity recorded yet`) when no tasks or subagent activities exist.
    - Cleaned up unused imports and unneeded helper functions (`AlertCircle`, `Send`, `Sparkles`, `getActionIcon`).
- Implemented **Fleet Sweep Cancellation & Subagent Engine Section Refinements**:
  - **Radial Page Subagent Section Enhancements (`app/page.tsx`)**:
    - Removed the redundant "Engine Specifications" card from the Radial page sidebar.
    - Expanded the "Subagent Engine" activity feed to display the last 5 execution event items (up from 2) with a taller scroll container (`max-h-56`).
    - Added a direct navigation link next to the "Subagent Engine" title that links directly to `/crew#team-activity` ("Team activity" with right-arrow icon) for complete audit trail inspection.
  - **Crew Page Activity Stream (`components/crew/TeamActivityStream.tsx`)**:
    - Added `id="team-activity"` and smooth scroll anchor padding (`scroll-mt-20`) to the root container for seamless in-page jumping.
  - **Cancellation Architecture (`lib/ai/subagent-engine.ts`)**:
    - Added `currentAbortController: AbortController | null` and `activeTaskId: string | null` to track and abort inflight tasks.
    - Added `stop()` method to `SubagentExecutionEngine` which clears queued tasks, clears pacing timers (`clearTimeout`), aborts the active fetch request signal, reverts interrupted tasks back to `'pending'` in OPFS SQLite, and emits a `'cancelled'` event.
    - Handled `AbortError` in `executeTask()` cleanly without polluting logs with failure records.
  - **Subagent Engine Card Controls (`app/page.tsx`)**:
    - Replaced the disabled state during sweep execution with an interactive crimson `Stop Fleet` button with Lucide `Square` icon that halts execution immediately.
    - Updated event listener to react to `cancelled` events, resetting execution state and refreshing SQLite data.
  - **Project Workspace Drawer Controls (`components/canvas/ProjectWorkspaceDrawer.tsx` & `app/page.tsx`)**:
    - Added `onStopAutonomousTasks` callback to `ProjectWorkspaceDrawer`.
    - Rendered an active `Stop Subagents` button with a `Square` icon when autonomous tasks are executing within a project workspace drawer.
- Implemented **Custom Gemini Web Markdowner Tool (`fetch_url_as_markdown`)**:
  - **Markdowner Tool Handler (`lib/ai/tools/web-markdown.ts`)**:
    - Defined Gemini function declaration `fetchUrlAsMarkdownDeclaration` with `url` and optional `llmFilter` parameters.
    - Implemented `executeFetchUrlAsMarkdown(url, llmFilter)` contacting Markdowner service (`https://md.dhr.wtf/?url=...`), handling 10-second timeouts, graceful Markdown error messages, and 20,000-character caps to safeguard model context.
  - **Tool Registry Integration (`lib/ai/tools.ts`)**:
    - Exported `fetchUrlAsMarkdownDeclaration` and `executeFetchUrlAsMarkdown`.
    - Extended `AgentToolsConfig` with `fetchUrlMarkdown?: boolean`.
    - Updated `buildGeminiTools` to seamlessly merge built-in tools (`googleSearch`, `codeExecution`) with custom function declarations (`functionDeclarations`).
  - **Function Calling Execution Loop (`app/api/chat/route.ts` & `lib/ai/orchestrator.ts`)**:
    - Implemented multi-turn function calling execution loop in `/api/chat` streaming handler: intercepts candidate `functionCalls`, executes `executeFetchUrlAsMarkdown`, constructs `functionResponse` parts, and feeds results back in conversation history for natural synthesized final answers.
    - Added tool capability directives into `assembleContext` in `lib/ai/orchestrator.ts` when an agent has `fetchUrlMarkdown` active.
  - **Agent Tool Capability Matrix & Roster Controls (`lib/crew/default-crew.ts`, `lib/crew/theme-mapper.ts`, `app/crew/page.tsx`, `app/chat/page.tsx`)**:
    - Added `fetchUrlMarkdown: true` by default for research and navigation specialists (Robin, Nami) across all 7 universes in `DEFAULT_ROLE_SLOT_TOOLS` and `DEFAULT_STRAW_HAT_AGENTS`.
    - Updated Crew roster UI: 3-column tool toggle grid (`Search`, `Code`, `MD`) on agent cards, modal edit checkbox for Web Markdowner, and status inspection view.
    - Added live `Markdown` indicator badge in Helm Chat toolbar.
- Implemented **First-Class Gemini Built-In Tools Support (Google Search Grounding & Code Execution)**:
  - **Tool Utilities (`lib/ai/tools.ts`)**:
    - Defined types for `AgentToolsConfig`, `GroundingMetadata`, `GroundingChunkWeb`, `ExecutableCodePart`, `CodeExecutionResultPart`, and `CodeExecutionBlock`.
    - Created `buildGeminiTools(toolsConfig)` formatting `{ googleSearch: {} }` and `{ codeExecution: {} }` for Google GenAI SDK.
    - Implemented stream parsing utility `readChatStream` supporting both Server-Sent Events (SSE) metadata streams and plain text streams.
  - **Extended Agent Definitions (`lib/db/adapter.ts`, `lib/crew/default-crew.ts`, `lib/crew/theme-mapper.ts`)**:
    - Added `tools?: AgentToolsConfig | null` to `AgentRecord` and `grounding_metadata` / `code_execution` columns to `MessageRecord`.
    - Configured default crew tools: enabled `googleSearch` on research/navigation agents (Robin, Nami) and `codeExecution` on engineering/calculation agents (Franky, Nami).
    - Added `DEFAULT_ROLE_SLOT_TOOLS` across all 7 universe themes in `theme-mapper.ts`.
    - Added non-destructive SQLite migrations across `schema.sql`, `workers/db.worker.ts`, `public/sqlite/sqlite-engine.js`, and `opfs-adapter.ts`.
  - **LLM Dispatcher Wiring (`lib/ai/orchestrator.ts`, `app/api/chat/route.ts`, `lib/ai/subagent-engine.ts`)**:
    - Injected resolved tools into `assembleContext` and forwarded to `/api/chat`.
    - Injected `buildGeminiTools` into Gemini `generateContentStream` configuration.
    - Extracted and forwarded `groundingMetadata` (citations, search links) and `executableCode`/`codeExecutionResult` parts in real-time SSE stream.
  - **Enhanced Chat Display (`app/chat/page.tsx`)**:
    - Rendered interactive web grounding citations with search query pills, source links with domain/title, and Lucide vector icons.
    - Rendered collapsible code execution blocks with executable script and console output terminal.
    - Added live tool status indicator badges (Search / Code) in the Helm Chat control toolbar.
    - Persisted grounding citations and code execution blocks to OPFS SQLite for permanent history restoration.
  - **Crew Page Tool Controls (`app/crew/page.tsx`)**:
    - Added Gemini Built-In Tools form group directly beneath the "Assigned AI Model" selector in the Specialist Edit/Create modal form, allowing fine-grained toggling of Google Search Grounding and Code Execution with descriptions.
    - Added interactive Built-In Tools toggle buttons (`Search` and `Code` with ON/OFF badges) directly below the Assigned AI Model selector on each crew card in the roster grid, with instant optimistic UI update and OPFS SQLite persistence (`db.saveAgent`).
    - Added tool status badges on crew cards alongside model badges and updated Scoped Knowledge & Tool Access inspection section in the role instructions modal.
- Implemented **Mobile Navigation Theme Architecture**:
  - **Fixed Quick Navbar on Bottom (`components/layout/BottomNav.tsx`)**:
    - Thumb-friendly reach positioned fixed at the bottom on mobile devices (`inset-x-0 bottom-0 z-40 md:hidden`).
    - Strictly **icons-only** with no text labels for tabs.
    - Features the 5 designated tabs: **Canvas** (`/`), **Chat** (`/chat`), **Crew** (`/crew`), **Vault** (`/vault`), and **Settings** (`/settings`).
    - Integrated with Lucide SVG vector icons (`Compass`, `MessageSquare`, `Users`, `Database`, `SlidersHorizontal`), active ambient glow indicators, and unconfigured LLM key warning pulse.
    - Configured safe-area padding for fluid mobile notch handling.
  - **Fixed Top Navbar (`components/layout/Navbar.tsx`)**:
    - Absolute/fixed top positioning (`fixed md:sticky top-0 inset-x-0 z-50`) across mobile viewports.
    - Left-to-right cluster:
      1. **Menu button first** (`/menu` command center launcher).
      2. **Profile Icon button** (`Building2`), which directly opens the interactive Company Profile Switcher dropdown.
      3. **Current Profile Company Name** text pill with dropdown arrow and active indicator.
    - Right-to-left cluster (floating to the right):
      1. **Speak With Ceo button** (`Mic` voice chat trigger launching the `VoiceHelmSheet`), strictly **icons-only**.
      2. **Helm Chat button** (`MessageSquare` link navigating to `/chat`), strictly **icons-only**.
  - **Canvas Core Middle Viewport**:
    - Top and bottom navbars firmly establish boundaries, leaving the entire middle viewport free for the current page and radial knowledge canvas to paint smoothly.
    - Global layout styled with `pt-16 md:pt-0 pb-20 md:pb-0` in `app/layout.tsx` to prevent the top of any page from being hidden beneath the fixed top navbar and the bottom from colliding with the quick navbar.

## Recent Changes
- **Streamlined Topnav & Radial Canvas Controls (`components/layout/Navbar.tsx`, `components/canvas/RadialGraph.tsx`)**:
  - Removed all redundant buttons containing text from the topnav header (center navigation links, quick theme name toggle button, and morning planning brief trigger), keeping the topnav strictly minimalist with icons and the active company identifier.
  - Removed the redundant "Add Node" button from the floating canvas controls in `RadialGraph.tsx`, retaining clean zoom and transform controls.
- **Fixed Top & Bottom Navigation Margins (`app/layout.tsx`, `app/chat/page.tsx`)**:
  - Added `pt-16 md:pt-0` to the root body in `app/layout.tsx` so top content across all pages begins cleanly below the 64px fixed header.
  - Increased bottom padding to `pb-20 md:pb-0` to guarantee ample clearance over the bottom quick navbar.
  - Updated `app/chat/page.tsx` with responsive height (`min-h-0 md:h-[calc(100vh-4rem)]`) for fluid scrolling on mobile.
- **Project Documentation & Polsia FLOSS Positioning (`README.md`)**:
  - Authored comprehensive documentation highlighting Quarkmeme as a 100% FLOSS browser-native alternative to Polsia.
  - Detailed zero cloud database bills invariant, client-side OPFS SQLite WASM architecture, 7-universe crew hierarchy, isolated character memory banks, and setup guide.
- **Mobile Bottom Navigation (`components/layout/BottomNav.tsx`, `app/layout.tsx`)**:
  - Created persistent, icons-only bottom tab bar for Canvas, Chat, Crew, Vault, and Settings.
  - Injected `BottomNav` into `app/layout.tsx` so it is persistently available across all mobile routes.
- **Top Header Redesign (`components/layout/Navbar.tsx`)**:
  - Reordered left items to Menu button -> Profile Switcher Icon -> Active Company Name.
  - Reordered right items to Speak With Ceo (voice chat icon) and Helm Chat (chat icon), with zero text on mobile.
- **Standalone Menu Page (`/menu`) and Navigation Refactor**:
  - Replaced the mobile slide-over/pop-out drawer in `components/layout/Navbar.tsx` with a dedicated, responsive Menu page at `app/menu/page.tsx`.

## Invariants Maintained
1. Local-First SQLite storage guarantee (zero cloud database bills, all company profiles and records persisted in browser OPFS SQLite).
2. Strict LLM gating invariant (LLM test verification required before profile creation or theme selection).
3. Deterministic Canvas & Fallback Seed Law (canvas never renders blank; uses theme-aware fallback).
4. Double-Confirmation Deletion Law (deletion requires 2 steps and typing the exact company name).
5. Zero unbundled emojis law across all UI components (all Lucide SVG vector icons).
6. 375px+ responsive mobile touch targets and clean layout navigation with zero horizontal or vertical scroll leaks.
