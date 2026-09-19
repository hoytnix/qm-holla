@AGENTS.md

## Tool Usage Efficiency & Context Management
- **Grep and Find Line-Count Restrictions**: Whenever running terminal commands like `grep` or `find`, always ensure output is strictly limited to at most **30 lines per request** (e.g. `| head -n 30`). Never perform unbounded searches.
