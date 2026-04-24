import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useBuddhaChat, type BuddhaState } from "@/hooks/use-buddha-chat";
import { useTypewriter } from "@/hooks/use-typewriter";
import { BuddhaSprite } from "@/components/buddha-sprite";
import { ChatInput } from "@/components/chat-input";
import { LotusToggle } from "@/components/lotus-toggle";
import { SketchBubble } from "@/components/sketch-bubble";
import { TalismanCard } from "@/components/talisman-card";
import { playChime } from "@/lib/sound";
import { cn } from "@/lib/utils";

/** Stub for hooking up YouTube/Spotify in the future. */
function playPreachMusic(active: boolean) {
  // eslint-disable-next-line no-console
  console.info(`[playPreachMusic] preach mode is now ${active ? "ON" : "OFF"}`);
}

/** Lines Buddha quietly drops if you go silent for a while. */
const IDLE_LINES = [
  "Just vibing?",
  "The silence is actually crazy, bro.",
  "You good? Or just buffering?",
  "Lowkey I can hear you thinking from here.",
  "Touch grass. Or type. Either works.",
  "The void is listening too, fyi.",
  "Take your time. The cosmos isn't on a deadline.",
];

/** Click reactions cycle in this order. */
const HEAD_REACTIONS: Array<{ text: string; state: BuddhaState }> = [
  { text: "Ay, watch the hair-equivalent.", state: "blessing" },
  { text: "You just poked a deity. +10 karma.", state: "speaking" },
  { text: "Bro. We've been over this.", state: "speaking" },
  { text: "I'm enlightened, not ticklish.", state: "blessing" },
];

/** Blessings that print on the talisman card. */
const TALISMAN_LINES = [
  "May your wifi be strong and your group chats be drama-free.",
  "May your ego shrink and your patience stretch.",
  "May the algorithm serve you, not the other way around.",
  "May you laugh at things you used to cry about.",
  "May your next breath feel like the first good one all day.",
];

const IDLE_DELAY_MS = 20_000;
const REACTION_HOLD_MS = 2_600;
const BLESS_FLASH_MS = 1_600;

/** Renders text inside the sketch bubble with typewriter. */
function CurrentTeaching({
  text,
  isLatest,
}: {
  text: string;
  isLatest: boolean;
}) {
  const { displayed, done } = useTypewriter(text, isLatest);
  return (
    <SketchBubble width="min(560px, 92vw, 49vh)">
      <span className="break-words">{displayed}</span>
      {isLatest && !done && (
        <span className="inline-block w-[2px] h-[0.9em] bg-foreground/70 align-middle ml-1 animate-pulse" />
      )}
    </SketchBubble>
  );
}

/** Static (non-typewriter) bubble for click reactions and idle thoughts. */
function StaticThought({ text }: { text: string }) {
  return (
    <SketchBubble width="min(420px, 88vw, 40vh)">
      <span className="break-words">{text}</span>
    </SketchBubble>
  );
}

type OverrideBubble = {
  id: string;
  text: string;
  source: "click" | "idle";
};

function pickRandom<T>(arr: T[], avoid?: T): T {
  if (arr.length === 1) return arr[0];
  let pick = arr[Math.floor(Math.random() * arr.length)];
  // Avoid repeating the same idle line back-to-back when possible.
  let safety = 4;
  while (avoid !== undefined && pick === avoid && safety-- > 0) {
    pick = arr[Math.floor(Math.random() * arr.length)];
  }
  return pick;
}

export default function Home() {
  const { messages, buddhaState, sendMessage, isTyping, setBuddhaStateOverride } =
    useBuddhaChat();
  const [preachMode, setPreachMode] = useState(false);
  const [userTyping, setUserTyping] = useState(false);
  const [override, setOverride] = useState<OverrideBubble | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [talismanText, setTalismanText] = useState<string | null>(null);

  const reactionIdxRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastIdleLineRef = useRef<string | undefined>(undefined);

  const latestBuddha = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "buddha") return messages[i];
    }
    if (typeof window !== "undefined" && window.location.search.includes("demo=1")) {
      return {
        id: "demo",
        role: "buddha" as const,
        content: "Yo. Welcome to the meditation cushion, bro.",
        createdAt: new Date(),
        isStreaming: false,
      };
    }
    return null;
  }, [messages]);

  // Reset idle timer whenever something interesting happens.
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      // Only fire if Buddha isn't actively doing something else.
      if (override) return;
      const line = pickRandom(IDLE_LINES, lastIdleLineRef.current);
      lastIdleLineRef.current = line;
      setOverride({ id: `idle-${Date.now()}`, text: line, source: "idle" });
    }, IDLE_DELAY_MS);
  }, [override]);

  // Kick off and reset on activity.
  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer, messages.length, userTyping]);

  // Auto-clear an idle bubble after a while so the chat bubble can return.
  useEffect(() => {
    if (!override || override.source !== "idle") return;
    const t = setTimeout(() => setOverride(null), 5_000);
    return () => clearTimeout(t);
  }, [override]);

  // Soft chime each time a new Buddha teaching appears.
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

  // ── Click reactions on Buddha's head ──────────────────────────────
  const handleHeadClick = useCallback(() => {
    const reaction = HEAD_REACTIONS[reactionIdxRef.current % HEAD_REACTIONS.length];
    reactionIdxRef.current++;

    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    setOverride({ id: `click-${Date.now()}`, text: reaction.text, source: "click" });
    setBuddhaStateOverride(reaction.state, REACTION_HOLD_MS);

    reactionTimerRef.current = setTimeout(() => {
      setOverride((cur) => (cur && cur.source === "click" ? null : cur));
    }, REACTION_HOLD_MS);
  }, [setBuddhaStateOverride]);

  // ── "bless" easter egg ────────────────────────────────────────────
  const triggerTalisman = useCallback(() => {
    setShowFlash(true);
    setBuddhaStateOverride("blessing", 2_000);
    setOverride(null);
    setTimeout(() => setShowFlash(false), BLESS_FLASH_MS);
    setTimeout(() => {
      setTalismanText(pickRandom(TALISMAN_LINES));
    }, 600);
  }, [setBuddhaStateOverride]);

  const handleSend = useCallback(
    (text: string) => {
      // Clear any reaction/idle bubble immediately when user speaks.
      setOverride(null);
      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);

      // Easter-egg: any message containing "bless" as a whole word.
      if (/\bbless\b/i.test(text)) {
        triggerTalisman();
      }
      sendMessage(text);
    },
    [sendMessage, triggerTalisman],
  );

  // When user starts typing a new message, dissolve the old bubble.
  const handleTypingChange = useCallback((typing: boolean) => {
    setUserTyping(typing);
    if (typing) {
      setOverride((cur) => (cur && cur.source === "idle" ? null : cur));
    }
  }, []);

  // ── Bubble selection logic ────────────────────────────────────────
  // Override (click reaction / idle thought) wins over the chat bubble.
  // While the user is typing, dissolve the chat bubble too.
  const showBubble =
    !!override ||
    (!!latestBuddha &&
      latestBuddha.content.length > 0 &&
      !isTyping &&
      !userTyping &&
      buddhaState !== "thinking");

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

      {/* PREACH MODE: full-screen sunset wash + grain */}
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

      {/* Buddha — visual anchor; bubble floats above his head like a thought. */}
      <div
        className={cn(
          "absolute inset-0 z-20 flex items-center justify-center pointer-events-none px-4 pb-24",
          "buddha-fade-in",
        )}
      >
        <div className="relative pointer-events-auto">
          {/* Bubble: bottom edge sits just above Buddha's head crown. */}
          <div
            className="absolute left-1/2 -translate-x-1/2 flex justify-center pointer-events-none"
            style={{ bottom: "88%" }}
          >
            <AnimatePresence mode="wait">
              {showBubble && override && (
                <motion.div
                  key={override.id}
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.3 } }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  <StaticThought text={override.text} />
                </motion.div>
              )}
              {showBubble && !override && latestBuddha && (
                <motion.div
                  key={latestBuddha.id}
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.35 } }}
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

          {/* Buddha sprite — clickable head, hover halo, preach bounce. */}
          <BuddhaSprite
            state={buddhaState}
            preachMode={preachMode}
            size="xl"
            onHeadClick={handleHeadClick}
          />
        </div>
      </div>

      {/* Bless-flash overlay */}
      <AnimatePresence>
        {showFlash && (
          <div
            key="flash"
            className="absolute inset-0 z-[55] pointer-events-none bless-flash"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Talisman card */}
      <AnimatePresence>
        {talismanText && (
          <TalismanCard
            blessing={talismanText}
            onDismiss={() => setTalismanText(null)}
          />
        )}
      </AnimatePresence>

      {/* MINIMAL INPUT — single elegant line, hand-drawn underline, bottom-center */}
      <div
        className="absolute inset-x-0 bottom-0 z-30 px-6"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <ChatInput
          onSendMessage={handleSend}
          onTypingChange={handleTypingChange}
          disabled={isTyping}
        />
      </div>
    </div>
  );
}
