import { useEffect, useRef, useState } from "react";

type LyricLine = { time: number; text: string };

export type PreachSong = {
  title: string;
  artist: string;
  videoId: string;
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
  // Hide off-screen but keep in the layout so YouTube can render the iframe.
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

/**
 * usePreachSong — when `enabled`, fetches a random song from /api/preach/song,
 * spins up a hidden YouTube player to play it, and exposes the lyric line
 * that's currently being sung.
 *
 *   const { song, currentLine, status, skip } = usePreachSong(preachMode);
 *
 * Tear-down (player destroy + state reset) happens automatically when
 * `enabled` flips back to false.
 */
export function usePreachSong(enabled: boolean) {
  const [song, setSong] = useState<PreachSong | null>(null);
  const [currentLine, setCurrentLine] = useState<string>("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "playing" | "error"
  >("idle");
  const [songNonce, setSongNonce] = useState(0);

  const playerRef = useRef<YTPlayer | null>(null);

  // ── Fetch a new song whenever enabled flips on, or when skip is called ──
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
      // Tear down existing player on disable
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
      // YouTube replaces the container element with the iframe; if we already
      // had a player, destroy it first so it doesn't leak.
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          /* ignore */
        }
        playerRef.current = null;
        // Re-create the container since YT removed the previous one
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
          onError: () => {
            // Bad video — bump the nonce to fetch another song
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
  useEffect(() => {
    if (!enabled || !song) return;
    let lastText = "";
    let raf = 0;
    const tick = () => {
      const player = playerRef.current;
      if (player && typeof player.getCurrentTime === "function") {
        let t = 0;
        try {
          t = player.getCurrentTime();
        } catch {
          /* before player ready */
        }
        const lines = song.lyrics;
        let active = "";
        // walk back from the end so we get the most recent line whose
        // timestamp has passed
        for (let i = lines.length - 1; i >= 0; i--) {
          if (t + 0.05 >= lines[i].time) {
            active = lines[i].text;
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

  const skip = () => setSongNonce((n) => n + 1);

  return { song, currentLine, status, skip };
}
