import { useCallback, useEffect, useRef, useState } from "react";

type LyricLine = { time: number; text: string };

export type PreachSong = {
  title: string;
  artist: string;
  videoId: string;
  artworkUrl: string | null;
  lyrics: LyricLine[];
};

// ─── YouTube IFrame API loader (singleton) ────────────────────────────
type YT = {
  Player: new (
    elementOrId: string | HTMLElement,
    options: Record<string, unknown>,
  ) => YTPlayer;
};
type YTPlayer = {
  destroy: () => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setVolume: (v: number) => void;
};

let ytApiPromise: Promise<YT> | null = null;
function loadYouTubeApi(): Promise<YT> {
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const w = window as unknown as { YT?: YT; onYouTubeIframeAPIReady?: () => void };
    if (w.YT && w.YT.Player) {
      resolve(w.YT);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    if (!existing) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
    w.onYouTubeIframeAPIReady = () => {
      if (w.YT) resolve(w.YT);
    };
  });
  return ytApiPromise;
}

const PLAYER_CONTAINER_ID = "buddha-preach-yt-player";

function ensureContainer(): HTMLDivElement {
  let el = document.getElementById(PLAYER_CONTAINER_ID) as HTMLDivElement | null;
  if (el) return el;
  el = document.createElement("div");
  el.id = PLAYER_CONTAINER_ID;
  Object.assign(el.style, {
    position: "fixed",
    top: "-9999px",
    left: "-9999px",
    width: "1px",
    height: "1px",
    pointerEvents: "none",
    opacity: "0",
  } as Partial<CSSStyleDeclaration>);
  document.body.appendChild(el);
  return el;
}

const SYNC_OFFSET_KEY_PREFIX = "buddha-preach-sync-offset:";
function loadOffset(videoId: string): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(SYNC_OFFSET_KEY_PREFIX + videoId);
  const n = raw ? parseFloat(raw) : 0;
  return Number.isFinite(n) ? n : 0;
}
function saveOffset(videoId: string, offset: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SYNC_OFFSET_KEY_PREFIX + videoId, String(offset));
}

/**
 * usePreachSong — when `enabled`, fetches a random song from /api/preach/song
 * and pre-loads its lyrics + metadata. When `started` is also true, spins
 * up a hidden YouTube player and begins audio playback.
 *
 * The split lets a caller pre-fetch the first song (lyrics, art, videoId)
 * during a "click to begin" greeting overlay, so audio starts almost
 * instantly the moment the user taps to enter — and the YT player itself
 * is only created from inside the user-gesture handler, satisfying every
 * browser's autoplay policy without us having to do anything else.
 *
 * `started` defaults to `true` so existing call sites that don't gate on
 * a user gesture keep their current behavior.
 *
 * Lyrics drift fix: the LRC timestamps from lrclib are aligned to the album
 * track, while a YouTube video may have a different intro length. The caller
 * can nudge `syncOffset` (in seconds, ±) via `nudgeSync`; the value is
 * persisted per-videoId in localStorage so it sticks the next play.
 *
 * Tear-down (player destroy + state reset) happens automatically when
 * `enabled` flips back to false.
 */
export function usePreachSong(enabled: boolean, started: boolean = true) {
  const [song, setSong] = useState<PreachSong | null>(null);
  const [currentLine, setCurrentLine] = useState<string>("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "playing" | "paused" | "error"
  >("idle");
  const [songNonce, setSongNonce] = useState(0);
  const [syncOffset, setSyncOffset] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const playerRef = useRef<YTPlayer | null>(null);
  // Keep current syncOffset accessible inside the rAF loop without re-binding it
  const syncOffsetRef = useRef(0);
  syncOffsetRef.current = syncOffset;

  // History stack of previously played songs so the "previous" transport
  // can step back through what just played. Capped to keep memory bounded.
  const historyRef = useRef<PreachSong[]>([]);
  const HISTORY_MAX = 20;
  // When set, the next song-fetch effect skips the network and uses this
  // exact song instead. This is how `previous()` rewinds without hitting
  // the API (and without repicking a random new song).
  const queuedSongRef = useRef<PreachSong | null>(null);

  // ── Fetch a new song whenever enabled flips on, or skip is called ──
  useEffect(() => {
    if (!enabled) {
      setSong(null);
      setCurrentLine("");
      setStatus("idle");
      historyRef.current = [];
      queuedSongRef.current = null;
      return;
    }
    let cancelled = false;

    // If `previous()` queued a specific song, use it directly.
    const queued = queuedSongRef.current;
    if (queued) {
      queuedSongRef.current = null;
      setSong(queued);
      setCurrentLine("");
      setCurrentTime(0);
      setDuration(0);
      setSyncOffset(loadOffset(queued.videoId));
      return;
    }

    setStatus("loading");
    fetch("/api/preach/song")
      .then((r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return r.json() as Promise<PreachSong>;
      })
      .then((data) => {
        if (cancelled) return;
        // Push the song that was just playing onto history before swapping.
        setSong((prev) => {
          if (prev && prev.videoId !== data.videoId) {
            historyRef.current = [
              ...historyRef.current.slice(-(HISTORY_MAX - 1)),
              prev,
            ];
          }
          return data;
        });
        setCurrentLine("");
        setCurrentTime(0);
        setDuration(0);
        setSyncOffset(loadOffset(data.videoId));
      })
      .catch((err) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn("[preach] fetch song failed:", err);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, songNonce]);

  // ── Spin up YouTube player when we have a song AND user has started ──
  // We deliberately wait for `started` so the YT.Player gets created from
  // inside the user-gesture stack of a real click handler — that's what
  // satisfies browser autoplay policies. Without this gate, a fresh page
  // load would create the player, hit a silent autoplay block, surface as
  // a YT error, and our error handler would spin trying new songs forever.
  useEffect(() => {
    if (!enabled || !started || !song) {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          /* ignore */
        }
        playerRef.current = null;
      }
      return;
    }
    let cancelled = false;
    let createdPlayer: YTPlayer | null = null;

    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      ensureContainer();
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          /* ignore */
        }
        playerRef.current = null;
        ensureContainer();
      }

      createdPlayer = new YT.Player(PLAYER_CONTAINER_ID, {
        videoId: song.videoId,
        width: "1",
        height: "1",
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            try {
              e.target.setVolume(70);
              e.target.playVideo();
              setStatus("playing");
            } catch {
              /* ignore */
            }
          },
          onStateChange: (e: { data: number }) => {
            // YT.PlayerState: -1 unstarted, 0 ended, 1 playing, 2 paused,
            // 3 buffering, 5 cued
            if (e.data === 1) setStatus("playing");
            else if (e.data === 2) setStatus("paused");
            else if (e.data === 0) {
              // Ended → next song
              setSongNonce((n) => n + 1);
            }
          },
          onError: () => {
            // eslint-disable-next-line no-console
            console.warn("[preach] YT error, picking another song");
            setSongNonce((n) => n + 1);
          },
        },
      });
      playerRef.current = createdPlayer;
    });

    return () => {
      cancelled = true;
      if (createdPlayer) {
        try {
          createdPlayer.destroy();
        } catch {
          /* ignore */
        }
      }
      if (playerRef.current === createdPlayer) {
        playerRef.current = null;
      }
    };
  }, [enabled, started, song?.videoId]);

  // ── Lyric sync loop ──
  // Content-aware alignment: a line is the "current line" from its
  // timestamp until either the next line starts OR an estimated singing
  // duration (based on word count) elapses — whichever comes first.
  //
  // Why this matches the music more exactly than a fixed cutoff:
  //   • Short interjections ("Oh!") clear quickly so we don't appear to
  //     hold an empty syllable through the next 4 seconds of music.
  //   • Long held finals ("hey jude…") stay visible the whole time the
  //     vocalist is on that line, instead of vanishing after 6s.
  //   • Genuine instrumental breaks (gap > estimated duration) yield to
  //     the humming bubble so it's clear no one is singing right now.
  //
  // We also lead each line by a small PREROLL so the bubble appears at
  // the same rAF frame the syllable is hit, not 50–100ms late.
  const PREROLL = 0.08; // seconds — show the line slightly early
  const MIN_LINE_DURATION = 1.6; // very short line still gets this much air
  const MAX_LINE_DURATION = 9.0; // never hold a line past this
  const SECONDS_PER_WORD = 0.42;

  /** Estimate how long a vocalist will spend on a given lyric line. */
  function estimateDuration(text: string): number {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const raw = words * SECONDS_PER_WORD + 0.4; // +0.4 for the line's tail
    return Math.max(MIN_LINE_DURATION, Math.min(MAX_LINE_DURATION, raw));
  }

  useEffect(() => {
    if (!enabled || !song) return;
    // Pre-compute each line's effective end time so the rAF tick is O(1)
    // instead of recomputing word counts every frame.
    const lines = song.lyrics;
    const ends: number[] = lines.map((l, i) => {
      const nextStart = lines[i + 1]?.time ?? l.time + estimateDuration(l.text);
      const estEnd = l.time + estimateDuration(l.text);
      return Math.min(nextStart, estEnd);
    });

    let lastText = "";
    let lastTimeUpdate = 0;
    let raf = 0;
    const tick = () => {
      const player = playerRef.current;
      if (player && typeof player.getCurrentTime === "function") {
        let t = 0;
        let d = 0;
        try {
          t = player.getCurrentTime();
          if (typeof player.getDuration === "function") {
            d = player.getDuration();
          }
        } catch {
          /* ignore */
        }
        // Throttle progress updates to ~5 Hz so we don't thrash React.
        const now = performance.now();
        if (now - lastTimeUpdate > 200) {
          lastTimeUpdate = now;
          setCurrentTime(t);
          if (d > 0) setDuration(d);
        }
        const adjusted = t + syncOffsetRef.current + PREROLL;

        // Find the latest line whose start has passed. If we're still
        // within that line's effective end, that's the active line;
        // otherwise we're in an instrumental gap → empty string.
        let active = "";
        for (let i = lines.length - 1; i >= 0; i--) {
          if (adjusted >= lines[i].time) {
            if (adjusted < ends[i]) {
              active = lines[i].text;
            }
            break;
          }
        }
        if (active !== lastText) {
          lastText = active;
          setCurrentLine(active);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, song]);

  const skip = useCallback(() => setSongNonce((n) => n + 1), []);

  /** Skip-back transport. If we're more than ~3s into the current track,
   *  rewind to the start (matches every standard music app's behavior).
   *  Otherwise, pop the most recently played song off history and play
   *  that instead. With an empty history, this falls through to a no-op
   *  rewind so the button never feels dead. */
  const previous = useCallback(() => {
    const p = playerRef.current;
    let t = 0;
    try {
      if (p && typeof p.getCurrentTime === "function") t = p.getCurrentTime();
    } catch {
      /* ignore */
    }
    if (t > 3 || historyRef.current.length === 0) {
      if (p && typeof p.seekTo === "function") {
        try {
          p.seekTo(0, true);
          setCurrentTime(0);
        } catch {
          /* ignore */
        }
      }
      return;
    }
    const prevSong = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    queuedSongRef.current = prevSong;
    setSongNonce((n) => n + 1);
  }, []);

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      if (status === "playing") p.pauseVideo();
      else p.playVideo();
    } catch {
      /* ignore */
    }
  }, [status]);

  const nudgeSync = useCallback(
    (delta: number) => {
      setSyncOffset((cur) => {
        const next = Math.max(-10, Math.min(10, cur + delta));
        if (song) saveOffset(song.videoId, next);
        return next;
      });
    },
    [song],
  );

  const seekTo = useCallback((seconds: number) => {
    const p = playerRef.current;
    if (!p || typeof p.seekTo !== "function") return;
    try {
      p.seekTo(Math.max(0, seconds), true);
      setCurrentTime(Math.max(0, seconds));
    } catch {
      /* ignore */
    }
  }, []);

  /** Jump forward / backward by a relative number of seconds, clamped to
   *  the song's duration. Used by the ±10s transport buttons. */
  const seekBy = useCallback((delta: number) => {
    const p = playerRef.current;
    if (!p || typeof p.seekTo !== "function") return;
    try {
      const cur =
        typeof p.getCurrentTime === "function" ? p.getCurrentTime() : 0;
      const dur =
        typeof p.getDuration === "function" ? p.getDuration() : Infinity;
      const next = Math.max(0, Math.min(dur || Infinity, cur + delta));
      p.seekTo(next, true);
      setCurrentTime(next);
    } catch {
      /* ignore */
    }
  }, []);

  return {
    song,
    currentLine,
    status,
    syncOffset,
    currentTime,
    duration,
    skip,
    previous,
    togglePlay,
    nudgeSync,
    seekTo,
    seekBy,
  };
}
