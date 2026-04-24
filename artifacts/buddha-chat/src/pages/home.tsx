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
      <main className="flex-1 flex flex-col w-full max-w-7xl mx-auto px-4 py-4 md:py-6 z-10 min-h-[100dvh]">
        {/* Two-column area: chat list on the left, buddha + floating bubble on the right */}
        <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 overflow-hidden">
          {/* LEFT: Conversation history */}
          <div
            ref={scrollRef}
            className="w-full md:w-2/5 md:max-w-md overflow-y-auto no-scrollbar order-2 md:order-1"
            style={{
              maskImage:
                "linear-gradient(to bottom, transparent, black 6%, black 94%, transparent)",
              WebkitMaskImage:
                "-webkit-linear-gradient(top, transparent, black 6%, black 94%, transparent)",
            }}
          >
            <div className="min-h-full flex flex-col justify-end pb-4 pr-2">
              <ChatMessageList
                messages={messages}
                isTyping={isTyping}
                hideLatestBuddha
              />
            </div>
          </div>

          {/* RIGHT: Buddha + floating bubble (tail points right at buddha) */}
          <div className="flex-1 flex items-center justify-end gap-2 md:gap-4 pr-2 md:pr-6 order-1 md:order-2 min-h-[20rem]">
            {/* Reserved bubble slot so buddha doesn't shift when it appears */}
            <div className="flex-1 max-w-[22rem] md:max-w-[26rem] flex justify-end items-center">
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

            <BuddhaSprite state={buddhaState} size="xl" />
          </div>
        </div>

        <div className="w-full shrink-0 pt-3 pb-2">
          <ChatInput onSendMessage={sendMessage} disabled={isTyping} />
        </div>
      </main>
    </div>
  );
}
