# System Patterns & Architecture

## System Architecture Overview
Quarkmeme is constructed with Next.js App Router (React 19, TypeScript), Tailwind CSS, Framer Motion, and client-side SQLite WASM via Web Workers and the browser Origin Private File System (OPFS).

```
┌───────────────────────────────────────────────────────────────┐
│                    React UI Layer (Main Thread)               │
│  - RadialGraph (Framer Motion / SVG Canvas)                   │
│  - Helm Chat & Intent Router                                  │
│  - Vault & Crew Management (Navbar, Glass UI)                 │
└───────────────────────────────┬───────────────────────────────┘
                                │ postMessage (Async Request-Response)
                                ▼
┌───────────────────────────────────────────────────────────────┐
│              Web Worker Layer (workers/db.worker.ts)          │
│  - @sqlite.org/sqlite-wasm                                    │
│  - OPFS Storage Driver (/quarkmeme.db)                        │
│  - SQLite Schema Migrations & Fallback Seeding                │
│  - FTS5 Virtual Table & BM25 Scoring Triggers                 │
└───────────────────────────────┬───────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────┐
│               Browser Origin Private File System (OPFS)       │
│  - sqlite3-opfs-async-proxy.js (Isolated Static VFS Asset)   │
│  - /quarkmeme.db persistent binary file                       │
└───────────────────────────────────────────────────────────────┘
```

## Key Architectural Patterns

### 1. Database Repository Adapter Pattern (`IQuarkDatabase`)
- Location: `lib/db/adapter.ts` and `lib/db/opfs-adapter.ts`
- Decouples UI and business logic from the underlying storage mechanism.
- The default implementation dispatches asynchronous tasks to `workers/db.worker.ts` with in-memory fallback for environments where Web Workers / OPFS are initializing or unsupported.
- Future-ready for zero-rewrite transition to `@tursodatabase/sync` or libSQL client.

### 2. Multi-Agent Intent Routing & Context Assembly
- Location: `lib/ai/orchestrator.ts`
- Intent routing dynamically computes match scores between user prompts and agent `routing_description` + role metadata.
- Context assembly retrieves scoped knowledge using SQLite FTS5 (`documents_fts` MATCH query) with BM25 ranking and fleet-wide fallback.
- Records delegation hops (`delegation_trace`) into `messages`.

### 3. Worker Offloading & COOP / COEP Invariant
- Database operations run entirely off the main thread in `workers/db.worker.ts` to prevent UI thread blocking.
- OPFS synchronous access handles require `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` configured in `next.config.ts`.
- The SQLite proxy `public/sqlite/sqlite3-opfs-async-proxy.js` is loaded statically without Next.js bundler rewriting.

### 4. Deterministic Seeding & Canvas Resilience
- When the database is first initialized or `SELECT COUNT(*) FROM agents` returns 0, the database worker automatically applies `lib/db/schema.sql` and populates `DEFAULT_STRAW_HAT_AGENTS` and `DEFAULT_PROJECT_NODES`.
- Components provide static default datasets (`DEFAULT_STRAW_HAT_AGENTS`) so the radial canvas renders immediately on initial load without hydration delays or blank frames.
