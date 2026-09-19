# Project Brief: Quarkmeme

## Vision & Overview
Quarkmeme is an offline-ready, local-first, hierarchical multi-agent personal operating system and Grand Line radial knowledge canvas. It empowers users to orchestrate autonomous AI specialist crews directly from their browser with **zero cloud database bills**, zero lock-in, and total data sovereignty.

## Core Mission & Philosophy
- **Local-First OPFS Storage**: Everything (agents, knowledge bases, documents, conversation messages, delegation traces) is persisted in the browser's Origin Private File System (`/quarkmeme.db`) via SQLite WASM with FTS5 search. No external cloud database required.
- **Hierarchical Crew Orchestration**: Built around the Straw Hat crew hierarchy:
  - **Level 0 (Core Orchestrator)**: "Luffy" (Captain & CEO) coordinates top-level strategic queries, general orchestration, and multi-agent intent routing.
  - **Level 1 (Division Leads)**: Functional domain specialists (`Robin` = Research/Archaeology, `Chopper` = Health/Diagnostics, `Franky` = Systems/Shipwright, `Nami` = Finance/Navigation, `Sanji` = Operations/Pipelines, `Usopp` = Marketing/Storytelling).
  - **Level 2 (Leaf Nodes & Projects)**: Granular workspace project nodes and knowledge bases tied to division leads.
- **Grand Line Radial Knowledge Canvas**: Visual, interactive radial node graph displaying the Captain core, orbiting division leads, and satellite project leaf nodes with real-time status and seamless interaction.
- **Deterministic & Fault-Tolerant**: Never displays a blank or broken canvas. Seeds crew hierarchy instantly if the database is empty; provides immediate static fallback datasets during Web Worker initialization.
- **Extensible & Turso/libSQL Aligned**: Clean repository abstraction (`IQuarkDatabase`) allowing future cloud sync or Turso libSQL embedded sync without rewriting UI components.
