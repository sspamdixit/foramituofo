# Monk Radio

A music-discovery web app at **monkradio.xyz** with a cartoon-Buddha mascot. Press load and a song starts playing; Buddha sings the lyrics, hums during instrumental breaks, and the background quietly shifts color in response to both the chat and the song's mood.

## What's in here

A single React + Vite frontend (`artifacts/buddha-chat`) talking to a small Express 5 API (`artifacts/api-server`) inside a pnpm-workspace monorepo.

- **Music** — a hidden YouTube iframe drives audio. Songs auto-advance, you can skip / rewind / scrub, and the player ships with the standard transport (previous · play/pause · next · ±10s).
- **Song discovery** — fully dynamic. The API picks a random artist from a ~150-deep pool spanning hip-hop, pop, classic rock, soul, indie, electronic, country and jazz (Kanye, Hendrix, Lady Gaga, Taylor Swift, The Beatles, Stevie Wonder, Tame Impala, Bad Bunny, Johnny Cash, Nina Simone, …), pulls that artist's catalog of synced-lyric tracks from [lrclib.net](https://lrclib.net), and resolves a YouTube videoId on the fly by scraping the public search results (no API key required). Resolved videoIds are cached in-process so repeat plays of the same track skip the lookup.
- **Lyrics** — pulled from lrclib as standard LRC. A content-aware sync algorithm shows each line from its timestamp until either the next line or an estimated singing duration (so short interjections clear quickly and long held finals stay visible). Per-track manual sync nudges are saved in localStorage.
- **Vibe background** — `useVibe(messages, lyrics)` blends recent chat tone with the current song's lyrics into one of seven palettes (calm / joyful / melancholy / fiery / bliss / deep / chill). Palettes also expose paired *accent* colors (warm vibes get cool accents, cool vibes get warm) which the player progress bar, album-art glow and play-button shadow read via CSS variables — so the player always contrasts whatever the background just turned into.
- **Chat** — when the song is paused, the chat input slides in below the player. Buddha replies stream as Server-Sent Events from `POST /api/chat`, powered by the Replit AI Integration for Gemini (`gemini-2.5-flash` → `gemini-2.5-flash-lite`).
- **Easter eggs** — type `bless` to trigger a screen flash and a hand-drawn lotus talisman card; click Buddha's head for cycled reactions.

## Running locally

Requires Node 24 and pnpm.

```sh
pnpm install
```

Two workflows are configured in this Repl:

- `API Server` — `PORT=8080 pnpm --filter @workspace/api-server run dev`
- `Start application` — `PORT=19984 BASE_PATH=/ pnpm --filter @workspace/buddha-chat run dev`

The web app proxies `/api/*` to the API server. No user-supplied API keys are needed — Gemini is auto-provisioned through the Replit AI Integration.

## Useful commands

```sh
pnpm run typecheck                                   # full monorepo typecheck
pnpm run build                                       # typecheck + build all packages
pnpm --filter @workspace/buddha-chat run dev         # frontend only
pnpm --filter @workspace/api-server run dev          # API only
```

## Layout

```
artifacts/
  buddha-chat/       React + Vite frontend (the whole UI lives here)
    src/
      pages/home.tsx              top-level layout, bubble routing
      components/
        preach-player.tsx         dark-glass bottom player
        vibe-background.tsx       7-palette vibe wash + accent vars
        sketch-bubble.tsx         hand-drawn speech bubble
        buddha-sprite.tsx         Buddha mascot (idle/speaking/blessing/…)
        chat-input.tsx            single-line chat field
        talisman-card.tsx         "bless" easter-egg card
      hooks/
        use-preach-song.ts        YouTube iframe + lyric sync engine
        use-vibe.ts               chat + lyrics → palette
        use-buddha-chat.ts        SSE chat stream consumer
  api-server/        Express 5 API (chat + song picker)
    src/routes/
      chat.ts                     POST /api/chat — Gemini SSE stream
      preach.ts                   GET  /api/preach/song — random song + LRC
```

## Credits

- Created by **Atharv Dixit**
- Inspired by [@daily_buddha_preaching](https://www.instagram.com/daily_buddha_preaching/) and [@yawen.zen](https://www.instagram.com/yawen.zen/)
- Lyrics provided by [lrclib.net](https://lrclib.net), album art via the iTunes Search API, audio via YouTube
