import { useCallback, useEffect, useRef, useState } from "react";

type LyricLine = { time: number; text: string };

export type PreachSong = {
  title: string;
  artist: string;
  videoId: string;     // YouTube ID — used as localStorage key for sync offset
  duration: number;    // seconds, from the server (Lavalink)
  artworkUrl: string | null;
  lyrics: LyricLine[];
};

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
 * (track resolved via Lavalink public nodes) and pre-loads lyrics + metadata.
 * When `started` is also true, creates an HTML5 <audio> element that streams
 * audio from /api/preach/stream/:videoId — a server-side proxy that resolves
 * the direct YouTube audio URL via @distube/ytdl-core and forwards byte-range
 * requests, giving the browser full native seeking support.
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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const syncOffsetRef = useRef(0);
  syncOffsetRef.current = syncOffset;

  // Song history for the "previous" transport button
  const historyRef = useRef<PreachSong[]>([]);
  const HISTORY_MAX = 20;
  const queuedSongRef = useRef<PreachSong | null>(null);
  // Pre-fetched queue: keep 2 songs ahead for instant double-skip
  const prefetchQueueRef = useRef<PreachSong[]>([]);
  // Abort controller for pre-fetch requests
  const prefetchAbortRef = useRef<AbortController | null>(null);
  // Track count of pre-fetches in flight to avoid over-fetching
  const prefetchCountRef = useRef(0);

  // ── Pre-fetch songs to maintain a queue of 2 ahead ─────────────────────────────
  const startPrefetch = useCallback(() => {
    if (!enabled || prefetchCountRef.current >= 2) return;
    const needed = 2 - prefetchQueueRef.current.length;
    if (needed <= 0) return;

    for (let i = 0; i < needed; i++) {
      prefetchCountRef.current++;
      fetch("/api/preach/song")
        .then((r) => {
          if (!r.ok) throw new Error(`status ${r.status}`);
          return r.json() as Promise<PreachSong>;
        })
        .then((data) => {
          prefetchQueueRef.current.push(data);
        })
        .catch(() => {
          // Pre-fetch failure is silent
        })
        .finally(() => {
          prefetchCountRef.current--;
        });
    }
  }, [enabled]);

  // ── Fetch a new song whenever enabled flips on, or skip is called ──
  useEffect(() => {
    if (!enabled) {
      setSong(null);
      setCurrentLine("");
      setStatus("idle");
      setCurrentTime(0);
      setDuration(0);
      historyRef.current = [];
      queuedSongRef.current = null;
      prefetchQueueRef.current = [];
      prefetchCountRef.current = 0;
      return;
    }
    let cancelled = false;

    // Check if the pre-fetched queue has a song (instant use)
    const prefetched = prefetchQueueRef.current.shift();
    if (prefetched) {
      setSong((prev) => {
        if (prev && prev.videoId !== prefetched.videoId) {
          historyRef.current = [
            ...historyRef.current.slice(-(HISTORY_MAX - 1)),
            prev,
          ];
        }
        return prefetched;
      });
      setCurrentLine("");
      setCurrentTime(0);
      setDuration(prefetched.duration);
      setSyncOffset(loadOffset(prefetched.videoId));
      // Refill the queue immediately
      setTimeout(startPrefetch, 0);
      return;
    }

    // Check if user queued a song (e.g., via history "previous")
    const queued = queuedSongRef.current;
    if (queued) {
      queuedSongRef.current = null;
      setSong(queued);
      setCurrentLine("");
      setCurrentTime(0);
      setDuration(queued.duration);
      setSyncOffset(loadOffset(queued.videoId));
      setTimeout(startPrefetch, 0);
      return;
    }

    // Fetch a fresh song (synchronously, not from pre-fetch queue)
    setStatus("loading");
    fetch("/api/preach/song")
      .then((r) => {
        if (!r.ok) throw new Error(`status ${r.status}`);
        return r.json() as Promise<PreachSong>;
      })
      .then((data) => {
        if (cancelled) return;
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
        setDuration(data.duration);
        setSyncOffset(loadOffset(data.videoId));
        // Start pre-fetching ahead once this one is loaded
        setTimeout(startPrefetch, 0);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn("[preach] fetch song failed:", err);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, songNonce, startPrefetch]);

  // ── Create HTML5 audio element once we have a song and user has started ──
  // The stream endpoint supports byte-range requests, so the browser handles
  // seeking natively — audio.currentTime = N just works.
  useEffect(() => {
    if (!enabled || !started || !song) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      return;
    }

    const audio = new Audio(`/api/preach/stream/${song.videoId}`);
    audio.volume = 0.7;
    audioRef.current = audio;

    const onPlay    = () => setStatus("playing");
    const onPause   = () => setStatus("paused");
    const onEnded   = () => setSongNonce((n) => n + 1);
    const onError   = () => {
      console.warn("[preach] audio error, picking another song");
      setSongNonce((n) => n + 1);
    };
    // Use server-reported duration from Lavalink as the authoritative value,
    // but update if the browser discovers the real duration from the stream.
    const onDuration = () => {
      const d = audio.duration;
      if (d && Number.isFinite(d) && d > 0) setDuration(d);
    };

    audio.addEventListener("play",           onPlay);
    audio.addEventListener("pause",          onPause);
    audio.addEventListener("ended",          onEnded);
    audio.addEventListener("error",          onError);
    audio.addEventListener("durationchange", onDuration);

    audio.play().then(() => setStatus("playing")).catch(() => {
      setStatus("paused");
    });

    return () => {
      audio.removeEventListener("play",           onPlay);
      audio.removeEventListener("pause",          onPause);
      audio.removeEventListener("ended",          onEnded);
      audio.removeEventListener("error",          onError);
      audio.removeEventListener("durationchange", onDuration);
      audio.pause();
      audio.src = "";
      if (audioRef.current === audio) audioRef.current = null;
    };
  }, [enabled, started, song?.videoId]);

  // ── Lyric sync loop ──
  const PREROLL = 0.08;
  const MIN_LINE_DURATION = 1.6;
  const MAX_LINE_DURATION = 9.0;
  const SECONDS_PER_WORD = 0.42;

  function estimateDuration(text: string): number {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const raw = words * SECONDS_PER_WORD + 0.4;
    return Math.max(MIN_LINE_DURATION, Math.min(MAX_LINE_DURATION, raw));
  }

  useEffect(() => {
    if (!enabled || !song) return;
    const lines = song.lyrics;
    const ends: number[] = lines.map((l, i) => {
      const nextStart = lines[i + 1]?.time ?? l.time + estimateDuration(l.text);
      const estEnd    = l.time + estimateDuration(l.text);
      return Math.min(nextStart, estEnd);
    });

    let lastText = "";
    let lastTimeUpdate = 0;
    let raf = 0;

    const tick = () => {
      const audio = audioRef.current;
      if (audio) {
        const t = audio.currentTime;
        const now = performance.now();
        if (now - lastTimeUpdate > 200) {
          lastTimeUpdate = now;
          setCurrentTime(t);
          const d = audio.duration;
          if (d && Number.isFinite(d) && d > 0) setDuration(d);
        }

        const adjusted = t + syncOffsetRef.current + PREROLL;
        let active = "";
        for (let i = lines.length - 1; i >= 0; i--) {
          if (adjusted >= lines[i].time) {
            if (adjusted < ends[i]) active = lines[i].text;
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

  const previous = useCallback(() => {
    const a = audioRef.current;
    const t = a?.currentTime ?? 0;
    if (t > 3 || historyRef.current.length === 0) {
      if (a) { a.currentTime = 0; setCurrentTime(0); }
      return;
    }
    const prevSong = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    queuedSongRef.current = prevSong;
    setSongNonce((n) => n + 1);
  }, []);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else          a.pause();
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const a = audioRef.current;
    if (!a) return;
    const clamped = Math.max(0, seconds);
    a.currentTime = clamped;
    setCurrentTime(clamped);
  }, []);

  const seekBy = useCallback((delta: number) => {
    const a = audioRef.current;
    if (!a) return;
    const next = Math.max(0, a.currentTime + delta);
    a.currentTime = next;
    setCurrentTime(next);
  }, []);

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
