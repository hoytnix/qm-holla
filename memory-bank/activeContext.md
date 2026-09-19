# Active Context: Quarkmeme

## Current Focus & Status
- Implemented individual, isolated Memory Banks and universal dynamic provisioning for all crew agents (Luffy, Robin, Franky, Nami, Chopper, Sanji, Usopp, and newly recruited specialists) directly mirroring the Casper system-level memory architecture in both physical workspace directories and the local OPFS SQLite virtual filesystem Vault (`/memory-bank/agents/[agent-id]/`).

## Recent Changes
- **Agent Isolated Memory Bank Generator & Architecture (`lib/crew/agent-memory.ts`)**:
  - Implemented `generateAgentMemoryBankFiles` producing the 6 standard Casper-style core files (`projectbrief.md`, `productContext.md`, `systemPatterns.md`, `techContext.md`, `activeContext.md`, `progress.md`) tailored to each agent's persona and domain responsibilities.
  - Implemented `createMemoryBankDocumentRecords` converting memory files to virtual filesystem records with `/memory-bank/agents/[agent-id]/[file].md` file paths.
  - Created `provisionAgentMemoryBank`, `loadAgentMemoryBank`, and `syncAgentMemoryBankAfterTask` lifecycle handlers for dynamic provisioning, re-hydration, and task execution persistence.
- **Physical Workspace Seeding (`memory-bank/agents/[agent-id]/`)**:
  - Provisioned and seeded dedicated folders and all 6 core files for all 7 Straw Hat crew members: `captain-core`, `scholar-robin`, `shipwright-franky`, `navigator-nami`, `doctor-chopper`, `chef-sanji`, and `sniper-usopp`.
- **Default Crew Roster Integration (`lib/crew/default-crew.ts`)**:
  - Integrated `DEFAULT_CREW_MEMORY_DOCUMENTS` into `DEFAULT_DOCUMENTS` so all agent Memory Banks are seeded into OPFS SQLite upon initialization.
- **Database Adapter Auto-Provisioning (`lib/db/opfs-adapter.ts`)**:
  - Updated `saveAgent` to automatically provision the dedicated `/memory-bank/agents/[agent-id]/` virtual vault files whenever custom officers or specialists are recruited or updated.
- **Orchestration Context Rehydration (`lib/ai/orchestrator.ts`)**:
  - Enhanced `assembleContext` to automatically load the target agent's isolated Memory Bank from the local Vault and inject rehydrated context (`projectbrief.md`, `activeContext.md`, `progress.md`) into `systemInstruction` ahead of each conversation or execution.
- **Subagent Autonomous Engine Task Synchronization (`lib/ai/subagent-engine.ts`)**:
  - Integrated `syncAgentMemoryBankAfterTask` into `SubagentExecutionEngine.executeTask` to auto-update the executing agent's `activeContext.md` and `progress.md` in the local Vault upon task completion.
- **Roster & Vault UI Integration (`app/crew/page.tsx`, `app/vault/page.tsx`)**:
  - Added "Isolated Memory Bank" inspection section to the role instructions modal in `/crew` with a direct link to open the agent's Memory Bank in the Vault.
  - Added Memory Bank filtering (`Isolated Memory Banks (/memory-bank/agents/*)` and `General Vault Notes & Manifesto`) in the Vault collection filter, along with virtual filesystem path badges (`/memory-bank/agents/[id]/[file].md`) on document cards.
- **Production Validation**:
  - Verified with `npx tsc --noEmit` (0 errors).
  - Next.js production build (`pnpm build`) compiled cleanly (exit code 0, 9 static routes generated).

## Invariants Maintained
1. Local-First SQLite storage guarantee (zero cloud database bills, all agent memory banks stored in local OPFS/IndexedDB Vault).
2. Strict isolation: Each agent retains dedicated domain memory files without cross-agent pollution.
3. Zero unbundled emojis law across all UI elements (all vector Lucide SVG icons).
4. 375px+ responsive mobile touch targets and clean layout navigation.
