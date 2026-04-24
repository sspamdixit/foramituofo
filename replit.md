# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Artifacts

- **buddha-chat** (`/`) — Buddha Chat single-page web app. Cartoon Buddha sprite with PNGs in `artifacts/buddha-chat/public/` (`idle`, `thinking`, `speaking`, `blessing`, `refusing`, plus `bg-tile.png`, `fonts/Pencil.ttf`).
  - **Layout**: Buddha sprite is the centered visual anchor (`xl` size, vmin-scaled). The hand-drawn `SketchBubble` floats absolutely above his head (`bottom: 88%`) like a thought, with the tail tip aligned to his vertical axis. The minimal single-line `ChatInput` is pinned bottom-center.
  - **Personality** ("The Chillest Monk"): Modern slang ("bro", "vibe", "canon event") + deep wisdom. System prompt lives in `artifacts/api-server/src/routes/chat.ts`.
  - **Bubble priority** (in `home.tsx`): override bubble (click reaction or idle thought) > latest Buddha message. While the user is typing a NEW message, the chat bubble dissolves immediately. Idle bubbles fire after 20s of silence and auto-clear after 5s.
  - **Click reactions**: Buddha's head has an invisible `<button>` hit-area (top 38% of sprite) inside `BuddhaSprite`. Each click cycles `HEAD_REACTIONS` and pushes a temporary state via `setBuddhaStateOverride(state, holdMs)` exposed by `useBuddhaChat`.
  - **Hover halo**: `BuddhaSprite` tracks local `hovering` state. When hovering, the halo scales/pulses brighter and the sprite gets a `.buddha-hover-glow` drop-shadow.
  - **Preach mode**: `LotusToggle` (top-right). When ON: full-screen sunset gradient overlay with vibrating riso grain, golden `buddha-halo` filter on the sprite, and a 0.9s vertical bounce loop on the sprite (motion `y: [0,-3,0,2,0]`).
  - **"bless" easter egg**: any user message matching `/\bbless\b/i` triggers a 2s `blessing` pose, a screen-wide `.bless-flash` radial wash, then renders `TalismanCard` — a centered hand-drawn SVG card with an 8-petal lotus mandala and a randomized blessing line. Tap anywhere to dismiss. The triggering message is still sent to the model normally.
  - Chat is wired to `POST /api/chat`. The `useBuddhaChat` hook consumes the SSE stream and updates the buddha message text incrementally; `buddhaState` settles back to `idle` via an internal timeout. Safety blocks from Gemini surface as a `refused` event and switch the sprite to the `refusing` pose.
- **api-server** (`/api`) — Express 5. Routes: `GET /api/healthz`, `POST /api/chat`. Chat endpoint uses Replit AI Integrations for Gemini (`AI_INTEGRATIONS_GEMINI_API_KEY` + `AI_INTEGRATIONS_GEMINI_BASE_URL`, auto-provisioned — no user-supplied key) via the `@google/genai` SDK, model chain `gemini-2.5-flash` → `gemini-2.5-flash-lite`. Streams as SSE (`{type:"delta",text}`, `{type:"done"}`, `{type:"refused"}`, `{type:"error"}`).

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
