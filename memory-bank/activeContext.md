# Active Context: Quarkmeme

## Current Focus & Status
- Dynamically bound the Radial Graph CEO node and Fleet Destination Auto-Orchestrator to the **current CEO / Owner of the active Profile / Universe**:
  - **RadialGraph Center Node**: In `components/canvas/RadialGraph.tsx`, dynamic `rootNode` and `captain` resolve their name from `activeCompany.owners` (or the active theme/company leader agent), displaying the current CEO name and `${themeConfig.leaderTitle} & CEO` instead of a static Luffy pin.
  - **Fleet Destination Auto-Orchestrator**: In `app/chat/page.tsx`, the destination dropdown option dynamically displays `Auto-Orchestrate (${leaderTitle} ${profileCeoName})` matching the current workspace profile.
  - **Orchestration Dispatcher (`lib/ai/orchestrator.ts`)**: `autoOrchestrateFleetDestination` dynamically looks up the active captain/CEO agent from the active roster and profile rather than hardcoding Luffy.
  - **Crew Directory Reports Badge (`app/crew/page.tsx`)**: The reporting badge dynamically reads `REPORTS TO ${ceoName.toUpperCase()}` based on the current profile owner / leader title.
  - **Theme Mapper (`lib/crew/theme-mapper.ts`)**: `resolveCrewMemberForTheme` and `getThemedCrewMember` now accept an optional `ceoOverrideName` and resolve according to the active theme/profile instead of hard-pinning Luffy across all universes.

## Recent Changes
- **Radial Canvas (`components/canvas/RadialGraph.tsx`)**:
  - Bound `rootNode` and `captain` to `profileCeoName` derived from `activeCompany.owners` or the database captain record and theme leader title.
- **Helm Chat (`app/chat/page.tsx`)**:
  - Updated Fleet Destination select dropdown to dynamically reflect `Auto-Orchestrate (${leaderTitle} ${profileCeoName})`.
- **Crew Roster (`app/crew/page.tsx`)**:
  - Made the reporting hierarchy tag display `REPORTS TO ${ceoName.toUpperCase()}`.
- **Orchestrator Layer (`lib/ai/orchestrator.ts`)**:
  - Rewrote `autoOrchestrateFleetDestination` to dynamically resolve the primary orchestrator from the active agent roster.
- **Theme Mapper Layer (`lib/crew/theme-mapper.ts`)**:
  - Removed hardcoded Luffy pinning in `resolveCrewMemberForTheme`.

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
