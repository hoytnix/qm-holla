# Active Context: Quarkmeme

## Current Focus & Status
- Completed the multi-tenant, profile-driven workspace architecture with strict LLM gating and granular character memory filtering across Phases 0, 1, 2, and 3:
  - **Phase 0 (LLM Connection Gateway)**: Enforces mandatory LLM configuration and successful connection test before unlocking profile creation or theme selection.
  - **Phase 1 (Company Profile Onboarding Wizard)**: First-initiation wizard capturing Company Name, Owner Name(s), Mission/Vision/Principles, and an Initial ToDO List, auto-seeding tasks and generating a Founding Charter markdown document.
  - **Phase 2 (Multi-Profile Context & Switcher)**: Multi-tenant company workspace support with isolated settings/theme/records, header & settings profile switcher, and double-confirmation profile deletion (requiring typing the exact company name).
  - **Phase 3 (Granular Character Memory Filtering)**: Upgraded `/vault` selector to filter memory banks by individual crew characters (`/memory-bank/agents/[agent-id]/`), with dedicated Character Memory Bank banner and character badge in [`components/vault/MarkdownDrawer.tsx`](file:///home/oloty/Dev/qm-holla/components/vault/MarkdownDrawer.tsx).

## Recent Changes
- **Database & Storage Layer (`lib/db/adapter.ts`, `lib/db/schema.sql`, `public/sqlite/sqlite-engine.js`, `lib/db/opfs-adapter.ts`)**:
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
