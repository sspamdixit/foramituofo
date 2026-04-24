import { motion } from "framer-motion";

interface TalismanCardProps {
  blessing: string;
  onDismiss: () => void;
}

/**
 * Hand-drawn "Digital Talisman" — a centered, screenshottable card the
 * user receives when the easter-egg word is spoken. Pure SVG so it scales
 * crisply for screenshots at any resolution.
 */
export function TalismanCard({ blessing, onDismiss }: TalismanCardProps) {
  // Cycle the blessing line into the card. Keep it short.
  const stamp = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <motion.div
      role="dialog"
      aria-label="Digital Talisman"
      onClick={onDismiss}
      className="absolute inset-0 z-50 flex items-center justify-center px-4 pointer-events-auto cursor-pointer"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Backdrop wash so the card pops */}
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" />

      <motion.div
        initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        exit={{ scale: 0.7, opacity: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className="relative talisman-float"
      >
        <svg
          viewBox="0 0 360 540"
          className="block w-[78vmin] max-w-[420px] talisman-glow"
          aria-hidden="true"
        >
          {/* Outer hand-drawn rounded card */}
          <defs>
            <linearGradient id="parchment" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#fff7e2" />
              <stop offset="60%" stopColor="#fde2a6" />
              <stop offset="100%" stopColor="#f6c879" />
            </linearGradient>
            <radialGradient id="goldGlow" cx="50%" cy="38%" r="55%">
              <stop offset="0%" stopColor="#fff7c2" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#fff7c2" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Wobbly card body */}
          <path
            d="M 30 28 Q 24 22 32 18 L 326 16 Q 340 18 338 32 L 342 506 Q 340 520 326 520 L 36 522 Q 22 520 24 506 Z"
            fill="url(#parchment)"
            stroke="#3b2a16"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Inner hand-drawn frame */}
          <path
            d="M 50 56 L 312 50 L 316 484 L 46 488 Z"
            fill="none"
            stroke="#7a4f1d"
            strokeWidth="1.6"
            strokeDasharray="0"
            strokeLinecap="round"
            opacity="0.65"
          />

          {/* Top glow */}
          <ellipse cx="180" cy="186" rx="120" ry="120" fill="url(#goldGlow)" />

          {/* Lotus mandala — inline hand-drawn */}
          <g transform="translate(180 196)" stroke="#5a3210" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" fill="none">
            {/* 8-petal lotus */}
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (i * 360) / 8;
              return (
                <g key={i} transform={`rotate(${angle})`}>
                  <path d="M 0 -10 C -22 -36 -22 -82 0 -110 C 22 -82 22 -36 0 -10 Z"
                    fill="#fff5d2" fillOpacity="0.55" />
                </g>
              );
            })}
            {/* Center seed */}
            <circle r="14" fill="#f6c252" stroke="#5a3210" strokeWidth="2" />
            <circle r="6" fill="#7a4f1d" />
            {/* Halo dashes */}
            {Array.from({ length: 24 }).map((_, i) => {
              const angle = (i * 360) / 24;
              const rad = (angle * Math.PI) / 180;
              const r1 = 122;
              const r2 = 134;
              return (
                <line
                  key={`r-${i}`}
                  x1={Math.cos(rad) * r1}
                  y1={Math.sin(rad) * r1}
                  x2={Math.cos(rad) * r2}
                  y2={Math.sin(rad) * r2}
                  stroke="#7a4f1d"
                  strokeWidth="1.4"
                  opacity="0.7"
                />
              );
            })}
          </g>

          {/* Title */}
          <text
            x="180"
            y="86"
            textAnchor="middle"
            fontFamily="PencilSRB, Caveat, cursive"
            fontSize="28"
            fill="#3b2a16"
          >
            Digital Talisman
          </text>

          {/* Blessing body — hand-written line */}
          <foreignObject x="42" y="346" width="276" height="120">
            <div
              style={{
                fontFamily: "PencilSRB, Caveat, cursive",
                fontSize: "20px",
                lineHeight: 1.25,
                color: "#3b2a16",
                textAlign: "center",
                padding: "0 4px",
              }}
            >
              {blessing}
            </div>
          </foreignObject>

          {/* Footer stamp */}
          <text
            x="180"
            y="492"
            textAnchor="middle"
            fontFamily="PencilSRB, Caveat, cursive"
            fontSize="14"
            fill="#5a3210"
            opacity="0.85"
          >
            granted by The Chillest Monk · {stamp}
          </text>
          <text
            x="180"
            y="510"
            textAnchor="middle"
            fontFamily="Nunito, sans-serif"
            fontSize="10"
            fill="#5a3210"
            opacity="0.6"
          >
            tap anywhere to keep walking
          </text>
        </svg>
      </motion.div>
    </motion.div>
  );
}
