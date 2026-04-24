# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Artifacts

- **buddha-chat** (`/`) — Monk Radio single-page web app (monkradio.xyz). Music-discovery first: a song auto-plays on load and Buddha sings/hums the lyrics. The cartoon Buddha sprite (PNGs in `artifacts/buddha-chat/public/`: `idle`, `thinking`, `speaking`, `blessing`, `refusing`, plus `bg-tile.png`, `fonts/Pencil.ttf`) is the centered visual anchor.
  - **Music is always on**: `usePreachSong(true)` is wired permanently in `home.tsx`. The `PreachPlayer` is pinned to the bottom and a hidden YouTube iframe drives audio. Songs auto-advance on end / on error.
  - **Vibe background** (`VibeBackground`): the only background. Hue is computed by `useVibe(messages, musicText)` which blends recent chat tone with the lyrics of the current song (lyrics weighted at 0.35 per keyword to avoid drowning out chat). Palettes: calm / joyful / melancholy / fiery / bliss / deep / chill.
  - **Bubble routing** while music is playing: ONLY the lyric line currently being sung (or a hand-drawn music-note "humming" bubble during instrumental breaks) is shown. Idle thoughts, click reactions, and Buddha's chat replies are all suppressed. The buddha sprite mirrors the audio: `speaking` while singing, `idle` while humming.
  - **Bubble routing** while music is paused (or no song yet): full chat experience returns — click reactions, 20s idle thoughts (auto-clear after 5s), and streamed Buddha replies via the latest-message bubble.
  - **Bottom area**: `PreachPlayer` is always visible. When `preachStatus !== "playing"` (paused / loading / error / idle) the `ChatInput` slides in BELOW the player so the user can talk to Buddha without losing the now-playing context. Pressing play hides the input again.
  - **Player transport**: full music-app controls — sync popover · −10s (md+) · previous · play/pause · next · +10s (md+). `usePreachSong` keeps a 20-deep history stack so `previous()` rewinds the current track if `currentTime > 3s`, otherwise pops back to the last-played song. Progress bar is scrubbable.
  - **Vibe-aware accents**: each `VibePalette` exposes `accent` / `accent2` (warm palettes get cool accents, cool palettes get warm) → `home.tsx` writes them to `--vibe-accent` / `--vibe-accent-2` CSS vars on the wrapper. The player progress gradient, album-art glow, sync-offset chip, and play-button shadow all read from these so they always contrast the current background.
  - **Lyric algorithm** (`use-preach-song.ts`): content-aware — each LRC line is shown from `line.time` until `min(nextLine.time, line.time + estimateDuration(text))`, where `estimateDuration` uses ~0.42s/word clamped 1.6–9s. Plus an 80ms PREROLL so bubbles land on the syllable, not after it. Genuine instrumental gaps yield to the humming bubble. Per-`videoId` manual `syncOffset` (in localStorage) is still respected for any track whose YouTube intro length differs from the album version.
  - **Click reactions**: Buddha's head has an invisible `<button>` hit-area (top 38% of sprite) inside `BuddhaSprite`. Each click cycles `HEAD_REACTIONS` and pushes a temporary state via `setBuddhaStateOverride(state, holdMs)`. While music plays the sprite still acknowledges the poke but no text bubble appears.
  - **"bless" easter egg**: any user message matching `/\bbless\b/i` triggers a 2s `blessing` pose, a screen-wide `.bless-flash` radial wash, then renders `TalismanCard` — a centered hand-drawn SVG card with an 8-petal lotus mandala and a randomized blessing line. Tap anywhere to dismiss.
  - **Personality** ("The Chillest Monk"): Modern slang + deep wisdom. System prompt lives in `artifacts/api-server/src/routes/chat.ts`.
  - Chat is wired to `POST /api/chat`. The `useBuddhaChat` hook consumes the SSE stream incrementally; safety blocks from Gemini surface as a `refused` event and switch the sprite to the `refusing` pose.
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
