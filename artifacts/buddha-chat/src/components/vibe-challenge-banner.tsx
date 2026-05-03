import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, CheckCircle } from "lucide-react";
import type { VibeChallenge } from "@/hooks/use-gamification";

const VIBE_COLORS: Record<string, string> = {
  calm:       "hsl(40,70%,60%)",
  joyful:     "hsl(42,95%,55%)",
  melancholy: "hsl(225,55%,60%)",
  fiery:      "hsl(10,88%,60%)",
  bliss:      "hsl(320,75%,68%)",
  deep:       "hsl(270,55%,60%)",
  chill:      "hsl(150,55%,52%)",
};

const VIBE_ICONS: Record<string, string> = {
  calm: "☁️", joyful: "☀️", melancholy: "🌧️",
  fiery: "🔥", bliss: "🌸", deep: "🌌", chill: "🍃",
};

interface VibeChallengerBannerProps {
  challenge: VibeChallenge | null;
  onDismiss: () => void;
}

export function VibeChallengerBanner({
  challenge,
  onDismiss,
}: VibeChallengerBannerProps) {
  if (!challenge) return null;

  return (
    <AnimatePresence>
      {challenge && (
        <motion.div
          key="challenge-banner"
          initial={{ opacity: 0, height: 0, y: 8 }}
          animate={{ opacity: 1, height: "auto", y: 0 }}
          exit={{ opacity: 0, height: 0, y: 8 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="overflow-hidden"
          style={{ fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif" }}
        >
          <div
            className="mx-auto w-full max-w-3xl rounded-2xl px-4 py-2.5 mb-1"
            style={{
              background: challenge.completed
                ? "rgba(34, 197, 94, 0.15)"
                : "rgba(255,255,255,0.08)",
              border: challenge.completed
                ? "1px solid rgba(34, 197, 94, 0.3)"
                : "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="flex items-center gap-2.5">
              {challenge.completed ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-green-400" />
              ) : (
                <Zap className="w-4 h-4 shrink-0 text-yellow-400" />
              )}

              <div className="flex-1 min-w-0">
                {challenge.completed ? (
                  <p className="text-[12px] font-semibold text-green-300 leading-tight">
                    Vibe challenge complete! Badge unlocked.
                  </p>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] uppercase tracking-wide text-white/40 shrink-0">
                      Today&rsquo;s Challenge
                    </span>
                    <span className="text-[12px] text-white/75 leading-tight">
                      {challenge.description}
                    </span>
                    <div className="flex items-center gap-1 ml-auto shrink-0">
                      <span
                        className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: `color-mix(in oklab, ${VIBE_COLORS[challenge.fromVibe]} 25%, transparent)`,
                          color: VIBE_COLORS[challenge.fromVibe],
                        }}
                      >
                        {VIBE_ICONS[challenge.fromVibe]} {challenge.fromVibe}
                      </span>
                      <span className="text-white/30 text-[11px]">→</span>
                      <span
                        className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: `color-mix(in oklab, ${VIBE_COLORS[challenge.toVibe]} 25%, transparent)`,
                          color: VIBE_COLORS[challenge.toVibe],
                        }}
                      >
                        {VIBE_ICONS[challenge.toVibe]} {challenge.toVibe}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={onDismiss}
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
                aria-label="Dismiss challenge"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
