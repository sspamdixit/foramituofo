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

export function VibeBackground({ vibe }: { vibe: Vibe }) {
  const p = PALETTES[vibe];
  const tilePath = `${import.meta.env.BASE_URL}bg-tile.png`;
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
      {/* Original tiled pattern — tinted by the vibe color via multiply blend */}
      <div
        className="vibe-pattern absolute inset-0"
        style={{
          backgroundImage: `url(${tilePath})`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

      {/* Hand-drawn comic panel border around the viewport */}
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
