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

const QUIET_SRC = SPRITE_MAP.idle;
const TALKING_SRC = SPRITE_MAP.speaking;

interface BuddhaSpriteProps {
  state: BuddhaState;
  size?: "sm" | "md" | "lg" | "xl";
  preachMode?: boolean;
}

// Sizes are viewport-relative so Buddha never crowds the bubble or input
// on short viewports. They cap at a sensible max on large screens.
const SIZE_CLASSES: Record<NonNullable<BuddhaSpriteProps["size"]>, string> = {
  sm: "w-[min(28vmin,10rem)] h-[min(28vmin,10rem)]",
  md: "w-[min(40vmin,18rem)] h-[min(40vmin,18rem)]",
  lg: "w-[min(50vmin,22rem)] h-[min(50vmin,22rem)]",
  xl: "w-[min(58vmin,28rem)] h-[min(58vmin,28rem)]",
};

export function BuddhaSprite({ state, size = "xl", preachMode = false }: BuddhaSpriteProps) {
  // Toggle between "quiet" and "talking" frames every 250ms while speaking,
  // to fake a mouth animation in sync with the typewriter effect.
  const [mouthOpen, setMouthOpen] = useState(false);
  useEffect(() => {
    if (state !== "speaking") {
      setMouthOpen(false);
      return;
    }
    const id = setInterval(() => setMouthOpen((o) => !o), 250);
    return () => clearInterval(id);
  }, [state]);

  const src =
    state === "speaking"
      ? mouthOpen
        ? TALKING_SRC
        : QUIET_SRC
      : SPRITE_MAP[state];

  return (
    <div className={cn("relative flex items-center justify-center", SIZE_CLASSES[size])}>
      {/* Soft, blurred halo — pulses slowly during preach mode */}
      <motion.div
        className={cn(
          "absolute inset-0 rounded-full",
          preachMode
            ? "halo-pulse bg-amber-200/60 blur-[60px]"
            : "blur-3xl bg-primary/10 dark:bg-primary/20",
        )}
        animate={
          preachMode
            ? undefined
            : {
                scale:
                  state === "speaking"
                    ? [1, 1.2, 1]
                    : state === "thinking"
                      ? [1, 1.05, 1]
                      : 1,
                opacity:
                  state === "speaking"
                    ? [0.5, 0.8, 0.5]
                    : state === "thinking"
                      ? [0.3, 0.5, 0.3]
                      : 0.3,
              }
        }
        transition={{
          duration: state === "speaking" ? 2 : 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Sprite — no breathing animation, just a subtle bob while thinking. */}
      <div className="relative z-10 w-full h-full">
        <img
          src={src}
          alt={`Buddha in ${state} state`}
          className={cn(
            "w-full h-full object-contain drop-shadow-xl select-none",
            preachMode && "buddha-halo",
          )}
          draggable={false}
        />
      </div>
    </div>
  );
}
