import { useRef, useEffect } from "react";
import { useBuddhaChat } from "@/hooks/use-buddha-chat";
import { BuddhaSprite } from "@/components/buddha-sprite";
import { ChatMessageList } from "@/components/chat-message-list";
import { ChatInput } from "@/components/chat-input";
import { motion } from "framer-motion";

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
    <div className="min-h-[100dvh] w-full flex flex-col bg-background text-foreground overflow-hidden relative">
      {/* Background texture/gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px]" />
        {/* Subtle noise texture */}
        <div 
          className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
        />
      </div>

      {/* Main Layout */}
      <main className="flex-1 flex flex-col items-center w-full max-w-5xl mx-auto px-4 py-8 md:py-12 z-10">
        
        {/* Header / Vibe Setter */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="text-center mb-8 md:mb-12"
        >
          <h1 className="text-3xl md:text-4xl font-serif text-primary font-medium tracking-tight">
            Buddha Chat
          </h1>
          <p className="text-muted-foreground mt-2 font-serif italic max-w-md mx-auto text-sm md:text-base">
            A quiet sanctuary for your thoughts.
          </p>
        </motion.header>

        {/* Centerpiece: The Buddha */}
        <div className="mb-8 md:mb-12">
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
