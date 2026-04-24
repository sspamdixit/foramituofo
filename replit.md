# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Artifacts

- **buddha-chat** (`/`) — Buddha Chat single-page web app. Centered cartoon Buddha sprite with PNGs in `artifacts/buddha-chat/public/` (`idle`, `thinking`, `speaking`, `blessing`, `refusing`, plus `bubble.png` and `bg-tile.png`). Chat is wired to the API server (`POST /api/chat`) which streams Gemini responses (model: `gemini-2.5-flash`, fallback `gemini-2.5-flash-lite`) as SSE. The `useBuddhaChat` hook consumes the SSE stream and updates the buddha message text incrementally; the speech bubble component runs a fixed-rate typewriter that "chases" the streaming text. Safety blocks from Gemini are surfaced as a `refused` event and switch the sprite to the `refusing` pose with a fixed line.
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
