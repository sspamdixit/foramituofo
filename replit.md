# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Artifacts

- **buddha-chat** (`/`) — Buddha Chat single-page web app. Cartoon Buddha sprite with PNGs in `artifacts/buddha-chat/public/` (`idle`, `thinking`, `speaking`, `blessing`, `refusing`, plus `bg-tile.png`, `fonts/Pencil.ttf`).
  - **Layout**: 60/40 split — chat column on the LEFT (60%), Buddha sprite on the RIGHT (40%), input pinned inside the chat column. Stacks on mobile (Buddha small strip on top, chat below). Page is locked to `h-[100dvh]` with min-h-0 flex chains so only the message list scrolls. Uses tiled `bg-tile.png` background.
  - **Chat bubbles**: All Buddha replies render as comic SVG `ComicBubble` (mood `speak`, hand-drawn Pencil font) left-aligned in the list. User messages render as soft pastel `.user-bubble` rounded boxes right-aligned. Only the most recent Buddha message uses a 28ms/char typewriter via `useTypewriter` hook in `chat-message-list.tsx`.
  - **Buddha sprite**: Has a `buddha-breathe` CSS animation (subtle scale on Y), a Framer-motion bobbing wrapper, and during `state==="speaking"` toggles between `idle.png` and `speaking.png` every 250ms to fake mouth movement. Aura behind sprite changes color/intensity based on state and preach mode.
  - **Preach mode**: `LotusToggle` button (top-right, hand-drawn lotus SVG) toggles `preachMode` state in `home.tsx`. When ON: page background switches to `.preach-bg` sunset gradient, Buddha gets `buddha-halo` golden drop-shadow filter and a warm amber aura, and `playPreachMusic(active)` is called as a stub for future YouTube/Spotify integration.
  - Chat is wired to the API server (`POST /api/chat`) which streams Gemini responses (model: `gemini-2.5-flash`, fallback `gemini-2.5-flash-lite`) as SSE. The `useBuddhaChat` hook consumes the SSE stream and updates the buddha message text incrementally; `buddhaState` stays `"speaking"` long enough for the typewriter to finish via `settleMs`. Safety blocks from Gemini surface as a `refused` event and switch the sprite to the `refusing` pose with a fixed line.
- **api-server** (`/api`) — Express 5. Routes: `GET /api/healthz`, `POST /api/chat`. Chat endpoint requires `GEMINI_API_KEY` secret and proxies a streaming Gemini call back to the client as SSE (`{type:"delta",text}`, `{type:"done"}`, `{type:"refused"}`, `{type:"error"}`).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
