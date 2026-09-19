# Tech Context: Usopp Sniper

## Environment & Tooling
- **Runtime**: Client-side Next.js App Router Web Worker with SQLite WASM.
- **Storage Layer**: `/memory-bank/agents/sniper-usopp/` virtual vault documents stored in SQLite/IndexedDB.
- **Search Engine**: SQLite FTS5 with BM25 ranking scoped to agent knowledge bases.
- **Model Providers**: Offline deterministic synthesis or configured LLM APIs via client settings.

## Constraints
- Zero cloud database bills: All agent memory resides locally.
- Strict token hygiene: Excerpts limited to relevant domain scope.
