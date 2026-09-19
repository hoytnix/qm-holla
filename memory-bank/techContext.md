# Tech Context: Quarkmeme

## Technology Stack
- **Framework**: Next.js App Router (v16.3.5) with React 19 (`react: ^19.3.0`, `react-dom: ^19.3.0`)
- **Language**: TypeScript (`~5.8.2`)
- **Styling**: Tailwind CSS (`^3.4.19`), PostCSS, Autoprefixer
- **UI & Motion**: Lucide React (`lucide-react: ^0.546.0`), Framer Motion (`framer-motion: ^12.34.3`, `motion: ^12.23.24`)
- **Database / Local Storage**: `@sqlite.org/sqlite-wasm: 3.53.4-build1` running in Web Worker (`workers/db.worker.ts`) via OPFS
- **AI & LLM Integration**: Vercel AI SDK (`ai: ^6.0.97`, `@ai-sdk/openai`, `@ai-sdk/react`), `@google/genai: ^1.29.0`
- **Rich Text / Editors**: `@tiptap/core`, `@tiptap/react`, `novel`
- **Package Manager**: `pnpm` strictly (workspace configured in `pnpm-workspace.yaml`)

## Constraints & Environment Rules
- **Package Manager Rule**: Strictly `pnpm`. Never execute `npm` or `yarn`.
- **Typecheck Script Rule**: package.json has `"lint": "tsc --noEmit"`. ALWAYS execute `npx tsc --noEmit` for typechecking. Never call `pnpm run typecheck` or `npm run typecheck`.
- **Build Execution Rule**: Next.js webpack build (`pnpm build`). Builds take ~30 seconds; configure `WaitMsBeforeAsync: 10000` and do not poll in tight 1s loops.
- **Security Headers Invariant**: `next.config.ts` must maintain `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers for OPFS Web Worker synchronization.
- **Proxy Serving Invariant**: `public/sqlite/sqlite3-opfs-async-proxy.js` must remain accessible as a static asset without bundler hashing or interference.
- **Vector Icons Only**: No unbundled unicode emojis in UI. Bundled vector icons from `lucide-react` with explicit sizing are mandated.
