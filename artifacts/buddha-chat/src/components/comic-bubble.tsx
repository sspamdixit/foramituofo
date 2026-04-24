import { useId, type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type BubbleMood = "speak" | "think" | "bless" | "refuse";

/* ---------------- Hand-tuned bubble paths (viewBox 0 0 400 200) ---------------- */

// Speech bubble: rounded oval with a pointed tail on the RIGHT (pointing at buddha).
const SPEAK_PATH =
  "M 45 30 C 20 36 12 62 12 96 C 12 130 22 156 52 166 C 95 170 250 170 305 170 C 335 168 348 148 348 118 L 392 100 L 348 84 C 348 62 338 34 310 27 C 260 17 95 22 45 30 Z";

// Cloud / thought bubble: scalloped edges all around.
const THINK_PATH =
  "M 70 60 C 36 52 14 76 28 102 C 4 116 18 150 50 152 C 58 178 96 180 126 162 C 146 186 200 186 226 162 C 252 184 296 178 308 152 C 342 154 366 130 348 102 C 380 84 360 48 320 56 C 308 28 268 28 248 50 C 216 22 178 22 156 50 C 128 24 96 32 70 60 Z";

// Soft cloud (blessing): rounder, fewer sharp bumps.
const BLESS_PATH =
  "M 60 80 C 28 92 28 138 70 148 C 78 178 130 184 168 162 C 198 184 248 184 278 158 C 316 178 360 146 346 110 C 380 90 360 48 320 60 C 306 28 246 28 226 56 C 192 28 130 32 110 62 C 80 60 58 70 60 80 Z";

// Spiky burst (refuse): generated star polygon with jittered radii.
function generateBurstPath(seed: number): string {
  const cx = 200,
    cy = 100;
  const points = 14;
  const outerRX = 178,
    outerRY = 88;
  const innerRX = 122,
    innerRY = 56;
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const isOuter = i % 2 === 0;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const jitter = 0.82 + 0.32 * Math.abs(Math.sin(i * 1.7 + seed));
    const rx = (isOuter ? outerRX : innerRX) * jitter;
    const ry = (isOuter ? outerRY : innerRY) * jitter;
    const x = cx + Math.cos(angle) * rx;
    const y = cy + Math.sin(angle) * ry;
    d += (i === 0 ? "M " : "L ") + x.toFixed(1) + " " + y.toFixed(1) + " ";
  }
  return d + "Z";
}

const BURST_PATH = generateBurstPath(2.7);

/* ---------------- Component ---------------- */

interface ComicBubbleProps {
  mood: BubbleMood;
  children: ReactNode;
  /** Show trailing puff dots below the bubble (used for floating thought bubbles) */
  showTrail?: boolean;
  /** Compact size (used for chat history) */
  size?: "lg" | "sm";
  className?: string;
}

const PADDING_BY_MOOD: Record<BubbleMood, string> = {
  // extra right padding leaves room for the speech-tail jutting right
  speak: "pl-10 pr-16 py-7",
  think: "px-12 py-9",
  bless: "px-14 py-10",
  refuse: "px-20 py-12",
};

export function ComicBubble({
  mood,
  children,
  showTrail = false,
  size = "lg",
  className,
}: ComicBubbleProps) {
  // Scope SVG defs IDs per instance to avoid collisions when many bubbles exist.
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9]/g, "");
  const halftoneId = `bub-halftone-${id}`;
  const wobbleId = `bub-wobble-${id}`;

  const path =
    mood === "speak"
      ? SPEAK_PATH
      : mood === "think"
        ? THINK_PATH
        : mood === "bless"
          ? BLESS_PATH
          : BURST_PATH;

  const minSize =
    size === "lg" ? "min-w-[300px] max-w-[28rem]" : "min-w-[160px] max-w-[22rem]";
  const textSize = size === "lg" ? "text-2xl md:text-3xl" : "text-xl md:text-2xl";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: "spring", stiffness: 240, damping: 18 }}
      className={cn("relative inline-block", minSize, className)}
    >
      {/* SVG bubble shape behind the text */}
      <svg
        viewBox="0 0 400 200"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id={halftoneId}
            x="0"
            y="0"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1" fill="rgba(0,0,0,0.45)" />
          </pattern>
          <filter id={wobbleId}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.013"
              numOctaves="2"
              seed={mood === "speak" ? 3 : mood === "think" ? 7 : mood === "bless" ? 11 : 17}
            />
            <feDisplacementMap in="SourceGraphic" scale="2.5" />
          </filter>
        </defs>

        <g filter={`url(#${wobbleId})`}>
          {/* Halftone shadow drawn first, offset, peeking from behind */}
          <path
            d={path}
            fill={`url(#${halftoneId})`}
            transform="translate(7, 9)"
          />
          {/* Bubble body */}
          <path
            d={path}
            fill="white"
            stroke="black"
            strokeWidth="3.5"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>

      {/* Text content */}
      <div
        className={cn(
          "relative comic-text text-center",
          textSize,
          PADDING_BY_MOOD[mood],
        )}
      >
        {children}
      </div>

      {/* Trailing puff dots (only for cloud-style bubbles) */}
      {showTrail && (mood === "think" || mood === "bless") && (
        <ComicTrail />
      )}
    </motion.div>
  );
}

/** Three little hand-drawn circles trailing rightward toward the buddha. */
function ComicTrail() {
  return (
    <svg
      width="70"
      height="40"
      viewBox="0 0 70 40"
      className="absolute -right-16 top-1/2 -translate-y-1/2 overflow-visible"
      aria-hidden="true"
    >
      <g
        fill="white"
        stroke="black"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      >
        <circle cx="10" cy="20" r="9" />
        <circle cx="34" cy="22" r="6" />
        <circle cx="56" cy="20" r="4" />
      </g>
    </svg>
  );
}
