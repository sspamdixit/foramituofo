import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type ChatMessage } from "@/hooks/use-buddha-chat";
import { cn } from "@/lib/utils";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isTyping: boolean;
}

const TYPEWRITER_SPEED_MS = 28;

function useTypewriter(text: string, animate: boolean) {
  const [displayed, setDisplayed] = useState(animate ? "" : text);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!animate) {
      setDisplayed(text);
      return;
    }

    setDisplayed("");
    let i = 0;
    intervalRef.current = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
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

function BuddhaSpeechBubble({
  text,
  animate,
}: {
  text: string;
  animate: boolean;
}) {
  const { displayed, done } = useTypewriter(text, animate);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className="relative inline-block max-w-[28rem] min-w-[11rem]"
      style={{
        backgroundImage: `url(${import.meta.env.BASE_URL}bubble.png)`,
        backgroundSize: "100% 100%",
        backgroundRepeat: "no-repeat",
        filter: "drop-shadow(0 6px 14px rgba(0,0,0,0.18))",
      }}
    >
      <div className="px-10 pt-7 pb-20 text-foreground text-base md:text-lg leading-snug font-medium break-words">
        {displayed}
        {animate && !done && (
          <span className="inline-block w-[2px] h-[1em] bg-foreground/70 align-middle ml-0.5 animate-pulse" />
        )}
      </div>
    </motion.div>
  );
}

export function ChatMessageList({ messages, isTyping }: ChatMessageListProps) {
  if (messages.length === 0 && !isTyping) {
    return null;
  }

  // Find the index of the last buddha message — only that one animates.
  let lastBuddhaIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "buddha") {
      lastBuddhaIdx = i;
      break;
    }
  }

  return (
    <div className="flex flex-col gap-5 py-4 px-2 md:px-8 w-full max-w-2xl mx-auto">
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
              <div className="px-5 py-3 rounded-2xl max-w-[85%] shadow-sm text-base leading-relaxed bg-white/95 text-foreground rounded-br-sm">
                {msg.content}
              </div>
            ) : (
              <BuddhaSpeechBubble
                text={msg.content}
                animate={idx === lastBuddhaIdx}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {isTyping && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-start w-full"
        >
          <div className="px-5 py-3 text-white/85 text-sm tracking-wide">
            <span className="inline-block w-2 h-2 rounded-full bg-white/85 mr-1 animate-bounce [animation-delay:-0.3s]" />
            <span className="inline-block w-2 h-2 rounded-full bg-white/85 mr-1 animate-bounce [animation-delay:-0.15s]" />
            <span className="inline-block w-2 h-2 rounded-full bg-white/85 animate-bounce" />
          </div>
        </motion.div>
      )}
    </div>
  );
}
