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

// "quiet" / "talking" pair used to fake mouth movement during speech.
const QUIET_SRC = SPRITE_MAP.idle;
const TALKING_SRC = SPRITE_MAP.speaking;

interface BuddhaSpriteProps {
  state: BuddhaState;
  size?: "sm" | "md" | "lg" | "xl";
  preachMode?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<BuddhaSpriteProps["size"]>, string> = {
  sm: "w-32 h-32 md:w-40 md:h-40",
  md: "w-64 h-64 md:w-80 md:h-80",
  lg: "w-72 h-72 md:w-96 md:h-96",
  xl: "w-72 h-72 md:w-[26rem] md:h-[26rem] lg:w-[30rem] lg:h-[30rem]",
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
      {/* Subtle aura — warmer/larger when preaching */}
      <motion.div
        className={cn(
          "absolute inset-0 rounded-full blur-3xl",
          preachMode ? "bg-amber-300/50" : "bg-primary/10 dark:bg-primary/20",
        )}
        animate={{
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
                : preachMode
                  ? [0.4, 0.7, 0.4]
                  : 0.3,
        }}
        transition={{
          duration: state === "speaking" ? 2 : 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Inner wrapper: handles bobbing + breathing */}
      <motion.div
        className="buddha-breathe relative z-10 w-full h-full"
        animate={{
          y: state === "thinking" ? [0, -5, 0] : [0, -2, 0],
        }}
        transition={{
          duration: state === "thinking" ? 2 : 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <img
          src={src}
          alt={`Buddha in ${state} state`}
          className={cn(
            "w-full h-full object-contain drop-shadow-xl select-none",
            preachMode && "buddha-halo",
          )}
          draggable={false}
        />
      </motion.div>

      {/* Floating particle when actively speaking */}
      {state === "speaking" && (
        <motion.div
          className="absolute -top-10 left-1/2 w-4 h-4 bg-primary/30 rounded-full blur-sm"
          animate={{
            y: [-20, -100],
            x: [0, 20],
            opacity: [0, 0.8, 0],
            scale: [1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      )}
    </div>
  );
}
