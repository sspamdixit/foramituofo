import { motion } from "framer-motion";
import { BuddhaSprite } from "./buddha-sprite";

interface GreetingOverlayProps {
  onStart: () => void;
}

/** Scattered doodle marks drawn as tiny inline SVGs. */
function Star({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 2 L13.8 8.5 L20.5 8.5 L15.1 12.5 L17 19 L12 15.2 L7 19 L8.9 12.5 L3.5 8.5 L10.2 8.5 Z" />
    </svg>
  );
}

function Squiggle() {
  return (
    <svg width="48" height="14" viewBox="0 0 48 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M2 7 C8 2, 14 12, 20 7 S32 2, 38 7 S44 12, 46 7" />
    </svg>
  );
}

function Dots() {
  return (
    <svg width="32" height="10" viewBox="0 0 32 10" fill="currentColor">
      <circle cx="5" cy="5" r="2.2" />
      <circle cx="16" cy="5" r="2.2" />
      <circle cx="27" cy="5" r="2.2" />
    </svg>
  );
}

function Circle() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      {/* Rough hand-drawn circle */}
      <path d="M14 3 C21 3, 25 8, 25 14 S21 25, 14 25 S3 21, 3 14 S7 3, 14 3 Z" />
    </svg>
  );
}

const DOODLES = [
  { el: <Star size={22} />,  top: "9%",  left: "7%",  rotate:  18, delay: 0.45, opacity: 0.45 },
  { el: <Circle />,          top: "7%",  left: "84%", rotate: -12, delay: 0.55, opacity: 0.38 },
  { el: <Star size={14} />,  top: "22%", left: "91%", rotate:  33, delay: 0.70, opacity: 0.30 },
  { el: <Squiggle />,        top: "48%", left: "4%",  rotate:  -6, delay: 0.50, opacity: 0.35 },
  { el: <Dots />,            top: "74%", left: "88%", rotate:  14, delay: 0.65, opacity: 0.40 },
  { el: <Star size={18} />,  top: "81%", left: "6%",  rotate: -22, delay: 0.60, opacity: 0.38 },
  { el: <Circle />,          top: "60%", left: "93%", rotate:   8, delay: 0.75, opacity: 0.28 },
  { el: <Star size={12} />,  top: "35%", left: "3%",  rotate:  40, delay: 0.80, opacity: 0.28 },
];

export function GreetingOverlay({ onStart }: GreetingOverlayProps) {
  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onStart}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onStart(); }}
      aria-label="Tap anywhere to begin"
      className="fixed inset-0 z-[100] cursor-pointer overflow-hidden focus:outline-none"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
      style={{
        backdropFilter: "blur(22px) saturate(115%)",
        WebkitBackdropFilter: "blur(22px) saturate(115%)",
        background: "rgba(247, 240, 220, 0.62)",
      }}
    >
      {/* ── Scattered doodles ──────────────────────────────────────────── */}
      {DOODLES.map((d, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none"
          style={{
            top: d.top,
            left: d.left,
            color: "#5a4030",
            opacity: 0,
            rotate: d.rotate,
          }}
          animate={{ opacity: d.opacity }}
          transition={{ delay: d.delay, duration: 0.6 }}
        >
          {d.el}
        </motion.div>
      ))}

      {/* ── Main content ───────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-0 select-none pointer-events-none"
        style={{ paddingBottom: "6vh" }}
      >
        {/* Big title — tilted, pencil font, two lines */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
          style={{
            fontFamily: '"PencilSRB", "Caveat", ui-serif, serif',
            fontSize: "clamp(70px, 16vw, 138px)",
            lineHeight: 0.88,
            letterSpacing: "-0.02em",
            color: "#1a110a",
            transform: "rotate(-2deg)",
            whiteSpace: "nowrap",
          }}
        >
          monk radio
        </motion.div>

        {/* Subtitle — loose, slightly tilted the other way */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.28, duration: 0.5 }}
          style={{
            fontFamily: '"Caveat", ui-serif, serif',
            fontSize: "clamp(15px, 2.2vw, 20px)",
            color: "#6b5340",
            marginTop: "0.6em",
            transform: "rotate(0.9deg)",
            letterSpacing: "0.02em",
          }}
        >
          vibes · lyrics · a little wisdom
        </motion.div>

        {/* Buddha sprite — gentle float */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{
            opacity: 1,
            scale: 1,
            y: [0, -7, 0],
          }}
          transition={{
            opacity: { delay: 0.18, duration: 0.5 },
            scale:   { delay: 0.18, duration: 0.5 },
            y: { delay: 0.7, duration: 3.2, repeat: Infinity, ease: "easeInOut" },
          }}
          style={{ marginTop: "clamp(20px, 4vh, 36px)" }}
        >
          <BuddhaSprite state="idle" size="sm" />
        </motion.div>
      </div>

      {/* ── "tap anywhere" hint ─────────────────────────────────────────── */}
      <motion.div
        className="absolute bottom-10 left-0 right-0 text-center pointer-events-none select-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.55, 0.25, 0.55] }}
        transition={{ delay: 0.9, duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          fontFamily: '"Caveat", ui-serif, serif',
          fontSize: "clamp(16px, 2vw, 20px)",
          color: "#7a6040",
          transform: "rotate(-0.5deg)",
          letterSpacing: "0.04em",
        }}
      >
        tap anywhere
      </motion.div>
    </motion.div>
  );
}
