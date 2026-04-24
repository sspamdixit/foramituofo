import type { CSSProperties } from "react";
import type { Vibe } from "@/hooks/use-vibe";

type VibePalette = {
  /** Top-left blob */
  a: string;
  /** Top-right blob */
  b: string;
  /** Bottom blob */
  c: string;
  /** Underlying wash */
  d: string;
  /** Halftone-dot ink color — light on dark vibes, dark on light vibes */
  ink: string;
};

const PALETTES: Record<Vibe, VibePalette> = {
  calm: {
    a: "hsl(40 70% 92%)",
    b: "hsl(32 60% 86%)",
    c: "hsl(38 50% 90%)",
    d: "hsl(45 80% 95%)",
    ink: "rgba(60, 40, 20, 0.32)",
  },
  joyful: {
    a: "hsl(42 95% 80%)",
    b: "hsl(20 90% 78%)",
    c: "hsl(35 95% 84%)",
    d: "hsl(50 100% 90%)",
    ink: "rgba(120, 50, 10, 0.34)",
  },
  melancholy: {
    a: "hsl(225 55% 38%)",
    b: "hsl(210 50% 45%)",
    c: "hsl(250 40% 40%)",
    d: "hsl(220 60% 22%)",
    ink: "rgba(200, 215, 255, 0.28)",
  },
  fiery: {
    a: "hsl(10 88% 70%)",
    b: "hsl(355 80% 60%)",
    c: "hsl(20 95% 65%)",
    d: "hsl(345 75% 50%)",
    ink: "rgba(60, 0, 0, 0.42)",
  },
  bliss: {
    a: "hsl(320 75% 88%)",
    b: "hsl(290 60% 84%)",
    c: "hsl(20 80% 90%)",
    d: "hsl(340 75% 92%)",
    ink: "rgba(110, 40, 100, 0.28)",
  },
  deep: {
    a: "hsl(270 55% 40%)",
    b: "hsl(195 65% 35%)",
    c: "hsl(290 50% 32%)",
    d: "hsl(240 60% 22%)",
    ink: "rgba(220, 200, 255, 0.26)",
  },
  chill: {
    a: "hsl(150 55% 82%)",
    b: "hsl(180 50% 80%)",
    c: "hsl(130 45% 84%)",
    d: "hsl(190 55% 88%)",
    ink: "rgba(20, 60, 50, 0.30)",
  },
};

/** Inline SVG noise that doesn't tile-scream — high-frequency turbulence. */
const NOISE_SVG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/>" +
  "<feColorMatrix values='0 0 0 0 0.45  0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0.55 0'/></filter>" +
  "<rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export function VibeBackground({ vibe }: { vibe: Vibe }) {
  const p = PALETTES[vibe];
  const style: CSSProperties = {
    // CSS custom properties registered in index.css via @property
    // so they interpolate smoothly when the vibe changes.
    ["--vibe-a" as string]: p.a,
    ["--vibe-b" as string]: p.b,
    ["--vibe-c" as string]: p.c,
    ["--vibe-d" as string]: p.d,
    ["--vibe-ink" as string]: p.ink,
  } as CSSProperties;

  return (
    <div className="vibe-bg absolute inset-0" style={style} aria-hidden="true">
      {/* Drifting blobs — keep the gradient feeling alive without repeating */}
      <div className="vibe-blob vibe-blob-a" />
      <div className="vibe-blob vibe-blob-b" />
      <div className="vibe-blob vibe-blob-c" />

      {/* Comic-book Ben-Day halftone dots — varying density across the page */}
      <div className="comic-halftone comic-halftone-a" />
      <div className="comic-halftone comic-halftone-b" />

      {/* Comic-book speed/action lines radiating from behind Buddha */}
      <div className="comic-speedlines" />

      {/* Organic grain so it never feels flat */}
      <div
        className="vibe-grain absolute inset-0"
        style={{ backgroundImage: NOISE_SVG }}
      />

      {/* Hand-drawn comic panel border — a wobbly ink frame around the viewport */}
      <svg
        className="comic-frame"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <defs>
          <filter id="comic-wobble">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.02"
              numOctaves="2"
              seed="3"
            />
            <feDisplacementMap in="SourceGraphic" scale="1.6" />
          </filter>
        </defs>
        <rect
          x="1"
          y="1"
          width="98"
          height="98"
          fill="none"
          stroke="#141414"
          strokeWidth="0.6"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          filter="url(#comic-wobble)"
        />
      </svg>
    </div>
  );
}
