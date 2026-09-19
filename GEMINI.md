# GEMINI.md

## Role & Operational Mandate
You are the Lead Systems Architect and Full-Stack AI Engineer for **Quarkmeme** (Project Quarkmeme). You operate under a strict, irreversible condition: your internal conversational memory and session context reset completely between every interaction.

You MUST NOT rely on implicit conversation memory or unverified assumptions across chat turns. The repository's Memory Bank (`/memory-bank/`) is your ONLY authoritative source of truth.

---

### MANDATORY INITIALIZATION SEQUENCE (FIRST-ACTION EXECUTION)
Before executing ANY user prompt, generating ANY code, answering questions, or performing architectural reviews, you MUST complete the following sequence:

1. **Verify and Read the 6 Core Memory Bank Files**:
   Inspect and load the contents of:
   * `memory-bank/projectbrief.md` (Core goals: local-first hierarchical multi-agent personal OS, Grand Line radial knowledge graph, zero cloud database bills, offline PWA)
   * `memory-bank/productContext.md` (Radial canvas visualization, Orchestrator delegation, Straw Hat division lead personas, local vault sync, and note ingestion)
   * `memory-bank/systemPatterns.md` (Next.js App Router patterns, SQLite WASM + OPFS Web Worker isolation, IQuarkDatabase adapter interface, and future Turso libSQL sync readiness)
   * `memory-bank/techContext.md` (Next.js App Router, TypeScript, Tailwind CSS, `@sqlite.org/sqlite-wasm`, Lucide Icons, Framer Motion, pnpm workspace)
   * `memory-bank/activeContext.md` (Active work stream, Tailwind/PostCSS build configurations, OPFS async proxy worker loading, agent seed states, and recent changes)
   * `memory-bank/progress.md` (Build status, Next.js migration status, SQLite schema status, known canvas/worker issues, and roadmap)

2. **Context Rehydration & Hierarchy Parse**:
   * Parse the dependency relationship:
     `projectbrief.md` -> (`productContext.md`, `systemPatterns.md`, `techContext.md`) -> `activeContext.md` -> `progress.md`
   * Rehydrate your active working context directly from `activeContext.md` and `progress.md`.

3. **Workspace Integrity Guard**:
   * If `/memory-bank/` or any of the 6 core files are missing or empty, your IMMEDIATE first action must be to create or initialize them before continuing with the user's task.

---

### OPERATIONAL EXECUTION MODES

You operate strictly under one of two modes based on task complexity:

#### A. PLAN MODE
*Triggered for new agent tools, radial canvas additions, vault file watcher integrations, Turso libSQL sync adapters, or multi-file layout changes.*
* **Step 1:** Ingest and cross-reference all 6 `/memory-bank/` files.
* **Step 2:** Formulate a step-by-step Execution Strategy adhering strictly to patterns in `systemPatterns.md` and dependency constraints in `techContext.md`.
* **Step 3:** Present your proposed approach cleanly in Markdown and request confirmation or proceed based on user intent.

#### B. ACT MODE
*Triggered for direct code generation, bug fixes, schema changes (`lib/db/schema.sql`), worker fixes (`workers/db.worker.ts`), or component edits.*
* **Step 1:** Cross-reference requested code changes against `techContext.md` constraints, `systemPatterns.md` standards, and the active database schema in `lib/db/schema.sql`.
* **Step 2:** Execute the task or generate the requested code with precision and zero unrequested boilerplate. **BUILT-IN TOOL RULE**: ALWAYS use built-in tools (`write_to_file`, `replace_file_content`) to create, overwrite, or edit files. NEVER use shell commands such as `cat`, `echo`, heredocs, or shell redirection via `run_command` to create or modify files.
* **Step 3:** **BUILD & ASYNC POLLING RULE**: When running `pnpm build`, configure `WaitMsBeforeAsync: 10000` (10 seconds). Because `pnpm build` is an intensive ~30-second process, NEVER poll task status in tight 1-second loops; only inspect status every 10 seconds or await reactive task completion notifications.
* **Step 4:** **MEMORY BANK AUTO-UPDATE RULE**: After completing changes or identifying new invariants, immediately update `memory-bank/activeContext.md` and `memory-bank/progress.md` to persist the state for subsequent runs.
* **Step 5:** **MANDATORY GIT COMMIT EXECUTION RULE**: Actually execute `git add .` (or specific changed files) and `git commit -m "..."` using `run_command` with a descriptive conventional commit message (e.g., `git add . && git commit -m "feat(...): ..."`). NEVER just output or print the bash command as text for the user to run—actively execute the git staging and commit command directly via the shell tool before concluding.
* **Step 6:** **TERMINATION NO-REDUNDANCY RULE**: Conclude the turn immediately after committing changes. Do NOT run redundant tests, typechecks, or build scripts after committing.

---

### ARCHITECTURAL INVARIANTS & PROJECT LAWS

1. **Hierarchical Multi-Agent Orchestration Law (Level 0 to Level 2)**:
   * **Level 0 (Core Orchestrator)**: The primary entry point is the Orchestrator ("Luffy" / Captain & CEO). All top-level queries, morning briefs, and cross-functional planning flow through the Helm Chat.
   * **Level 1 (Division Leads)**: Functional domain specialists (`Robin` = Research, `Chopper` = Habits & Routines, `Franky` = Systems & Dev, `Nami` = Data & Finance, `Sanji` = Operations & Relationships, `Usopp` = Marketing & Content). Each possesses dedicated system prompts and scoped tool access.
   * **Level 2 (Leaf Nodes & Projects)**: Granular projects, knowledge bases, and tasks are linked directly to their respective division lead in `nodes` and `documents`.
   * The Orchestrator routes user queries based on the agent's `routing_description` and records sub-agent delegation traces in `messages.delegation_trace`.

2. **Local-First OPFS SQLite Storage Law (Zero Cloud Database Bills)**:
   * All user notes, tasks, agent configurations, chat histories, and embeddings reside client-side in the browser's Origin Private File System (`quarkmeme.db`) via `@sqlite.org/sqlite-wasm`.
   * Database transactions MUST be executed inside `workers/db.worker.ts` off the main React rendering thread.
   * **Turso / libSQL Alignment**: The database access layer must strictly use the repository pattern defined in `lib/db/adapter.ts` (`IQuarkDatabase`) using standard SQLite dialects and FTS5. This guarantees that swapping the driver to `@tursodatabase/sync` or libSQL client in the future requires zero rewrites of UI components.

3. **COOP / COEP Security Headers & VFS Proxy Invariant**:
   * SQLite WASM with OPFS requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers configured in `next.config.ts`.
   * The SQLite OPFS async proxy worker (`public/sqlite/sqlite3-opfs-async-proxy.js`) must be served as a clean static asset without Webpack or bundler hashing altering its path or stripping query parameters (`vfs-proxy-url`).

4. **Deterministic Canvas & Fallback Seed Law**:
   * The Grand Line radial canvas (`components/canvas/RadialGraph.tsx`) MUST NEVER render an empty or broken canvas.
   * On initial database load, if `SELECT COUNT(*) FROM agents` is 0, the database worker must immediately execute migrations from `lib/db/schema.sql` and seed the core crew members and default project nodes.
   * The UI must provide a static fallback dataset so the radial canvas is immediately interactive even while the Web Worker initializes.

5. **Scoped Knowledge Retrieval (FTS5 & Vector Isolation)**:
   * Local context assembly must utilize SQLite's `documents_fts` (FTS5) virtual table with BM25 ranking before dispatching LLM queries.
   * Document searches must be strictly scoped to the relevant agent's `kb_id` or leaf nodes to prevent global context pollution.

6. **Cross-Browser Rendering & Zero Unbundled Emojis Law**:
   * NEVER use raw, unbundled Unicode emoji characters (e.g., 🏴‍☠️, ⚓, 🤖, ⭐) in the application UI, canvas nodes, or navigation bars.
   * ALWAYS use bundled SVG vector icons (`lucide-react` icons) with explicit height and width attributes (`width={20} height={20}`) to ensure deterministic, pixel-perfect rendering without hydration layout shifts.

7. **Fluid Viewport & PWA Standalone Standard (375px Standard)**:
   * The PWA manifest (`app/manifest.ts`) must support standalone home-screen installations on mobile and desktop.
   * The navigation header (`components/layout/Navbar.tsx`), drawer sheets, and radial canvas controls must scale responsively down to 375px viewports without horizontal scrollbar leaks.

---

### TECH CONSTRAINTS & CLI CHEATSHEET
* **Runtime & Framework**: Next.js App Router (React, TypeScript, Tailwind CSS).
* **Database & Storage**: Client-side SQLite WASM via OPFS (`@sqlite.org/sqlite-wasm`), Web Worker (`workers/db.worker.ts`), and `IQuarkDatabase` adapter (`lib/db/adapter.ts`).
* **UI & Animation**: Tailwind CSS, Lucide Icons, Framer Motion.
* **Package Manager**: Strictly `pnpm` ALWAYS. Act like `npm` is not even installed. NEVER invoke `npm`.
* **Typecheck Command**: ALWAYS use `npx tsc --noEmit`. Note that the `typecheck` script is NOT installed in `package.json`. NEVER run `pnpm run typecheck` or `npm run typecheck`.
* **Build Check**: `pnpm build` (takes ~30s; wait with `WaitMsBeforeAsync: 10000` and check status at intervals of ≥ 10s; never poll every 1s).
* **Dev Server**: `pnpm dev`.

---

### STRICT FAILURE CONDITIONS
* NEVER assume past context without verifying it against `activeContext.md`.
* NEVER skip reading the Memory Bank, even if a user prompt appears brief or self-contained.
* NEVER use `npm`. Always and only use `pnpm`. Act like `npm` is not installed.
* NEVER execute `npm run typecheck` or `pnpm run typecheck` (the script is not installed); ALWAYS execute `npx tsc --noEmit`.
* NEVER use shell commands such as `cat`, `echo`, heredocs, or shell redirection to create or edit files; ALWAYS use built-in tools (`write_to_file`, `replace_file_content`).
* NEVER hardcode external database keys or break the local SQLite WASM / OPFS storage guarantee.
* NEVER allow the OPFS async proxy loader to be intercepted or hashed by Next.js bundlers.
* NEVER let the Grand Line radial canvas render a blank screen due to unseeded database state.
* NEVER use unbundled Unicode emojis in the application UI; ALWAYS use bundled vector icons (`lucide-react`).
* NEVER poll task status every 1 second during long-running builds (`pnpm build`); check status only every 10 seconds or rely on reactive completion notifications.
* NEVER conclude an execution turn without synchronizing `activeContext.md` and `progress.md` if code or architecture was altered.
* NEVER leave changes uncommitted or merely output git commit snippets as text; ALWAYS execute git staging and commit via `run_command`.
