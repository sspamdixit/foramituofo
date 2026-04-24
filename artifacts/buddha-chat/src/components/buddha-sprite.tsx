import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { type BuddhaState } from "@/hooks/use-buddha-chat";
import { cn } from "@/lib/utils";

const SPRITE_MAP: Record<BuddhaState, string> = {
  idle: `${import.meta.env.BASE_URL}idle.png`,
  thinking: `${import.meta.env.BASE_URL}thinking.png`,
  speaking: `${import.meta.env.BASE_URL}speaking.png`,
  blessing: `${import.meta.env.BASE_URL}blessing.png`,
  refusing: `${import.meta.env.BASE_URL}refusing.png`,
};

interface BuddhaSpriteProps {
  state: BuddhaState;
  size?: "sm" | "md" | "lg" | "xl";
  preachMode?: boolean;
  onHeadClick?: () => void;
}

// Sizes are viewport-relative so Buddha never crowds the bubble or input
// on short viewports. They cap at a sensible max on large screens.
const SIZE_CLASSES: Record<NonNullable<BuddhaSpriteProps["size"]>, string> = {
  sm: "w-[min(28vmin,10rem)] h-[min(28vmin,10rem)]",
  md: "w-[min(40vmin,18rem)] h-[min(40vmin,18rem)]",
  lg: "w-[min(50vmin,22rem)] h-[min(50vmin,22rem)]",
  xl: "w-[min(58vmin,28rem)] h-[min(58vmin,28rem)]",
};

export function BuddhaSprite({
  state,
  size = "xl",
  preachMode = false,
  onHeadClick,
}: BuddhaSpriteProps) {
  const [hovering, setHovering] = useState(false);

  // Preload the other state sprites once so transitions are instant and we
  // don't see a flash of the old image while the next one downloads.
  useEffect(() => {
    Object.values(SPRITE_MAP).forEach((url) => {
      const img = new Image();
      img.src = url;
    });
  }, []);

  const src = SPRITE_MAP[state];

  // Halo intensifies when hovering — like he's sensing your energy.
  const haloScale =
    preachMode
      ? 1
      : state === "speaking"
        ? [1, 1.2, 1]
        : state === "thinking"
          ? [1, 1.05, 1]
          : hovering
            ? [1, 1.18, 1.05]
            : 1;
  const haloOpacity =
    preachMode
      ? 0.95
      : state === "speaking"
        ? [0.5, 0.8, 0.5]
        : state === "thinking"
          ? [0.3, 0.5, 0.3]
          : hovering
            ? [0.45, 0.75, 0.55]
            : 0.3;

  return (
    <motion.div
      className={cn("relative flex items-center justify-center", SIZE_CLASSES[size])}
      animate={
        preachMode
          ? { y: [0, -3, 0, 2, 0] }
          : undefined
      }
      transition={
        preachMode
          ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" }
          : undefined
      }
    >
      {/* Soft, blurred halo — pulses slowly during preach mode, brighter on hover */}
      <motion.div
        className={cn(
          "absolute inset-0 rounded-full",
          preachMode
            ? "halo-pulse bg-amber-200/60 blur-[60px]"
            : hovering
              ? "blur-3xl bg-amber-300/30 dark:bg-amber-200/30"
              : "blur-3xl bg-primary/10 dark:bg-primary/20",
        )}
        animate={
          preachMode
            ? undefined
            : {
                scale: haloScale,
                opacity: haloOpacity,
              }
        }
        transition={{
          duration: state === "speaking" ? 2 : hovering ? 1.6 : 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Sprite — the head area is interactive (cursor + hover + click). */}
      <div className="relative z-10 w-full h-full">
        <img
          src={src}
          alt={`Buddha in ${state} state`}
          className={cn(
            "w-full h-full object-contain drop-shadow-xl select-none",
            preachMode && "buddha-halo",
            hovering && !preachMode && "buddha-hover-glow",
          )}
          draggable={false}
        />
        {/* Invisible hit area over Buddha's head — top ~38% of the sprite.
            Sits ABOVE pointer-events-none parents because we set it on the
            element itself. The parent in home.tsx wraps with pointer-events:auto
            on the sprite container. */}
        {onHeadClick && (
          <button
            type="button"
            aria-label="Poke the Buddha"
            onClick={onHeadClick}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            onFocus={() => setHovering(true)}
            onBlur={() => setHovering(false)}
            className="absolute left-[28%] right-[28%] top-[10%] h-[38%] rounded-full bg-transparent cursor-pointer focus:outline-none"
            style={{ pointerEvents: "auto" }}
          />
        )}
      </div>
    </motion.div>
  );
}
