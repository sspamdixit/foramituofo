import { motion, AnimatePresence } from "framer-motion";
import type { Badge } from "@/hooks/use-gamification";

interface AchievementToastProps {
  badge: Badge | null;
}

export function AchievementToast({ badge }: AchievementToastProps) {
  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          key={badge.id}
          initial={{ opacity: 0, y: -60, scale: 0.88 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.9, transition: { duration: 0.3 } }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] pointer-events-none"
          style={{ fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif" }}
        >
          <div
            className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border border-white/20"
            style={{
              background: "rgba(15,10,5,0.88)",
              backdropFilter: "blur(20px)",
            }}
          >
            <motion.span
              className="text-3xl leading-none"
              animate={{ rotate: [0, -10, 10, -6, 6, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              {badge.emoji}
            </motion.span>
            <div>
              <div className="text-[13px] font-bold text-white leading-tight">
                Badge Unlocked — {badge.name}
              </div>
              <div className="text-[11px] text-white/55 leading-tight mt-0.5">
                {badge.description}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
