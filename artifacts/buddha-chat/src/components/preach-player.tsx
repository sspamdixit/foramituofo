import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Pause, Play, SkipForward, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreachSong } from "@/hooks/use-preach-song";

interface PreachPlayerProps {
  song: PreachSong | null;
  status: "idle" | "loading" | "playing" | "paused" | "error";
  syncOffset: number;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onSkip: () => void;
  onNudgeSync: (delta: number) => void;
  onSeek: (seconds: number) => void;
}

function formatTime(t: number): string {
  if (!Number.isFinite(t) || t < 0) t = 0;
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Bottom player. Modern dark-glass aesthetic — tall album art, large
 *  tactile transport, full progress bar (scrubbable), discreet sync popover. */
export function PreachPlayer({
  song,
  status,
  syncOffset,
  currentTime,
  duration,
  onTogglePlay,
  onSkip,
  onNudgeSync,
  onSeek,
}: PreachPlayerProps) {
  const [showSync, setShowSync] = useState(false);
  const progressRef = useRef<HTMLDivElement | null>(null);

  const isLoading = !song && status === "loading";
  const isError = !song && status === "error";
  const isPlaying = status === "playing";

  const progressPct =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const handleScrub = (clientX: number) => {
    const el = progressRef.current;
    if (!el || duration <= 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "relative mx-auto w-full max-w-3xl",
        "rounded-3xl overflow-hidden",
        "bg-stone-950/85 backdrop-blur-2xl",
        "border border-white/10",
        "shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]",
        "text-white",
      )}
      style={{ fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif" }}
    >
      {/* Progress bar — full-width, anchored at the top edge */}
      <div
        ref={progressRef}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={duration || 0}
        aria-valuenow={currentTime}
        tabIndex={song ? 0 : -1}
        onClick={(e) => handleScrub(e.clientX)}
        onPointerDown={(e) => {
          if (!song) return;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          handleScrub(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) handleScrub(e.clientX);
        }}
        className={cn(
          "group relative w-full h-2 cursor-pointer touch-none",
          "bg-white/8 hover:bg-white/12 transition-colors",
          !song && "cursor-default",
        )}
      >
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-300 via-orange-300 to-rose-300 transition-[width] duration-200 ease-linear"
          style={{ width: `${progressPct}%` }}
        />
        {/* Scrub thumb — appears on hover/focus */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "pointer-events-none",
          )}
          style={{ left: `calc(${progressPct}% - 6px)` }}
        />
      </div>

      <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4">
        {/* Album art with subtle glow that brightens while playing */}
        <div className="relative shrink-0">
          <motion.div
            aria-hidden="true"
            className="absolute -inset-1 rounded-xl bg-gradient-to-br from-amber-400/40 via-rose-400/30 to-fuchsia-500/30 blur-md"
            animate={{ opacity: isPlaying ? 0.9 : 0.25 }}
            transition={{ duration: 0.6 }}
          />
          {song?.artworkUrl ? (
            <img
              src={song.artworkUrl}
              alt={`${song.title} cover`}
              className="relative w-16 h-16 md:w-[72px] md:h-[72px] rounded-xl object-cover ring-1 ring-white/10"
              loading="lazy"
              draggable={false}
            />
          ) : (
            <div className="relative w-16 h-16 md:w-[72px] md:h-[72px] rounded-xl bg-stone-800 flex items-center justify-center text-stone-400 text-xl ring-1 ring-white/10">
              {isLoading ? (
                <span className="animate-pulse">♪</span>
              ) : (
                "♪"
              )}
            </div>
          )}
        </div>

        {/* Title / artist + time */}
        <div className="flex-1 min-w-0">
          {song ? (
            <>
              <div className="font-bold text-[15px] md:text-base text-white truncate leading-tight">
                {song.title}
              </div>
              <div className="text-[13px] text-white/55 truncate leading-tight mt-0.5">
                {song.artist}
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] tabular-nums text-white/45">
                <span>{formatTime(currentTime)}</span>
                <span className="text-white/25">/</span>
                <span>{formatTime(duration)}</span>
                {syncOffset !== 0 && (
                  <span className="ml-1 px-1.5 py-px rounded-full bg-amber-400/15 text-amber-300 text-[10px] font-semibold">
                    {syncOffset > 0 ? "+" : ""}
                    {syncOffset.toFixed(2)}s
                  </span>
                )}
              </div>
            </>
          ) : isLoading ? (
            <div className="text-white/70 text-sm animate-pulse">
              Tuning the celestial radio…
            </div>
          ) : isError ? (
            <div className="text-rose-400 text-sm">
              Couldn't reach the lyric library.
            </div>
          ) : (
            <div className="text-white/60 text-sm">Loading…</div>
          )}
        </div>

        {/* Transport — large tactile buttons */}
        <div className="shrink-0 flex items-center gap-1.5 md:gap-2">
          {/* Sync popover toggle */}
          <div className="relative">
            <motion.button
              type="button"
              onClick={() => setShowSync((v) => !v)}
              whileTap={{ scale: 0.92 }}
              aria-label="Lyric sync"
              title="Adjust lyric sync"
              className={cn(
                "w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center",
                "text-white/60 hover:text-white hover:bg-white/10 active:bg-white/15",
                "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
                showSync && "bg-white/10 text-white",
              )}
            >
              <Settings2 className="w-[18px] h-[18px]" />
            </motion.button>

            {showSync && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className={cn(
                  "absolute bottom-full mb-3 right-0",
                  "rounded-2xl bg-stone-900/95 backdrop-blur-xl border border-white/10",
                  "shadow-xl p-3 w-[220px]",
                )}
              >
                <div className="text-[11px] uppercase tracking-wider text-white/45 mb-2">
                  Lyric sync
                </div>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onNudgeSync(-0.25)}
                    className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/15 active:bg-white/20 text-white text-lg leading-none transition-colors"
                    aria-label="Pull lyrics earlier"
                  >
                    −
                  </button>
                  <div
                    className={cn(
                      "tabular-nums text-sm font-semibold",
                      syncOffset === 0 ? "text-white/45" : "text-amber-300",
                    )}
                  >
                    {syncOffset > 0 ? "+" : ""}
                    {syncOffset.toFixed(2)}s
                  </div>
                  <button
                    type="button"
                    onClick={() => onNudgeSync(0.25)}
                    className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/15 active:bg-white/20 text-white text-lg leading-none transition-colors"
                    aria-label="Push lyrics later"
                  >
                    +
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Play / Pause — primary action */}
          <motion.button
            type="button"
            onClick={onTogglePlay}
            disabled={!song}
            aria-label={isPlaying ? "Pause" : "Play"}
            title={isPlaying ? "Pause" : "Play"}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.04 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className={cn(
              "relative w-12 h-12 md:w-[52px] md:h-[52px] rounded-full",
              "flex items-center justify-center",
              "bg-white text-stone-900",
              "shadow-[0_6px_18px_-4px_rgba(255,255,255,0.35)]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
              "transition-shadow",
            )}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" fill="currentColor" />
            ) : (
              <Play className="w-5 h-5 translate-x-[1.5px]" fill="currentColor" />
            )}
          </motion.button>

          {/* Skip */}
          <motion.button
            type="button"
            onClick={onSkip}
            disabled={!song && !isError}
            aria-label="Skip to next song"
            title="Skip to next song"
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.06 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className={cn(
              "w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center",
              "text-white/75 hover:text-white hover:bg-white/10 active:bg-white/15",
              "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            <SkipForward className="w-[18px] h-[18px]" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
