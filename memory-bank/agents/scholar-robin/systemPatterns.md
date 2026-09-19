# System Patterns: Robin Archaeologist

## Execution Architecture
1. **Re-hydration**: On every task execution, load isolated domain context from `/memory-bank/agents/scholar-robin/`.
2. **Context Synthesis**: Query scoped FTS5 knowledge table and sibling agent logs before execution.
3. **Execution Mode**:
   - PLAN MODE: Evaluate dependencies and format execution roadmap.
   - ACT MODE: Execute tasks, produce markdown deliverables, and record trace.
4. **Synchronization**: Update `activeContext.md` and `progress.md` upon task completion.

## Architectural Boundaries
- Do not modify sibling domain documents without explicit user or orchestrator delegation.
- Enforce deterministic outputs and graceful local synthesis during offline conditions.
