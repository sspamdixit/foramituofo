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
};

const PALETTES: Record<Vibe, VibePalette> = {
  calm: {
    a: "hsl(40 70% 92%)",
    b: "hsl(32 60% 86%)",
    c: "hsl(38 50% 90%)",
    d: "hsl(45 80% 95%)",
  },
  joyful: {
    a: "hsl(42 95% 80%)",
    b: "hsl(20 90% 78%)",
    c: "hsl(35 95% 84%)",
    d: "hsl(50 100% 90%)",
  },
  melancholy: {
    a: "hsl(225 55% 38%)",
    b: "hsl(210 50% 45%)",
    c: "hsl(250 40% 40%)",
    d: "hsl(220 60% 22%)",
  },
  fiery: {
    a: "hsl(10 88% 70%)",
    b: "hsl(355 80% 60%)",
    c: "hsl(20 95% 65%)",
    d: "hsl(345 75% 50%)",
  },
  bliss: {
    a: "hsl(320 75% 88%)",
    b: "hsl(290 60% 84%)",
    c: "hsl(20 80% 90%)",
    d: "hsl(340 75% 92%)",
  },
  deep: {
    a: "hsl(270 55% 40%)",
    b: "hsl(195 65% 35%)",
    c: "hsl(290 50% 32%)",
    d: "hsl(240 60% 22%)",
  },
  chill: {
    a: "hsl(150 55% 82%)",
    b: "hsl(180 50% 80%)",
    c: "hsl(130 45% 84%)",
    d: "hsl(190 55% 88%)",
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
  } as CSSProperties;

  return (
    <div className="vibe-bg absolute inset-0" style={style} aria-hidden="true">
      {/* Drifting blobs — keep the gradient feeling alive without repeating */}
      <div className="vibe-blob vibe-blob-a" />
      <div className="vibe-blob vibe-blob-b" />
      <div className="vibe-blob vibe-blob-c" />

      {/* Organic grain so it never feels flat */}
      <div
        className="vibe-grain absolute inset-0"
        style={{ backgroundImage: NOISE_SVG }}
      />
    </div>
  );
}
