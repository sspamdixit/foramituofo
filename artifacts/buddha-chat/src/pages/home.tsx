import { useRef, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useBuddhaChat } from "@/hooks/use-buddha-chat";
import { BuddhaSprite } from "@/components/buddha-sprite";
import { ChatMessageList, useTypewriter } from "@/components/chat-message-list";
import { ChatInput } from "@/components/chat-input";
import { ThoughtBubble } from "@/components/thought-bubble";

function LatestThought({
  text,
  isStreaming,
}: {
  text: string;
  isStreaming: boolean;
}) {
  const { displayed, done } = useTypewriter(text, true);
  const showCursor = isStreaming || !done;

  return (
    <ThoughtBubble showTail size="lg">
      <span className="break-words">{displayed}</span>
      {showCursor && (
        <span className="inline-block w-[2px] h-[1em] bg-foreground/70 align-middle ml-1 animate-pulse" />
      )}
    </ThoughtBubble>
  );
}

function ThinkingThought() {
  return (
    <ThoughtBubble showTail size="sm">
      <span className="inline-flex items-center gap-1.5 px-2 py-1">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.3s]" />
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.15s]" />
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-foreground/40 animate-bounce" />
      </span>
    </ThoughtBubble>
  );
}

export default function Home() {
  const { messages, buddhaState, sendMessage, isTyping } = useBuddhaChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Find latest buddha message to render as the floating thought
  let lastBuddha: (typeof messages)[number] | null = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "buddha") {
      lastBuddha = messages[i];
      break;
    }
  }

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isTyping]);

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col text-foreground overflow-hidden relative"
      style={{
        backgroundImage: `url(${import.meta.env.BASE_URL}bg-tile.png)`,
        backgroundRepeat: "repeat",
        backgroundSize: "256px 256px",
      }}
    >
      <main className="flex-1 flex flex-col items-center w-full max-w-5xl mx-auto px-4 py-6 md:py-10 z-10">
        {/* Buddha + thought bubble (a single visual unit) */}
        <div className="mt-4 md:mt-8 mb-6 md:mb-10 flex flex-col items-center w-full">
          {/* Slot above buddha for the thought bubble — keeps the buddha
              vertically anchored even when the bubble is empty. */}
          <div className="w-full flex justify-center min-h-[7rem] md:min-h-[9rem] items-end pb-2">
            <AnimatePresence mode="wait">
              {lastBuddha && lastBuddha.content.length > 0 ? (
                <LatestThought
                  key={lastBuddha.id}
                  text={lastBuddha.content}
                  isStreaming={!!lastBuddha.isStreaming}
                />
              ) : isTyping ? (
                <ThinkingThought key="thinking" />
              ) : null}
            </AnimatePresence>
          </div>

          <BuddhaSprite state={buddhaState} />
        </div>

        {/* Conversation history (older messages; hides the latest buddha
            since it's already floating above the sprite). */}
        <div
          ref={scrollRef}
          className="flex-1 w-full overflow-y-auto mb-6 no-scrollbar"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent, black 5%, black 95%, transparent)",
            WebkitMaskImage:
              "-webkit-linear-gradient(top, transparent, black 5%, black 95%, transparent)",
          }}
        >
          <div className="min-h-full flex flex-col justify-end pb-4">
            <ChatMessageList
              messages={messages}
              isTyping={isTyping}
              hideLatestBuddha
            />
          </div>
        </div>

        {/* Input */}
        <div className="w-full shrink-0 pt-2 pb-4">
          <ChatInput onSendMessage={sendMessage} disabled={isTyping} />
        </div>
      </main>
    </div>
  );
}
