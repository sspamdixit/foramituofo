import { useRef, useEffect } from "react";
import { useBuddhaChat } from "@/hooks/use-buddha-chat";
import { BuddhaSprite } from "@/components/buddha-sprite";
import { ChatMessageList } from "@/components/chat-message-list";
import { ChatInput } from "@/components/chat-input";

export default function Home() {
  const { messages, buddhaState, sendMessage, isTyping } = useBuddhaChat();
  const scrollRef = useRef<HTMLDivElement>(null);

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
      {/* Main Layout */}
      <main className="flex-1 flex flex-col items-center w-full max-w-5xl mx-auto px-4 py-8 md:py-12 z-10">

        {/* Centerpiece: The Buddha */}
        <div className="mt-8 md:mt-16 mb-8 md:mb-12">
          <BuddhaSprite state={buddhaState} />
        </div>

        {/* Messages Area */}
        <div 
          ref={scrollRef}
          className="flex-1 w-full overflow-y-auto mb-6 no-scrollbar mask-edges"
          style={{ 
            maskImage: "linear-gradient(to bottom, transparent, black 5%, black 95%, transparent)",
            WebkitMaskImage: "-webkit-linear-gradient(top, transparent, black 5%, black 95%, transparent)"
          }}
        >
          <div className="min-h-full flex flex-col justify-end pb-4">
            <ChatMessageList messages={messages} isTyping={isTyping} />
          </div>
        </div>

        {/* Input Area */}
        <div className="w-full shrink-0 pt-2 pb-4">
          <ChatInput onSendMessage={sendMessage} disabled={isTyping} />
        </div>

      </main>
    </div>
  );
}
