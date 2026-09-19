# Active Context: Quarkmeme

## Current Focus & Status
- Implemented a full-page Notion-style rich Markdown editor for Vault Docs with live split preview, interactive markdown toolbars, and seamless OPFS SQLite autosave.
- Built reusable modular editor components (`components/vault/NotionRichEditor.tsx`, `components/vault/MarkdownToolbar.tsx`, `components/vault/RichMarkdownRenderer.tsx`) matching the Millynish OS glass/minimalist aesthetic.
- Upgraded `components/vault/MarkdownDrawer.tsx` to utilize `NotionRichEditor` with maximize/restore controls and quick task creation.
- Integrated full-page document editing workflow in `app/vault/page.tsx` with collection assignment, fleet officer tags, word count, reading metrics, and FTS5 search integration.

## Recent Changes
- **Notion-Style Rich Editor Suite (`components/vault/`)**:
  - `MarkdownToolbar.tsx`: Formatting tools for Headings (H1/H2/H3), text styles (Bold, Italic, Strikethrough, Code), lists (Bullet, Numbered, Task Checkbox), callouts/quotes, tables, dividers, links, live word count, reading time, and view mode toggles (`split`, `edit`, `preview`).
  - `RichMarkdownRenderer.tsx`: Full custom markdown preview supporting syntax-highlighted code blocks with copy action, interactive task checkboxes that write back to source content, Notion-style colored callout blocks (`[!NOTE]`, `[!WARNING]`, `[!TIP]`), markdown tables, and inline typography.
  - `NotionRichEditor.tsx`: Core editor container with 500ms debounced autosave to local SQLite, collection and officer assignment, tag management, fullscreen toggling, and split/preview view modes.
- **Vault Page (`app/vault/page.tsx`)**:
  - Upgraded to support seamless full-page document editing when a card is clicked or "Create Doc" is selected.
  - Added return navigation, collection filtering, officer filtering, and FTS5 search jump-to-document.
- **Markdown Drawer (`components/vault/MarkdownDrawer.tsx`)**:
  - Replaced basic textarea with full `NotionRichEditor` integration, maximizing modal height and responsive screen sizing.
- **Global Styles (`app/globals.css`)**:
  - Added custom scrollbar styling and typography classes (`notion-preview`, `notion-callout`).
- **Production Build Validation**:
  - Clean TypeScript verification (`npx tsc --noEmit` - 0 errors).
  - Next.js production build (`pnpm build`) compiled cleanly (exit code 0, 9 static routes generated).

## Invariants Maintained
1. Local-First SQLite storage guarantee (zero cloud database bills, all state stored client-side in IndexedDB/OPFS).
2. Zero unbundled emojis law across all UI elements (all vector Lucide SVG icons).
3. 375px+ responsive mobile touch targets and `pb-safe` drawer layouts.
