import { useRef, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useBuddhaChat, type BuddhaState } from "@/hooks/use-buddha-chat";
import { BuddhaSprite } from "@/components/buddha-sprite";
import { ChatMessageList, useTypewriter } from "@/components/chat-message-list";
import { ChatInput } from "@/components/chat-input";
import { ComicBubble, type BubbleMood } from "@/components/comic-bubble";

function moodForState(state: BuddhaState): BubbleMood {
  switch (state) {
    case "thinking":
      return "think";
    case "blessing":
      return "bless";
    case "refusing":
      return "refuse";
    case "speaking":
    case "idle":
    default:
      return "speak";
  }
}

function LatestThought({
  text,
  isStreaming,
  mood,
}: {
  text: string;
  isStreaming: boolean;
  mood: BubbleMood;
}) {
  const { displayed, done } = useTypewriter(text, true);
  const showCursor = isStreaming || !done;

  return (
    <ComicBubble mood={mood} showTrail size="lg">
      <span className="break-words">{displayed}</span>
      {showCursor && (
        <span className="inline-block w-[2px] h-[1em] bg-foreground/70 align-middle ml-1 animate-pulse" />
      )}
    </ComicBubble>
  );
}

function ThinkingThought() {
  return (
    <ComicBubble mood="think" showTrail size="sm">
      <span className="inline-flex items-center gap-2 px-2 py-1">
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.3s]" />
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.15s]" />
        <span className="inline-block w-2.5 h-2.5 rounded-full bg-foreground/40 animate-bounce" />
      </span>
    </ComicBubble>
  );
}

export default function Home() {
  const { messages, buddhaState, sendMessage, isTyping } = useBuddhaChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Find the latest buddha message to render as the floating thought.
  let lastBuddha: (typeof messages)[number] | null = null;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "buddha") {
      lastBuddha = messages[i];
      break;
    }
  }

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
        {/* Buddha + comic bubble */}
        <div className="mt-4 md:mt-8 mb-6 md:mb-10 flex flex-col items-center w-full">
          <div className="w-full flex justify-center min-h-[8rem] md:min-h-[10rem] items-end pb-6">
            <AnimatePresence mode="wait">
              {lastBuddha && lastBuddha.content.length > 0 ? (
                <LatestThought
                  key={lastBuddha.id}
                  text={lastBuddha.content}
                  isStreaming={!!lastBuddha.isStreaming}
                  mood={moodForState(buddhaState)}
                />
              ) : isTyping ? (
                <ThinkingThought key="thinking" />
              ) : null}
            </AnimatePresence>
          </div>

          <BuddhaSprite state={buddhaState} />
        </div>

        {/* Conversation history */}
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

        <div className="w-full shrink-0 pt-2 pb-4">
          <ChatInput onSendMessage={sendMessage} disabled={isTyping} />
        </div>
      </main>
    </div>
  );
}
