import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Pause,
  Play,
  Rewind,
  FastForward,
  SkipBack,
  SkipForward,
  Settings2,
} from "lucide-react";
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
  onPrevious: () => void;
  onSeekBy: (delta: number) => void;
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
 *  tactile transport, full progress bar (scrubbable), discreet sync popover.
 *  Accent color (progress bar gradient + album-art glow) reads from the
 *  CSS vars `--vibe-accent` / `--vibe-accent-2` so it always contrasts the
 *  current vibe-driven background. */
export function PreachPlayer({
  song,
  status,
  syncOffset,
  currentTime,
  duration,
  onTogglePlay,
  onSkip,
  onPrevious,
  onSeekBy,
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
      {/* Progress bar — full-width, anchored at the top edge. Filled with
          the current vibe's accent gradient so it pops off the dark glass
          AND off whatever color the background just shifted to. */}
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
          className="absolute inset-y-0 left-0 transition-[width] duration-200 ease-linear"
          style={{
            width: `${progressPct}%`,
            background:
              "linear-gradient(90deg, var(--vibe-accent, hsl(40 95% 60%)) 0%, var(--vibe-accent-2, hsl(15 90% 65%)) 100%)",
          }}
        />
        {/* Scrub thumb — appears on hover/focus */}
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            "pointer-events-none",
          )}
          style={{
            left: `calc(${progressPct}% - 6px)`,
            background: "var(--vibe-accent, #fff)",
            boxShadow: "0 0 0 2px rgba(255,255,255,0.85)",
          }}
        />
      </div>

      <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4">
        {/* Album art with vibe-accent glow that brightens while playing */}
        <div className="relative shrink-0">
          <motion.div
            aria-hidden="true"
            className="absolute -inset-1 rounded-xl blur-md"
            style={{
              background:
                "linear-gradient(135deg, var(--vibe-accent, hsl(40 95% 60%)) 0%, var(--vibe-accent-2, hsl(15 90% 65%)) 100%)",
            }}
            animate={{ opacity: isPlaying ? 0.7 : 0.2 }}
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
              {isLoading ? <span className="animate-pulse">♪</span> : "♪"}
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
                  <span
                    className="ml-1 px-1.5 py-px rounded-full text-[10px] font-semibold"
                    style={{
                      background: "color-mix(in oklab, var(--vibe-accent, #f5b342) 20%, transparent)",
                      color: "var(--vibe-accent, #f5b342)",
                    }}
                  >
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

        {/* Transport — large tactile buttons.
            Layout: [settings] [-10s (md+)] [prev] [PLAY] [next] [+10s (md+)]
            On narrow screens we hide the ±10s jumps to keep the row tidy. */}
        <div className="shrink-0 flex items-center gap-1 md:gap-1.5">
          {/* Sync popover toggle */}
          <div className="relative">
            <SecondaryButton
              onClick={() => setShowSync((v) => !v)}
              ariaLabel="Lyric sync"
              title="Adjust lyric sync"
              active={showSync}
            >
              <Settings2 className="w-[18px] h-[18px]" />
            </SecondaryButton>

            {showSync && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className={cn(
                  "absolute bottom-full mb-3 right-0 z-10",
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
                    className="tabular-nums text-sm font-semibold"
                    style={{
                      color:
                        syncOffset === 0
                          ? "rgba(255,255,255,0.45)"
                          : "var(--vibe-accent, #f5b342)",
                    }}
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

          {/* −10s — desktop only */}
          <div className="hidden md:block">
            <SecondaryButton
              onClick={() => onSeekBy(-10)}
              ariaLabel="Back 10 seconds"
              title="Back 10s"
              disabled={!song}
            >
              <Rewind className="w-[18px] h-[18px]" />
            </SecondaryButton>
          </div>

          {/* Previous track */}
          <SecondaryButton
            onClick={onPrevious}
            ariaLabel="Previous song"
            title="Previous"
            disabled={!song}
          >
            <SkipBack className="w-[18px] h-[18px]" fill="currentColor" />
          </SecondaryButton>

          {/* Play / Pause — primary action, ringed in the vibe accent so it
              also reads as a "this matches the moment" element. */}
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
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
              "transition-shadow",
            )}
            style={{
              boxShadow:
                "0 6px 18px -4px color-mix(in oklab, var(--vibe-accent, #fff) 50%, rgba(255,255,255,0.35))",
            }}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" fill="currentColor" />
            ) : (
              <Play className="w-5 h-5 translate-x-[1.5px]" fill="currentColor" />
            )}
          </motion.button>

          {/* Next track */}
          <SecondaryButton
            onClick={onSkip}
            ariaLabel="Next song"
            title="Next"
            disabled={!song && !isError}
          >
            <SkipForward className="w-[18px] h-[18px]" fill="currentColor" />
          </SecondaryButton>

          {/* +10s — desktop only */}
          <div className="hidden md:block">
            <SecondaryButton
              onClick={() => onSeekBy(10)}
              ariaLabel="Forward 10 seconds"
              title="Forward 10s"
              disabled={!song}
            >
              <FastForward className="w-[18px] h-[18px]" />
            </SecondaryButton>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/** Local helper — every secondary transport / settings button shares the
 *  same hit area, hover treatment, and tap spring so the whole row feels
 *  like one cohesive control surface. */
function SecondaryButton({
  onClick,
  children,
  ariaLabel,
  title,
  active,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel: string;
  title?: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.06 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      className={cn(
        "w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center",
        "text-white/70 hover:text-white hover:bg-white/10 active:bg-white/15",
        "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        active && "bg-white/10 text-white",
      )}
    >
      {children}
    </motion.button>
  );
}
