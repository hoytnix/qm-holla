# Active Context: Quarkmeme

## Current Focus & Status
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
