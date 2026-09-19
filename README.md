<div align="center">

# Quarkmeme (qm-holla)

**The Sovereign, Local-First Multi-Agent Operating System & Grand Line Radial Knowledge Canvas.**

[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](LICENSE)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![SQLite WASM](https://img.shields.io/badge/SQLite-WASM%20%2B%20OPFS-003B57?logo=sqlite)](https://sqlite.org/wasm)
[![Zero Cloud Database Bills](https://img.shields.io/badge/Database%20Bills-$0%2Fmonth-emerald)](#zero-cloud-bills-local-first-opfs-storage)
[![FLOSS Alternative](https://img.shields.io/badge/FLOSS%20Alternative-to%20Polsia-indigo)](#a-floss-browser-native-alternative-to-polsia)

</div>

---

## A FLOSS, Browser-Native Alternative to Polsia

**Quarkmeme** is a 100% Free/Libre and Open-Source Software (**FLOSS**) alternative to proprietary multi-agent personal operating systems like **Polsia**.

While platforms like Polsia lock your agent configurations, chat histories, company hierarchies, and organizational memories inside closed remote servers with ongoing subscription tiers and cloud database bills, **Quarkmeme runs entirely client-side inside your web browser**.

| Capability | Polsia | Quarkmeme |
| :--- | :--- | :--- |
| **Software License** | Proprietary / Closed Source | **FLOSS / MIT Licensed** |
| **Runtime Environment** | Remote Centralized Cloud | **100% Client-Side Web Browser** |
| **Data Sovereignty** | Stored on Vendor Servers | **Origin Private File System (OPFS)** |
| **Database Bills** | Monthly Cloud Subscriptions | **$0.00 / month (Zero Database Bills)** |
| **Multi-Agent Roster** | Fixed Remote Personas | **7-Universe Crew Casting + Custom LLM Casting** |
| **Knowledge Engine** | Closed Cloud Embeddings | **Local SQLite FTS5 Full-Text Search (BM25)** |
| **Memory Isolation** | Server-Managed Threads | **Isolated Character Memory Banks (`/memory-bank/agents/*`)** |
| **Offline Capability** | Non-functional without internet | **Full PWA Standalone with Offline Voice Helm** |

Everything—your autonomous agent specialists, knowledge vaults, documents, company profiles, and chat logs—is stored in your browser's **Origin Private File System (OPFS)** via SQLite WASM. You bring your own API keys (BYOK) for LLM inference (Google Gemini free tier, OpenRouter, or OpenAI-compatible), and nothing touches a central database server.

---

## Core Pillars & Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       React 19 UI Layer (Main Thread)                       │
│  - Grand Line Radial Canvas (Framer Motion / SVG Orbital Visualization)     │
│  - The Helm Chat & Multi-Agent Dynamic Intent Router                        │
│  - Notion-Style Full-Page Rich Markdown Vault & Notion Drawer               │
│  - Mobile Quick Bar (Icons-Only Bottom Nav & Fixed Top Profile Switcher)   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ postMessage (Async Request-Response)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Web Worker Layer (workers/db.worker.ts)                 │
│  - @sqlite.org/sqlite-wasm + IndexedDB / OPFS Driver                        │
│  - Non-Destructive Migrations & Fallback Seeding Engine                     │
│  - FTS5 Virtual Tables (BM25 Ranking & Scoped Agent Retrieval)              │
│  - IQuarkDatabase Repository Adapter (Turso / libSQL embedded-sync ready)   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 Browser Origin Private File System (OPFS)                   │
│  - Persistent /quarkmeme.db binary file                                     │
│  - Isolated Character Memory Banks (/memory-bank/agents/[agent-id]/*)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1. Hierarchical Multi-Agent Crew (Straw Hat & Multi-Universe Engine)
- **Level 0 (Core Orchestrator / CEO)**: Dynamic captain bound to your company workspace profile owner. Coordinates top-level strategy, dispatch, and intent routing (`routeIntent`).
- **Level 1 (Division Leads)**: 6 domain specialists with dedicated system prompts and scoped tool permissions:
  - **Research Lead** (e.g. Robin / Shikamaru / Jim Halpert / Tyrion)
  - **Systems & Dev Lead** (e.g. Franky / Sasuke / Dwight Schrute / Bran)
  - **Finance & Data Lead** (e.g. Nami / Sakura / Angela Martin / Littlefinger)
  - **Health & Telemetry Lead** (e.g. Chopper / Tsunade / Toby Flenderson / Grand Maester Pycelle)
  - **Operations Lead** (e.g. Sanji / Choji / Pam Beesly / Davos Seaworth)
  - **Marketing & Outreach Lead** (e.g. Usopp / Kakashi / Ryan Howard / Varys)
- **Level 2 (Leaf Projects & Lore)**: Granular workspace nodes and task items linked dynamically to division leads.
- **7 Built-in Universes + Custom AI Casting**: Switch instantaneously between *One Piece*, *Naruto*, *The Office*, *Game of Thrones*, *NCIS*, *Pokémon*, *Frieren*, or prompt our custom AI mapper to cast any movie, book, or TV show into the 7 roles.

### 2. Isolated Character Memory Banks
Each agent maintains its own dedicated, sovereign 6-core Memory Bank:
```
/memory-bank/agents/[agent-id]/
  ├── projectbrief.md    # Agent goals, domain, and executive charter
  ├── productContext.md  # User experience, domain personas, and workflow
  ├── systemPatterns.md  # Execution standards and domain patterns
  ├── techContext.md     # Models, tools, and technical constraints
  ├── activeContext.md   # Current active task focus and state
  └── progress.md        # Work log, completed deliverables, and history
```
Context rehydration loads these documents directly into the agent's context window along with FTS5 BM25 search results before generation.

### 3. Grand Line Radial Knowledge Canvas
- Interactive SVG/Canvas radial node graph featuring orbital physics, multi-touch pinch-zoom, and smooth drag mechanics.
- Immediate static fallback dataset prevents blank canvas flashes during Web Worker spin-up.
- Add and manage Level 2 project diamonds, Level 3 task squares, and knowledge lore disks directly from the graph.

### 4. Zero Cloud Bills & Local-First OPFS Storage
- SQLite WASM running inside an isolated Web Worker off the main rendering thread.
- Full-text search powered by SQLite FTS5 (`documents_fts`) virtual tables.
- Zero tracking, zero telemetry, and zero remote database hosting fees.

### 5. Mobile Theme & Responsive Navigation
- **Fixed Quick Bottom Navbar**: Thumb-reachable, strictly icons-only bar with quick access to **Canvas**, **Chat**, **Crew**, **Vault**, and **Settings**.
- **Fixed Top Navbar**: Left-to-right cluster featuring the Menu button, Profile Switcher icon (`Building2`), and active Company Name; right-to-left cluster featuring Speak With CEO (Voice Chat icon) and Helm Chat icon.
- **Fluid Middle Viewport**: Open canvas viewport engineered for fluid navigation and zero layout shifts down to 375px screens.
- **Zero-Cost Offline Voice Helm**: Browser-native Speech Recognition (STT) and Speech Synthesis (TTS) persona engine.

---

## Quick Start & Local Setup

### Prerequisites
- **Node.js**: v18.18+ or v20+
- **pnpm**: v9+ (Mandatory package manager)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/hoytnix/qm-holla.git
   cd qm-holla
   ```

2. **Install dependencies using pnpm:**
   ```bash
   pnpm install
   ```

3. **Start the local development server:**
   ```bash
   pnpm dev
   ```

4. **Open Quarkmeme:**
   Navigate to [http://localhost:3000](http://localhost:3000) in any modern browser (Chrome, Edge, Brave, Firefox, Safari).

5. **Bring Your Own Keys (BYOK):**
   - Click the **Settings** tab (or the top-right fuel indicator).
   - Enter your **Google Gemini** (free tier supported), **OpenRouter**, or **OpenAI-compatible** API key.
   - Keys are encrypted into your browser's local OPFS SQLite storage and never transmitted to any Quarkmeme server.

---

## Technology Stack

- **Framework**: Next.js App Router (React 19, TypeScript)
- **Database Engine**: `@sqlite.org/sqlite-wasm` with OPFS & IndexedDB persistence
- **Search Engine**: SQLite FTS5 with BM25 full-text indexing
- **Styling & Theming**: Tailwind CSS, Lucide React icons, Framer Motion
- **Document Editing**: Notion-style rich editor with TipTap, Markdown toolbar, and live task checkboxes
- **Speech Engine**: Browser-native Web Speech API (STT & TTS)
- **AI Integration**: Official `@google/genai` SDK and Vercel AI SDK (`ai`)

---

## License

Quarkmeme is open-source software licensed under the [MIT License](LICENSE).
Feel free to fork, hack, and deploy your own autonomous sovereign crew!
