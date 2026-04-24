import { motion } from "framer-motion";
import { Pause, Play, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PreachSong } from "@/hooks/use-preach-song";

interface PreachPlayerProps {
  song: PreachSong | null;
  status: "idle" | "loading" | "playing" | "paused" | "error";
  syncOffset: number;
  onTogglePlay: () => void;
  onSkip: () => void;
  onNudgeSync: (delta: number) => void;
}

/** Bottom player that replaces the chat input while preach mode is on.
 *  Shows album art (from iTunes), title/artist, transport controls, and
 *  a small ±0.25s sync nudge so the user can pull lyrics into time. */
export function PreachPlayer({
  song,
  status,
  syncOffset,
  onTogglePlay,
  onSkip,
  onNudgeSync,
}: PreachPlayerProps) {
  const isLoading = !song && status === "loading";
  const isError = !song && status === "error";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "mx-auto max-w-2xl",
        "rounded-2xl border border-stone-300 bg-white/90 backdrop-blur",
        "shadow-lg px-3 py-3 md:px-4",
        "flex items-center gap-3 md:gap-4",
      )}
    >
      {/* Album art */}
      <div className="shrink-0">
        {song?.artworkUrl ? (
          <img
            src={song.artworkUrl}
            alt={`${song.title} cover`}
            className="w-14 h-14 md:w-16 md:h-16 rounded-lg object-cover shadow-sm border border-stone-200"
            loading="lazy"
          />
        ) : (
          <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg bg-stone-200 flex items-center justify-center text-stone-500 text-xs">
            {isLoading ? "…" : "♪"}
          </div>
        )}
      </div>

      {/* Title / artist + sync */}
      <div className="flex-1 min-w-0">
        {song ? (
          <>
            <div className="font-semibold truncate text-stone-800">
              {song.title}
            </div>
            <div className="text-sm text-stone-500 truncate">{song.artist}</div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-stone-500">
              <span className="hidden sm:inline">Sync</span>
              <button
                type="button"
                onClick={() => onNudgeSync(-0.25)}
                className="px-1.5 py-0.5 rounded border border-stone-300 hover:bg-stone-100 transition-colors leading-none"
                title="Lyrics are too late — pull them earlier"
                aria-label="Pull lyrics earlier"
              >
                −
              </button>
              <span
                className={cn(
                  "tabular-nums w-12 text-center",
                  syncOffset === 0 ? "text-stone-400" : "text-stone-700 font-medium",
                )}
              >
                {syncOffset > 0 ? "+" : ""}
                {syncOffset.toFixed(2)}s
              </span>
              <button
                type="button"
                onClick={() => onNudgeSync(0.25)}
                className="px-1.5 py-0.5 rounded border border-stone-300 hover:bg-stone-100 transition-colors leading-none"
                title="Lyrics are too early — push them later"
                aria-label="Push lyrics later"
              >
                +
              </button>
            </div>
          </>
        ) : isLoading ? (
          <div className="text-stone-600">Tuning the celestial radio…</div>
        ) : isError ? (
          <div className="text-rose-600 text-sm">
            Couldn't reach the lyric library.
          </div>
        ) : (
          <div className="text-stone-500">Loading…</div>
        )}
      </div>

      {/* Transport */}
      <div className="shrink-0 flex items-center gap-2">
        <button
          type="button"
          onClick={onTogglePlay}
          disabled={!song}
          aria-label={status === "playing" ? "Pause" : "Play"}
          title={status === "playing" ? "Pause" : "Play"}
          className={cn(
            "w-11 h-11 rounded-full flex items-center justify-center",
            "bg-amber-200 border-2 border-amber-500 text-rose-700",
            "shadow-sm transition-transform active:scale-95",
            "disabled:opacity-40 disabled:cursor-not-allowed",
          )}
        >
          {status === "playing" ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 translate-x-[1px]" />
          )}
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={!song && !isError}
          aria-label="Skip to next song"
          title="Skip to next song"
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            "bg-white border border-stone-300 text-stone-700",
            "shadow-sm transition-transform active:scale-95 hover:bg-stone-50",
            "disabled:opacity-40 disabled:cursor-not-allowed",
          )}
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
