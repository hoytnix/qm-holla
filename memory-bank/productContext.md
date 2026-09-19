# Product Context: Quarkmeme

## Purpose & Why It Exists
Modern AI agents frequently rely on high-cost serverless databases, third-party cloud vectors, and fragmented chat threads. Quarkmeme inverts this paradigm:
1. **Zero Database Bills**: The entire storage stack runs locally in the client using SQLite WASM over OPFS.
2. **Autonomous Multi-Agent Collaboration**: Instead of an amorphous single-model chat, Quarkmeme provides a specialized crew inspired by the Straw Hat Pirates, where distinct domain leads manage specific knowledge domains.
3. **Spatial & Visual Thinking**: Radial knowledge graph (The Grand Line canvas) replaces linear lists, giving the user an intuitive orbital view of their active crew, leaf projects, and knowledge bases.

## User Experience & Flows
- **The Helm (Main / Radial Canvas & Chat)**:
  - Central dynamic radial canvas visualizing the captain, division leads, and satellite project nodes.
  - Interactive selection of crew members, focusing on their active knowledge bases and system directives.
  - Conversational input with automatic multi-agent intent routing (`routeIntent`), FTS5 knowledge context assembly (`assembleContext`), and sub-agent delegation tracking.
- **Crew Roster (`/crew`)**:
  - Direct management, inspection, and customization of division leads, role descriptions, and system instructions.
- **Knowledge Vault (`/vault`)**:
  - Ingestion and browsing of knowledge bases, markdown documents, and local resources indexed via FTS5 full-text search.
- **PWA & Mobile Navigation**:
  - Fully responsive navigation header scaling down to 375px viewport standard without horizontal scroll leaks.
  - PWA manifest (`app/manifest.ts`) configured for standalone installation.
- **Iconography Standards**:
  - Strict vector icon rendering using `lucide-react` with explicit sizing (`width={20} height={20}`) — zero unbundled emojis in the UI.
