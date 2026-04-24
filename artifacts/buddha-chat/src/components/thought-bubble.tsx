import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ThoughtBubbleProps {
  children: React.ReactNode;
  showTail?: boolean;
  size?: "lg" | "sm";
  className?: string;
}

/**
 * Pure-CSS thought bubble (no images).
 * `showTail` renders the trailing puff-dots that point down to the buddha.
 */
export function ThoughtBubble({
  children,
  showTail = false,
  size = "lg",
  className,
}: ThoughtBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 240, damping: 20 }}
      className={cn(
        "thought-bubble",
        size === "lg"
          ? "max-w-[28rem] min-w-[10rem] text-2xl md:text-3xl"
          : "max-w-[22rem] text-xl md:text-2xl",
        className,
      )}
    >
      {children}
      {showTail && (
        <div className="thought-tail" aria-hidden="true">
          <div className="thought-tail__dot thought-tail__dot--lg" />
          <div className="thought-tail__dot thought-tail__dot--md" />
          <div className="thought-tail__dot thought-tail__dot--sm" />
        </div>
      )}
    </motion.div>
  );
}
