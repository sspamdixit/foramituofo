import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { BuddhaSprite } from "./buddha-sprite";

interface GreetingOverlayProps {
  /** Called the moment the user taps anywhere to enter. The caller should
   *  flip its `started` state and let the player hook take over. */
  onStart: () => void;
}

/**
 * Full-screen blur overlay that gates the page until the user clicks.
 *
 * Two reasons it exists:
 *   1. UX — a calm "press to begin" entrance fits the meditative vibe and
 *      makes the first-second motion intentional rather than chaotic.
 *   2. Browser autoplay policies — YouTube's iframe player can't start
 *      audio without a user gesture. Doing it from this click handler
 *      satisfies that requirement reliably.
 *
 * The whole backdrop is the click target; the centered card is just a
 * visual cue. The greeting is rendered inside an `AnimatePresence` so it
 * fades out smoothly when dismissed.
 */
export function GreetingOverlay({ onStart }: GreetingOverlayProps) {
  return (
    <motion.button
      type="button"
      onClick={onStart}
      aria-label="Tap anywhere to begin"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 cursor-pointer focus:outline-none"
      style={{
        backdropFilter: "blur(28px) saturate(120%)",
        WebkitBackdropFilter: "blur(28px) saturate(120%)",
        background: "rgba(245, 238, 218, 0.55)",
      }}
    >
      <motion.div
        initial={{ y: 18, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.12 }}
        className="text-center select-none pointer-events-none"
      >
        <div className="mx-auto mb-2 flex items-end justify-center">
          <BuddhaSprite state="idle" size="sm" />
        </div>

        <div
          className="text-stone-900"
          style={{
            fontFamily:
              "'Caveat', 'Patrick Hand', ui-serif, Georgia, serif",
            fontSize: "clamp(56px, 12vw, 104px)",
            lineHeight: 0.95,
            letterSpacing: "-0.01em",
          }}
        >
          Monk Radio
        </div>

        <div
          className="mt-2 text-stone-700/80"
          style={{
            fontFamily: "'Caveat', ui-serif, serif",
            fontSize: "clamp(18px, 2.4vw, 24px)",
          }}
        >
          a moment of music, a slice of stillness
        </div>

        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{
            duration: 2.4,
            ease: "easeInOut",
            repeat: Infinity,
          }}
          className="mt-10 mx-auto inline-flex items-center justify-center gap-3 px-7 py-4 rounded-full bg-stone-900 text-white shadow-2xl"
          style={{ boxShadow: "0 12px 40px -8px rgba(40, 30, 20, 0.5)" }}
        >
          <Play className="w-5 h-5" fill="currentColor" />
          <span
            style={{
              fontFamily: "'Caveat', ui-serif, serif",
              fontSize: 26,
              lineHeight: 1,
            }}
          >
            Begin
          </span>
        </motion.div>

        <div
          className="mt-6 text-stone-700/55"
          style={{
            fontFamily: "'Caveat', ui-serif, serif",
            fontSize: 18,
          }}
        >
          tap anywhere
        </div>
      </motion.div>
    </motion.button>
  );
}
