import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useBuddhaChat } from "@/hooks/use-buddha-chat";
import { useTypewriter } from "@/hooks/use-typewriter";
import { BuddhaSprite } from "@/components/buddha-sprite";
import { ChatInput } from "@/components/chat-input";
import { LotusToggle } from "@/components/lotus-toggle";
import { SketchBubble } from "@/components/sketch-bubble";
import { playChime } from "@/lib/sound";
import { cn } from "@/lib/utils";

/** Stub for hooking up YouTube/Spotify in the future. */
function playPreachMusic(active: boolean) {
  // eslint-disable-next-line no-console
  console.info(`[playPreachMusic] preach mode is now ${active ? "ON" : "OFF"}`);
}

/** Renders the latest Buddha message inside the sketch bubble, with typewriter. */
function CurrentTeaching({
  text,
  isLatest,
}: {
  text: string;
  isLatest: boolean;
}) {
  const { displayed, done } = useTypewriter(text, isLatest);
  return (
    // Width is bounded by viewport WIDTH and viewport HEIGHT so the bubble
    // (which has a fixed aspect ratio) never overflows the slot vertically
    // on short or wide screens. 49vh keeps the bubble height under ~22vh.
    <SketchBubble width="min(560px, 92vw, 49vh)">
      <span className="break-words">{displayed}</span>
      {isLatest && !done && (
        <span className="inline-block w-[2px] h-[0.9em] bg-foreground/70 align-middle ml-1 animate-pulse" />
      )}
    </SketchBubble>
  );
}

export default function Home() {
  const { messages, buddhaState, sendMessage, isTyping } = useBuddhaChat();
  const [preachMode, setPreachMode] = useState(false);

  const latestBuddha = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "buddha") return messages[i];
    }
    if (typeof window !== "undefined" && window.location.search.includes("demo=1")) {
      return {
        id: "demo",
        role: "buddha" as const,
        content: "Hello. May your mind be at ease this moment.",
        createdAt: new Date(),
        isStreaming: false,
      };
    }
    return null;
  }, [messages]);

  // Single-bubble logic: while Buddha is "thinking" (no tokens yet) the old
  // bubble vanishes. Once content starts streaming, the new bubble fades in.
  const showBubble =
    !!latestBuddha &&
    latestBuddha.content.length > 0 &&
    !isTyping &&
    buddhaState !== "thinking";

  // Soft singing-bowl chime each time a new Buddha teaching appears.
  const chimedIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!latestBuddha || latestBuddha.content.length === 0) return;
    if (chimedIdRef.current === latestBuddha.id) return;
    chimedIdRef.current = latestBuddha.id;
    playChime();
  }, [latestBuddha?.id, latestBuddha?.content.length]);

  const togglePreach = () => {
    setPreachMode((prev) => {
      const next = !prev;
      playPreachMusic(next);
      return next;
    });
  };

  const tilePath = `${import.meta.env.BASE_URL}bg-tile.png`;

  return (
    <div className="h-[100dvh] w-full relative overflow-hidden text-foreground">
      {/* Base sandstone tile */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${tilePath})`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

      {/* PREACH MODE: full-screen overlay with sunset wash + vibrating grain */}
      <AnimatePresence>
        {preachMode && (
          <motion.div
            key="preach-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 z-10 pointer-events-none preach-bg"
          >
            <div
              className="absolute inset-0 preach-grain"
              style={{
                backgroundImage: `url(${tilePath})`,
                backgroundRepeat: "repeat",
                backgroundSize: "256px 256px",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lotus toggle pinned top-right */}
      <div className="absolute top-3 right-3 z-40">
        <LotusToggle active={preachMode} onToggle={togglePreach} />
      </div>

      {/*
        Buddha is the visual anchor — he stays centered in the viewport. The
        bubble is absolutely positioned above his head, so its tail TIP always
        lines up with the top of his head regardless of viewport size or how
        tall the bubble grows to fit text.
      */}
      <div
        className={cn(
          "absolute inset-0 z-20 flex items-center justify-center pointer-events-none px-4 pb-24",
          "buddha-fade-in",
        )}
      >
        <div className="relative">
          {/* Bubble: bottom edge sits just above Buddha's head crown.
              `bottom: 88%` accounts for the transparent padding above his head
              in the PNG sprite. The wrapper's left:50% + -translate-x-1/2
              centers the bubble container on Buddha's vertical axis; inside
              the bubble, the tail tip is itself shifted to that same axis. */}
          <div
            className="absolute left-1/2 -translate-x-1/2 flex justify-center"
            style={{ bottom: "88%" }}
          >
            <AnimatePresence mode="wait">
              {showBubble && latestBuddha && (
                <motion.div
                  key={latestBuddha.id}
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.45 } }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                >
                  <CurrentTeaching
                    text={latestBuddha.content}
                    isLatest={latestBuddha.isStreaming === true || buddhaState === "speaking"}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Buddha — focal centerpoint, sized via vmin so he scales with the viewport. */}
          <BuddhaSprite state={buddhaState} preachMode={preachMode} size="xl" />
        </div>
      </div>

      {/* MINIMAL INPUT — single elegant line, hand-drawn underline, bottom-center */}
      <div
        className="absolute inset-x-0 bottom-0 z-30 px-6"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <ChatInput onSendMessage={sendMessage} disabled={isTyping} />
      </div>
    </div>
  );
}
