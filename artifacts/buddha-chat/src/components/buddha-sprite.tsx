import { motion } from "framer-motion";
import { type BuddhaState } from "@/hooks/use-buddha-chat";

// Update these to match the generated file paths once they're ready
const SPRITE_MAP: Record<BuddhaState, string> = {
  idle: "/idle.png",
  thinking: "/thinking.png",
  speaking: "/speaking.png",
};

interface BuddhaSpriteProps {
  state: BuddhaState;
}

export function BuddhaSprite({ state }: BuddhaSpriteProps) {
  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80 mx-auto flex items-center justify-center">
      {/* Subtle glowing aura */}
      <motion.div
        className="absolute inset-0 rounded-full bg-primary/10 dark:bg-primary/20 blur-3xl"
        animate={{
          scale: state === "speaking" ? [1, 1.2, 1] : state === "thinking" ? [1, 1.05, 1] : 1,
          opacity: state === "speaking" ? [0.5, 0.8, 0.5] : state === "thinking" ? [0.3, 0.5, 0.3] : 0.3,
        }}
        transition={{
          duration: state === "speaking" ? 2 : 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <motion.div
        className="relative z-10 w-full h-full"
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
          src={SPRITE_MAP[state]}
          alt={`Buddha in ${state} state`}
          className="w-full h-full object-contain drop-shadow-xl"
        />
      </motion.div>

      {/* Floating particles/petals for extra magic */}
      {state === "speaking" && (
        <motion.div 
          className="absolute -top-10 left-1/2 w-4 h-4 bg-primary/30 rounded-full blur-sm"
          animate={{
            y: [-20, -100],
            x: [0, Math.random() * 40 - 20],
            opacity: [0, 0.8, 0],
            scale: [1, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut"
          }}
        />
      )}
    </div>
  );
}
