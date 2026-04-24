import { useEffect, useRef, useState } from "react";
import { useBuddhaChat } from "@/hooks/use-buddha-chat";
import { BuddhaSprite } from "@/components/buddha-sprite";
import { ChatMessageList } from "@/components/chat-message-list";
import { ChatInput } from "@/components/chat-input";
import { LotusToggle } from "@/components/lotus-toggle";
import { cn } from "@/lib/utils";

/** Stub for hooking up YouTube/Spotify in the future. */
function playPreachMusic(active: boolean) {
  // TODO: integrate with YouTube IFrame Player API or Spotify Web Playback SDK.
  // For now we just log so the wiring is visible.
  // eslint-disable-next-line no-console
  console.info(`[playPreachMusic] preach mode is now ${active ? "ON" : "OFF"}`);
}

export default function Home() {
  const { messages, buddhaState, sendMessage, isTyping } = useBuddhaChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [preachMode, setPreachMode] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isTyping]);

  const togglePreach = () => {
    setPreachMode((prev) => {
      const next = !prev;
      playPreachMusic(next);
      return next;
    });
  };

  return (
    <div
      className={cn(
        "h-[100dvh] w-full flex flex-col text-foreground overflow-hidden relative",
        preachMode && "preach-bg",
      )}
      style={
        preachMode
          ? undefined
          : {
              backgroundImage: `url(${import.meta.env.BASE_URL}bg-tile.png)`,
              backgroundRepeat: "repeat",
              backgroundSize: "256px 256px",
            }
      }
    >
      {/* Lotus toggle pinned top-right */}
      <div className="absolute top-3 right-3 z-30">
        <LotusToggle active={preachMode} onToggle={togglePreach} />
      </div>

      {/* Main split-screen: chat 60% (left) | buddha 40% (right). Stacks on mobile. */}
      <main className="flex-1 min-h-0 w-full flex flex-col md:flex-row max-w-[1600px] mx-auto">
        {/* CHAT COLUMN: 60% on desktop, bottom half on mobile */}
        <section className="flex flex-col min-h-0 flex-1 md:basis-3/5 md:max-w-[60%] order-2 md:order-1 px-3 md:px-6 pt-2 md:pt-6 pb-3 md:pb-6">
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto no-scrollbar"
            style={{
              maskImage:
                "linear-gradient(to bottom, transparent, black 5%, black 95%, transparent)",
              WebkitMaskImage:
                "-webkit-linear-gradient(top, transparent, black 5%, black 95%, transparent)",
            }}
          >
            <div className="min-h-full flex flex-col justify-end">
              <ChatMessageList messages={messages} isTyping={isTyping} />
            </div>
          </div>

          {/* Input pinned to bottom of the chat column */}
          <div
            className="w-full shrink-0 pt-3"
            style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
          >
            <ChatInput onSendMessage={sendMessage} disabled={isTyping} />
          </div>
        </section>

        {/* BUDDHA COLUMN: 40% on desktop (sticky/fixed feel), top strip on mobile */}
        <aside
          className={cn(
            "flex items-end md:items-center justify-center md:justify-end shrink-0",
            "order-1 md:order-2 md:basis-2/5 md:max-w-[40%]",
            "px-2 md:px-6 pt-3 md:pt-0 pb-1 md:pb-0",
            // On mobile use a smaller fixed strip; on desktop fill the column
            "h-[34vh] md:h-auto md:self-stretch",
          )}
        >
          {/* On mobile, use a smaller sprite size */}
          <div className="hidden md:block">
            <BuddhaSprite state={buddhaState} size="xl" preachMode={preachMode} />
          </div>
          <div className="md:hidden">
            <BuddhaSprite state={buddhaState} size="md" preachMode={preachMode} />
          </div>
        </aside>
      </main>
    </div>
  );
}
