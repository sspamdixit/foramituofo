# Monk Radio

A music-discovery web app at **monkradio.xyz** with a cartoon-Buddha mascot. Tap the greeting, a song starts playing, Buddha sings the lyrics, hums during instrumental breaks, and the background quietly shifts color in response to both the chat and the song's mood.

## What's in here

A single React + Vite frontend (`artifacts/buddha-chat`) talking to a small Express 5 API (`artifacts/api-server`) inside a pnpm-workspace monorepo. TypeScript end to end. No user-supplied keys — Gemini is auto-provisioned through the Replit AI Integration.

## How a session unfolds

1. **The page loads behind a blur.** A full-screen `GreetingOverlay` covers everything with a "Monk Radio · a moment of music, a slice of stillness · Begin" card. Tapping anywhere dismisses it. This serves two purposes: it sets a calm intentional entrance, and it satisfies every browser's autoplay policy by ensuring the YouTube player is created from inside a real user gesture.
2. **Three things happen in the background while the overlay is visible:**
   - The first song's metadata is pre-fetched (`GET /api/preach/song`), so by the time you tap, lyrics + album art + videoId are already in memory.
   - The YouTube iframe API (`youtube.com/iframe_api`) is pre-warmed, so player creation after the tap is synchronous instead of waiting on a cold script load.
   - The vibe palette is initialised at "calm".
3. **You tap Begin.** The overlay fades, the YT iframe spins up the video muted-then-unmuted at volume 70, the player commits to "playing", lyrics start scrolling in time with the audio, and the vibe wash slowly shifts to match.
4. **Music is always on by default.** While a song plays, the only on-screen text is the lyric currently being sung — the chat input is hidden and idle thoughts / click reactions are suppressed. Pause the player and the chat input slides in below it; talk to Buddha without losing the now-playing context. Press play to go back.

## Features

- **Music transport** — full standard-app controls in `PreachPlayer`: sync popover · −10s (md+) · previous · play/pause · next · +10s (md+). Progress bar is scrubbable. `usePreachSong` keeps a 20-deep history stack so `previous()` rewinds the current track if `currentTime > 3s`, otherwise pops back to the last song that played. Songs auto-advance on end and on player error.
- **Song discovery** — fully dynamic, no curated track list. The API picks a random artist from a ~150-deep pool spanning hip-hop, pop, classic rock, soul, R&B, indie, electronic, country, jazz and global (Kanye, Hendrix, Lady Gaga, Taylor Swift, The Beatles, Stevie Wonder, Tame Impala, Bad Bunny, Johnny Cash, Nina Simone, Fela Kuti, Rosalía, …), pulls that artist's catalog of synced-lyric tracks from [lrclib.net](https://lrclib.net) with a loose-normalized artist filter (so "Kanye West" doesn't return "Nicki Minaj feat. Kanye"), then resolves a YouTube `videoId` on the fly by scraping `youtube.com/results?search_query=…` (no API key — sets `Cookie: CONSENT=YES+1` to skip the EU consent interstitial). Resolved `videoId`s are cached in-process keyed by `<norm(artist)>::<norm(title)>` so repeat plays skip the YouTube round-trip. Up to 6 artist × 4 track attempts before giving up with a 503.
- **Lyrics** — pulled as standard `[mm:ss.xx]` LRC. A content-aware sync algorithm shows each line from `line.time` until `min(nextLine.time, line.time + estimateDuration(text))` where `estimateDuration ≈ words × 0.42s` clamped 1.6–9s — so short interjections clear quickly and long held finals stay visible. Plus an 80ms preroll so lines land on the syllable, not just after it. Genuine instrumental gaps yield to a hand-drawn music-note "humming" bubble. Per-`videoId` manual `syncOffset` is editable through a small popover and persisted in `localStorage`, so any track whose YouTube intro length differs from the album version stays nudged the next time it plays.
- **Vibe-reactive background** — `useVibe(messages, lyrics)` blends recent chat tone with the current song's lyrics (lyrics weighted at 0.35 per keyword to avoid drowning out chat) into one of seven palettes: `calm` / `joyful` / `melancholy` / `fiery` / `bliss` / `deep` / `chill`. Transitions are smooth.
- **Vibe-aware accent contrast** — every palette also exposes paired *accent* colors (warm vibes get cool accents; cool vibes get warm). `home.tsx` writes them to `--vibe-accent` / `--vibe-accent-2` CSS variables on the wrapper. The player progress gradient, album-art glow, sync-offset chip, and play-button shadow all read from those vars, so the player always contrasts whatever the background just turned into. Chat input + footer text use a sibling `--vibe-text` var for the same reason.
- **Chat** — when the song is paused, `ChatInput` slides in below the player. Buddha replies stream as Server-Sent Events from `POST /api/chat`, powered by the Replit AI Integration for Gemini. Personality is "The Chillest Monk" — modern slang plus genuine wisdom. System prompt lives in `artifacts/api-server/src/routes/chat.ts`. Safety blocks from Gemini surface as a `refused` event and switch the sprite to the `refusing` pose.
- **Buddha sprite** — five PNGs in `public/`: `idle`, `thinking`, `speaking`, `blessing`, `refusing`. While music plays, the sprite mirrors the audio: `speaking` while singing, `idle` while humming. While paused / no song, the full chat sprite logic takes over.
- **Click reactions** — Buddha's head has an invisible `<button>` hit-area (top 38% of the sprite). Each click cycles `HEAD_REACTIONS` and pushes a temporary state via `setBuddhaStateOverride(state, holdMs)`. While music is playing the sprite still acknowledges the poke, but no text bubble appears.
- **Idle thoughts** — when the chat is silent for ~20 seconds (and music isn't playing), Buddha drops a one-liner from `IDLE_LINES` into a sketch bubble for 5 seconds before clearing.
- **`bless` easter egg** — any user message matching `/\bbless\b/i` triggers a 2-second `blessing` pose, a screen-wide `.bless-flash` radial wash, then renders `TalismanCard` — a centered hand-drawn SVG card with an 8-petal lotus mandala and a randomized blessing line. Tap anywhere to dismiss.

## Architecture

### Frontend — `artifacts/buddha-chat` (port 19984 in dev)

React 19 + Vite 7 + TypeScript + Tailwind. Framer Motion for transitions. `lucide-react` for icons. `roughjs` for the hand-drawn sketch shapes.

```
src/
  pages/home.tsx                top-level layout + bubble routing + greeting gating
  components/
    greeting-overlay.tsx        full-screen blur + tap-to-begin gate
    preach-player.tsx           dark-glass bottom player (transport + progress + sync popover)
    vibe-background.tsx         7-palette vibe wash, exposes accent helpers
    sketch-bubble.tsx           rough.js hand-drawn speech bubble with tail
    buddha-sprite.tsx           5-pose Buddha mascot + invisible head hit-area
    chat-input.tsx              single-line chat field
    talisman-card.tsx           "bless" easter-egg lotus card
  hooks/
    use-preach-song.ts          YouTube iframe wrapper + lyric sync engine + transport
    use-vibe.ts                 chat tone + lyric keywords → palette
    use-buddha-chat.ts          SSE chat-stream consumer
    use-typewriter.ts           character-streaming text effect for bubbles
  lib/
    sound.ts                    tiny WebAudio chime for UI feedback
    utils.ts                    `cn()` + small helpers
```

The `usePreachSong(enabled, started)` hook splits its lifecycle in two:
- `enabled` (always `true` here) controls the song-metadata fetch — runs immediately on mount so the first track is ready while the greeting overlay is still up.
- `started` (flips `true` only when the greeting is dismissed) gates the actual YT player creation, ensuring it's instantiated from inside the user-gesture stack.

### API — `artifacts/api-server` (port 8080 in dev)

Express 5 + Pino logging. Three routes:

- `GET /api/healthz` — liveness probe.
- `POST /api/chat` — streams Gemini replies as SSE. Uses the Replit AI Integration env vars (`AI_INTEGRATIONS_GEMINI_API_KEY`, `AI_INTEGRATIONS_GEMINI_BASE_URL`, both auto-provisioned) via `@google/genai`. Model chain: `gemini-2.5-flash` → `gemini-2.5-flash-lite` fallback. Events: `{type:"delta",text}`, `{type:"done"}`, `{type:"refused"}`, `{type:"error"}`.
- `GET /api/preach/song` — returns `{ title, artist, videoId, artworkUrl, lyrics: [{time, text}, …] }`. Implementation pipeline: random artist → lrclib search filtered to synced-lyric tracks for that artist → random track pick → YouTube scrape for videoId (cached per song) → iTunes Search API for 600×600 album art → LRC parse to timestamped lines.

```
src/
  index.ts                      express bootstrap, /api router, pino logging
  routes/
    healthz.ts
    chat.ts                     Gemini SSE proxy + system prompt
    preach.ts                   ARTISTS pool + lrclib + YT scrape + iTunes art
```

## Running locally

Requires Node 24 and pnpm.

```sh
pnpm install
```

Two workflows are configured in this Repl and start automatically:

- **API Server** — `PORT=8080 pnpm --filter @workspace/api-server run dev`
- **Start application** — `PORT=19984 BASE_PATH=/ pnpm --filter @workspace/buddha-chat run dev`

The web app proxies `/api/*` to the API server, so `localhost:19984` is the only port you ever need to open.

## Useful commands

```sh
pnpm run typecheck                                   # full monorepo typecheck
pnpm run build                                       # typecheck + build all packages
pnpm --filter @workspace/buddha-chat exec tsc --noEmit
pnpm --filter @workspace/buddha-chat run dev         # frontend only
pnpm --filter @workspace/api-server run dev          # API only
```

## Adding more songs

Just push artist names onto the `ARTISTS` array in `artifacts/api-server/src/routes/preach.ts`. The picker takes care of the rest — as long as the artist has tracks with synced lyrics on lrclib.net, they'll start showing up. No videoId list to maintain, no manual lyric upload, no metadata files to keep in sync.

## Credits

- Created by **Atharv Dixit**
- Inspired by [@daily_buddha_preaching](https://www.instagram.com/daily_buddha_preaching/) and [@yawen.zen](https://www.instagram.com/yawen.zen/)
- Lyrics provided by [lrclib.net](https://lrclib.net), album art via the iTunes Search API, audio via YouTube
- Built on [Replit](https://replit.com)
