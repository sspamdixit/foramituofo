import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type ChatMessage } from "@/hooks/use-buddha-chat";
import { cn } from "@/lib/utils";
import { ComicBubble } from "@/components/comic-bubble";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isTyping: boolean;
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

/** Buddha bubble (history). The latest one types itself out. */
function HistoryBuddhaBubble({ text, animate }: { text: string; animate: boolean }) {
  const { displayed, done } = useTypewriter(text, animate);
  return (
    <ComicBubble mood="speak" size="sm">
      <span className="break-words">{displayed}</span>
      {animate && !done && (
        <span className="inline-block w-[2px] h-[1em] bg-foreground/70 align-middle ml-1 animate-pulse" />
      )}
    </ComicBubble>
  );
}

/** User bubble — pinned to the right with a soft pastel fill and a left-pointing tail. */
function UserBubble({ text }: { text: string }) {
  return (
    <div className="relative max-w-[85%]">
      <div className="user-bubble px-5 py-3 rounded-2xl rounded-br-md shadow-sm text-base leading-relaxed font-sans">
        {text}
      </div>
      {/* Soft tail jutting from the bottom-right toward the user side */}
      <span
        aria-hidden
        className="absolute -right-1 bottom-1 w-3 h-3 rotate-45 user-bubble"
        style={{ borderRadius: "0 0 6px 0", borderLeft: "none", borderTop: "none" }}
      />
    </div>
  );
}

export function ChatMessageList({ messages, isTyping }: ChatMessageListProps) {
  // Find the index of the last buddha message — that one gets the typewriter.
  let lastBuddhaIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "buddha") {
      lastBuddhaIdx = i;
      break;
    }
  }

  if (messages.length === 0 && !isTyping) return null;

  return (
    <div className="flex flex-col gap-5 py-4 px-2 md:px-4 w-full">
      <AnimatePresence initial={false}>
        {messages.map((msg, idx) => (
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
              <UserBubble text={msg.content} />
            ) : (
              <HistoryBuddhaBubble
                text={msg.content}
                animate={idx === lastBuddhaIdx}
              />
            )}
          </motion.div>
        ))}

        {isTyping && (
          <motion.div
            key="typing-indicator"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex w-full justify-start"
          >
            <ComicBubble mood="think" size="sm">
              <span className="inline-flex items-center gap-2 px-2 py-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.3s]" />
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.15s]" />
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-foreground/40 animate-bounce" />
              </span>
            </ComicBubble>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
