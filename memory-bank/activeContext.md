# Active Context: Quarkmeme

## Current Focus & Status
- Implemented **Standalone Menu Page (`/menu`) and Navigation Refactor**:
  - Replaced the mobile slide-over/pop-out drawer in `components/layout/Navbar.tsx` with a dedicated, responsive Menu page at `app/menu/page.tsx`.
  - Updated the navbar Menu button to navigate directly to `/menu` (with active highlighting) across mobile devices, and included `Menu` in `NAV_ITEMS` on desktop.
  - The dedicated `/menu` command center features:
    - **Fleet Navigation Grid**: High-craft interactive glass cards for all core modules (Canvas, Helm Chat, Crew Directory, Knowledge Vault, Settings) with accent borders, icons, and direct launchers.
    - **Company Workspaces Multi-Tenant Grid**: Instant profile hot-switching, active indicators, owner names, mission statements, and workspace creation triggers.
    - **Sovereignty & Storage Telemetry Vitals**: Real-time OPFS SQLite status, active crew agent count, FTS5 document count, and $0/mo zero-cloud-bills invariant indicator.
    - **Squad Rituals & Universe Themes**: One-touch launchers for Morning Planning brief and Theme Selection modals.
  - Retained strict invariants: zero unbundled Unicode emojis (`lucide-react` SVG vector icons throughout), fluid 375px responsive standard, and verified via `pnpm build`.

## Recent Changes
- **Agent Schema & Adapter (`lib/db/adapter.ts`, `lib/crew/default-crew.ts`, `lib/db/schema.sql`, `lib/db/opfs-adapter.ts`, `public/sqlite/sqlite-engine.js`, `workers/db.worker.ts`)**:
  - Added `model` column and persistence for per-agent model customization.
- **Crew Roster UI (`app/crew/page.tsx`)**:
  - Added inline model picker on agent cards, edit modal dropdown, and role instructions inspection badge.
- **Routing & Execution Engines (`lib/ai/orchestrator.ts`, `lib/ai/subagent-engine.ts`, `app/chat/page.tsx`)**:
  - Wired agent-specific model resolution into chat route streaming and background task execution with global model fallback.

  - Defined `CompanyProfile` interface and `company_profiles` table.
  - Added `company_id` columns across `projects`, `tasks`, `documents`, `kbs`, and `messages` tables.
  - Implemented `getCompanyProfiles`, `getCompanyProfileById`, `saveCompanyProfile`, and `deleteCompanyProfile`.
  - Added `companyId` filtering parameters to `getProjects`, `getTasks`, `getKbs`, and `getAllDocuments`.
- **Settings Context (`lib/settings/settings-context.tsx`)**:
  - Integrated `isLlmVerified` gating state and OPFS persistence.
  - Added multi-tenant company state management (`companies`, `activeCompany`, `activeCompanyId`, `createCompany`, `switchCompany`, `updateCompany`, `deleteCompany`).
  - Automated task seeding and Founding Charter generation during `createCompany`.
  - Persisted universe theme per company profile so switching companies dynamically updates the fleet theme.
- **LLM Setup Modal (`components/settings/LlmSetupModal.tsx`)**:
  - Created blocking setup modal with Google Gemini (free tier), OpenRouter, and OpenAI presets, key visibility toggle, and connection testing.
- **Company Setup Modal (`components/onboarding/CompanySetupModal.tsx`)**:
  - Created onboarding wizard capturing Company Name, Owners, Mission/Vision/Principles, and dynamic ToDO list.
- **Theme Selection Gating (`components/settings/ThemeSelectionModal.tsx`)**:
  - Gated modal behind `isLlmVerified` and `companies.length > 0`.
- **Navigation & Workspace Switcher (`components/layout/Navbar.tsx`)**:
  - Added company profile hot-switcher dropdown to navbar header and mobile slide-over drawer with "+ Create New Company" trigger.
- **Settings Page (`app/settings/page.tsx`)**:
  - Added Section 1 Company Profiles & Multi-Tenant Workspaces cards, workspace switching, and 2-step double-confirmation deletion requiring typing the exact company name.
- **Vault Knowledge OS & Character Memory Bank (`app/vault/page.tsx`, `components/vault/MarkdownDrawer.tsx`, `components/vault/NotionRichEditor.tsx`)**:
  - Added active company workspace badge to vault header.
  - Added Character Memory Banks optgroup to collection dropdown for each fleet officer.
  - Added individual character memory bank filter isolating `/memory-bank/agents/[agent-id]/*`.
  - Added Character Memory Bank hero banner with avatar, officer title, and core file indicators.
  - Added character badge to Markdown drawer and preserved `company_id` and `file_path` in NotionRichEditor.
- **Canvas & Dashboard Integration (`app/page.tsx`, `components/canvas/RadialGraph.tsx`, `components/dashboard/CaptainsLog.tsx`)**:
  - Wired `activeCompanyId` into fleet data queries (`getProjects`, `getTasks`, `getAllDocuments`), dynamic node creation, and reactive reloads.
  - Added company workspace pill in Captain's Log.

## Invariants Maintained
1. Local-First SQLite storage guarantee (zero cloud database bills, all company profiles and records persisted in browser OPFS SQLite).
2. Strict LLM gating invariant (LLM test verification required before profile creation or theme selection).
3. Deterministic Canvas & Fallback Seed Law (canvas never renders blank; uses theme-aware fallback).
4. Double-Confirmation Deletion Law (deletion requires 2 steps and typing the exact company name).
5. Zero unbundled emojis law across all UI components (all Lucide SVG vector icons).
6. 375px+ responsive mobile touch targets and clean layout navigation.
