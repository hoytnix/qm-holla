# Active Context: Quarkmeme

## Current Focus & Status
- Implemented **Mobile Navigation Theme Architecture**:
  - **Fixed Quick Navbar on Bottom (`components/layout/BottomNav.tsx`)**:
    - Thumb-friendly reach positioned fixed at the bottom on mobile devices (`inset-x-0 bottom-0 z-40 md:hidden`).
    - Strictly **icons-only** with no text labels for tabs.
    - Features the 5 designated tabs: **Canvas** (`/`), **Chat** (`/chat`), **Crew** (`/crew`), **Vault** (`/vault`), and **Settings** (`/settings`).
    - Integrated with Lucide SVG vector icons (`Compass`, `MessageSquare`, `Users`, `Database`, `SlidersHorizontal`), active ambient glow indicators, and unconfigured LLM key warning pulse.
    - Configured safe-area padding for fluid mobile notch handling.
  - **Fixed Top Navbar (`components/layout/Navbar.tsx`)**:
    - Absolute/fixed top positioning (`fixed md:sticky top-0 inset-x-0 z-50`) across mobile viewports.
    - Left-to-right cluster:
      1. **Menu button first** (`/menu` command center launcher).
      2. **Profile Icon button** (`Building2`), which directly opens the interactive Company Profile Switcher dropdown.
      3. **Current Profile Company Name** text pill with dropdown arrow and active indicator.
    - Right-to-left cluster (floating to the right):
      1. **Speak With Ceo button** (`Mic` voice chat trigger launching the `VoiceHelmSheet`), strictly **icons-only**.
      2. **Helm Chat button** (`MessageSquare` link navigating to `/chat`), strictly **icons-only**.
  - **Canvas Core Middle Viewport**:
    - Top and bottom navbars firmly establish boundaries, leaving the entire middle viewport free for the current page and radial knowledge canvas to paint smoothly.
    - Main layout styled with `pb-16 md:pb-0` to guarantee zero overlap with the bottom quick navbar on mobile.

## Recent Changes
- **Mobile Bottom Navigation (`components/layout/BottomNav.tsx`, `app/layout.tsx`)**:
  - Created persistent, icons-only bottom tab bar for Canvas, Chat, Crew, Vault, and Settings.
  - Injected `BottomNav` into `app/layout.tsx` so it is persistently available across all mobile routes.
- **Top Header Redesign (`components/layout/Navbar.tsx`)**:
  - Reordered left items to Menu button -> Profile Switcher Icon -> Active Company Name.
  - Reordered right items to Speak With Ceo (voice chat icon) and Helm Chat (chat icon), with zero text on mobile.
- **Standalone Menu Page (`/menu`) and Navigation Refactor**:
  - Replaced the mobile slide-over/pop-out drawer in `components/layout/Navbar.tsx` with a dedicated, responsive Menu page at `app/menu/page.tsx`.

## Invariants Maintained
1. Local-First SQLite storage guarantee (zero cloud database bills, all company profiles and records persisted in browser OPFS SQLite).
2. Strict LLM gating invariant (LLM test verification required before profile creation or theme selection).
3. Deterministic Canvas & Fallback Seed Law (canvas never renders blank; uses theme-aware fallback).
4. Double-Confirmation Deletion Law (deletion requires 2 steps and typing the exact company name).
5. Zero unbundled emojis law across all UI components (all Lucide SVG vector icons).
6. 375px+ responsive mobile touch targets and clean layout navigation with zero horizontal or vertical scroll leaks.
