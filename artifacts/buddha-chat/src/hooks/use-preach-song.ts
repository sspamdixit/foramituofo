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
 * usePreachSong — when `enabled`, fetches a random song from /api/preach/song,
 * spins up a hidden YouTube player to play it, and exposes the lyric line
 * that's currently being sung along with playback controls.
 *
 * Lyrics drift fix: the LRC timestamps from lrclib are aligned to the album
 * track, while a YouTube video may have a different intro length. The caller
 * can nudge `syncOffset` (in seconds, ±) via `nudgeSync`; the value is
 * persisted per-videoId in localStorage so it sticks the next play.
 *
 * Tear-down (player destroy + state reset) happens automatically when
 * `enabled` flips back to false.
 */
export function usePreachSong(enabled: boolean) {
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

  // ── Fetch a new song whenever enabled flips on, or skip is called ──
  useEffect(() => {
    if (!enabled) {
      setSong(null);
      setCurrentLine("");
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    fetch("/api/preach/song")
      .then((r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return r.json() as Promise<PreachSong>;
      })
      .then((data) => {
        if (cancelled) return;
        setSong(data);
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

  // ── Spin up YouTube player when we have a song ──
  useEffect(() => {
    if (!enabled || !song) {
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
  }, [enabled, song?.videoId]);

  // ── Lyric sync loop ──
  // A line is considered "currently being sung" only if the playhead is
  // close enough to it. Specifically: it stays visible for up to BREAK_GAP
  // seconds after its timestamp, OR until the next line is within
  // BREAK_GAP seconds. Outside that window we're in an instrumental break
  // (or intro/outro) and currentLine is set to "" so the UI can switch
  // Buddha to the idle sprite and show a music-note in the bubble.
  const BREAK_GAP = 6;
  useEffect(() => {
    if (!enabled || !song) return;
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
        const adjusted = t + syncOffsetRef.current;
        const lines = song.lyrics;
        let active = "";
        for (let i = lines.length - 1; i >= 0; i--) {
          if (adjusted + 0.05 >= lines[i].time) {
            const nextTime = lines[i + 1]?.time ?? Infinity;
            const elapsed = adjusted - lines[i].time;
            const remaining = nextTime - adjusted;
            // Visible while either the line just appeared OR the next line
            // is coming soon. Otherwise we're in a break.
            if (elapsed < BREAK_GAP || remaining < BREAK_GAP) {
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

  return {
    song,
    currentLine,
    status,
    syncOffset,
    currentTime,
    duration,
    skip,
    togglePlay,
    nudgeSync,
    seekTo,
  };
}
