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
  /** Color of the woven micro-pattern that sits on top */
  ink: string;
  /**
   * High-contrast color for any text that sits directly on the background
   * (no surface behind it). Picked by hand per palette so it stays legible
   * against the underlying wash.
   */
  text: string;
};

const PALETTES: Record<Vibe, VibePalette> = {
  calm: {
    a: "hsl(40 70% 92%)",
    b: "hsl(32 60% 86%)",
    c: "hsl(38 50% 90%)",
    d: "hsl(45 80% 95%)",
    ink: "rgba(85, 55, 25, 0.55)",
    text: "hsl(28 45% 18%)",
  },
  joyful: {
    a: "hsl(42 95% 80%)",
    b: "hsl(20 90% 78%)",
    c: "hsl(35 95% 84%)",
    d: "hsl(50 100% 90%)",
    ink: "rgba(150, 60, 10, 0.55)",
    text: "hsl(18 70% 18%)",
  },
  melancholy: {
    a: "hsl(225 55% 38%)",
    b: "hsl(210 50% 45%)",
    c: "hsl(250 40% 40%)",
    d: "hsl(220 60% 22%)",
    ink: "rgba(190, 215, 255, 0.42)",
    text: "hsl(45 80% 94%)",
  },
  fiery: {
    a: "hsl(10 88% 70%)",
    b: "hsl(355 80% 60%)",
    c: "hsl(20 95% 65%)",
    d: "hsl(345 75% 50%)",
    ink: "rgba(70, 0, 5, 0.55)",
    text: "hsl(40 95% 96%)",
  },
  bliss: {
    a: "hsl(320 75% 88%)",
    b: "hsl(290 60% 84%)",
    c: "hsl(20 80% 90%)",
    d: "hsl(340 75% 92%)",
    ink: "rgba(130, 40, 110, 0.45)",
    text: "hsl(320 55% 22%)",
  },
  deep: {
    a: "hsl(270 55% 40%)",
    b: "hsl(195 65% 35%)",
    c: "hsl(290 50% 32%)",
    d: "hsl(240 60% 22%)",
    ink: "rgba(220, 200, 255, 0.40)",
    text: "hsl(270 60% 94%)",
  },
  chill: {
    a: "hsl(150 55% 82%)",
    b: "hsl(180 50% 80%)",
    c: "hsl(130 45% 84%)",
    d: "hsl(190 55% 88%)",
    ink: "rgba(15, 70, 55, 0.50)",
    text: "hsl(170 60% 14%)",
  },
};

/** High-contrast text color for the given vibe — used by elements whose
 *  text sits directly on the background (chat input, credits, etc.). */
export function getVibeTextColor(vibe: Vibe): string {
  return PALETTES[vibe].text;
}

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
      {/* Procedural woven micro-pattern.
          - Two SVG <pattern>s of staggered diagonal dashes (fine weave look)
          - Different cell sizes (11px and 17px — coprime) so the combined
            pattern never visibly repeats inside the viewport
          - Both layers are pushed through a turbulence + displacement filter
            so each "stitch" is slightly offset from its neighbour, killing
            any sense of a grid and giving an organic woven feel
          - color: currentColor lets us drive the stitch color from --vibe-ink
            so the pattern smoothly recolors with the mood */}
      <svg
        className="vibe-weave"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern
            id="weave-fine"
            width="11"
            height="11"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M1.2 4 L4 1.2 M6.4 9.4 L9.4 6.4"
              stroke="currentColor"
              strokeWidth="0.85"
              strokeLinecap="round"
              fill="none"
            />
          </pattern>
          <pattern
            id="weave-coarse"
            width="17"
            height="17"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(2)"
          >
            <path
              d="M2 6 L6 2 M9.5 14 L14 9.5"
              stroke="currentColor"
              strokeWidth="0.7"
              strokeLinecap="round"
              fill="none"
            />
          </pattern>
          <filter id="weave-wobble">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.018"
              numOctaves="2"
              seed="7"
            />
            <feDisplacementMap in="SourceGraphic" scale="5" />
          </filter>
        </defs>
        <g filter="url(#weave-wobble)">
          {/* Slightly oversized rects so the displacement doesn't reveal edges */}
          <rect
            x="-3%"
            y="-3%"
            width="106%"
            height="106%"
            fill="url(#weave-fine)"
          />
          <rect
            x="-3%"
            y="-3%"
            width="106%"
            height="106%"
            fill="url(#weave-coarse)"
            opacity="0.55"
          />
        </g>
      </svg>

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
