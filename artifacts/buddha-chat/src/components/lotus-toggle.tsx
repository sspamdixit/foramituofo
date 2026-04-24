import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LotusToggleProps {
  active: boolean;
  onToggle: () => void;
}

/** Round button with a hand-drawn lotus icon. Toggles "Preach Mode". */
export function LotusToggle({ active, onToggle }: LotusToggleProps) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      animate={{ rotate: active ? [0, 360] : 0 }}
      transition={{ duration: active ? 1.2 : 0.2, ease: "easeOut" }}
      aria-pressed={active}
      aria-label={active ? "Disable preach mode" : "Enable preach mode"}
      title={active ? "Preach mode is ON" : "Enable preach mode"}
      className={cn(
        "relative w-16 h-16 rounded-full flex items-center justify-center",
        "border-2 transition-colors duration-300 shadow-lg backdrop-blur",
        active
          ? "bg-amber-200/90 border-amber-500 text-rose-700"
          : "bg-white/85 border-stone-400 text-stone-600 hover:bg-white",
      )}
    >
      <LotusIcon className="w-10 h-10" />
      {active && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ boxShadow: "0 0 24px rgba(255, 200, 80, 0.85)" }}
        />
      )}
    </motion.button>
  );
}

function LotusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {/* Center petal */}
      <path d="M32 14 C 26 26 26 40 32 50 C 38 40 38 26 32 14 Z" fill="currentColor" fillOpacity="0.18" />
      {/* Left & right petals */}
      <path d="M14 28 C 22 30 28 38 30 50 C 22 50 14 44 14 28 Z" fill="currentColor" fillOpacity="0.12" />
      <path d="M50 28 C 42 30 36 38 34 50 C 42 50 50 44 50 28 Z" fill="currentColor" fillOpacity="0.12" />
      {/* Outer petals */}
      <path d="M6 38 C 14 38 22 44 28 52 C 18 54 8 50 6 38 Z" fill="currentColor" fillOpacity="0.08" />
      <path d="M58 38 C 50 38 42 44 36 52 C 46 54 56 50 58 38 Z" fill="currentColor" fillOpacity="0.08" />
      {/* Base line */}
      <path d="M10 52 Q 32 58 54 52" />
    </svg>
  );
}
