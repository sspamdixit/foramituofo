import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { PreachSong } from "@/hooks/use-preach-song";

interface LyricDecodeModalProps {
  lyric: string;
  song: PreachSong | null;
  onClose: () => void;
  onDecoded?: () => void;
}

export function LyricDecodeModal({
  lyric,
  song,
  onClose,
  onDecoded,
}: LyricDecodeModalProps) {
  const [wisdom, setWisdom] = useState("");
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const onDecodedFiredRef = useRef(false);

  useEffect(() => {
    setWisdom("");
    setLoading(true);
    setDone(false);
    onDecodedFiredRef.current = false;

    const controller = new AbortController();
    abortRef.current = controller;

    let accumulated = "";

    fetch(`${import.meta.env.BASE_URL}api/preach/decode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lyric,
        songTitle: song?.title ?? "Unknown",
        artist: song?.artist ?? "Unknown",
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok || !res.body) throw new Error("Request failed");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done: streamDone } = await reader.read();
          if (streamDone) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const dataStr = line.slice(5).trim();
            if (!dataStr) continue;
            try {
              const data = JSON.parse(dataStr) as {
                type?: string;
                text?: string;
              };
              if (data.type === "delta" && data.text) {
                accumulated += data.text;
                setWisdom(accumulated);
                setLoading(false);
              } else if (data.type === "done") {
                setDone(true);
                if (!onDecodedFiredRef.current) {
                  onDecodedFiredRef.current = true;
                  onDecoded?.();
                }
              } else if (data.type === "error") {
                setWisdom("The Monk went quiet on this one. Try again later.");
                setDone(true);
              }
            } catch {
              // parse error — skip line
            }
          }
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error("Decode error", err);
        setWisdom("The Monk went quiet on this one. Try again later.");
        setDone(true);
        setLoading(false);
      });

    return () => controller.abort();
  }, [lyric, song?.title, song?.artist, onDecoded]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[150] flex items-end justify-center p-4 pb-8 md:items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

        <motion.div
          className="relative w-full max-w-md rounded-3xl overflow-hidden"
          initial={{ y: 60, scale: 0.94, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 60, scale: 0.94, opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          style={{
            background: "rgba(12, 8, 4, 0.92)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.12)",
            fontFamily: "Nunito, ui-sans-serif, system-ui, sans-serif",
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-5 pt-5 pb-3">
            <div className="flex-1 min-w-0 mr-3">
              <div className="text-[11px] uppercase tracking-widest text-white/35 mb-1">
                🔍 Lyric Decoded
              </div>
              <p
                className="text-white/80 text-sm leading-snug italic line-clamp-2"
                style={{ fontFamily: "Georgia, serif" }}
              >
                "{lyric}"
              </p>
              {song && (
                <p className="text-white/35 text-[11px] mt-1 truncate">
                  — {song.title} · {song.artist}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/8 mx-5" />

          {/* Wisdom content */}
          <div className="px-5 py-5 min-h-[100px]">
            {loading && !wisdom && (
              <div className="flex items-center gap-2 text-white/40 text-sm">
                <span className="animate-pulse">The Monk is reading between the lines…</span>
              </div>
            )}
            {wisdom && (
              <p
                className="text-white/90 text-[15px] leading-relaxed"
                style={{ fontFamily: "Georgia, serif" }}
              >
                {wisdom}
                {!done && (
                  <span className="inline-block w-[2px] h-[0.85em] bg-white/50 align-middle ml-1 animate-pulse" />
                )}
              </p>
            )}
          </div>

          {/* Footer */}
          {done && (
            <div className="px-5 pb-5">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white/70 hover:text-white border border-white/10 hover:bg-white/8 transition-colors"
              >
                Got it
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
