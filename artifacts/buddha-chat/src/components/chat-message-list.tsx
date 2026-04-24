import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type ChatMessage } from "@/hooks/use-buddha-chat";
import { cn } from "@/lib/utils";
import { ComicBubble } from "@/components/comic-bubble";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isTyping: boolean;
  /** When true, the latest buddha message is rendered elsewhere (above the
   *  buddha as a thought bubble) and should be skipped here. */
  hideLatestBuddha?: boolean;
}

const TYPEWRITER_SPEED_MS = 28;

export function useTypewriter(text: string, animate: boolean) {
  const [displayed, setDisplayed] = useState(animate ? "" : text);
  const textRef = useRef(text);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    if (!animate) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setDisplayed(text);
      return;
    }

    setDisplayed((prev) => (text.startsWith(prev) ? prev : ""));

    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      setDisplayed((prev) => {
        const target = textRef.current;
        if (prev.length >= target.length) return prev;
        return target.slice(0, prev.length + 1);
      });
    }, TYPEWRITER_SPEED_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text, animate]);

  return { displayed, done: displayed.length >= text.length };
}

function HistoryBuddhaBubble({ text }: { text: string }) {
  return (
    <ComicBubble mood="speak" size="sm">
      <span className="break-words">{text}</span>
    </ComicBubble>
  );
}

export function ChatMessageList({
  messages,
  isTyping,
  hideLatestBuddha = false,
}: ChatMessageListProps) {
  // Find the index of the last buddha message
  let lastBuddhaIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "buddha") {
      lastBuddhaIdx = i;
      break;
    }
  }

  const visible = hideLatestBuddha
    ? messages.filter((_, idx) => idx !== lastBuddhaIdx)
    : messages;

  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-5 py-4 px-2 md:px-8 w-full max-w-2xl mx-auto">
      <AnimatePresence initial={false}>
        {visible.map((msg) => (
          <motion.div
            key={msg.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={cn(
              "flex w-full",
              msg.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {msg.role === "user" ? (
              <div className="px-5 py-3 rounded-2xl max-w-[85%] shadow-sm text-base leading-relaxed bg-white/95 text-foreground rounded-br-sm font-sans">
                {msg.content}
              </div>
            ) : (
              <HistoryBuddhaBubble text={msg.content} />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
