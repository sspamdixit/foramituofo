import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useBuddhaChat, type BuddhaState } from "@/hooks/use-buddha-chat";
import { useTypewriter } from "@/hooks/use-typewriter";
import { useVibe } from "@/hooks/use-vibe";
import { usePreachSong } from "@/hooks/use-preach-song";
import { BuddhaSprite } from "@/components/buddha-sprite";
import { ChatInput } from "@/components/chat-input";
import { PreachPlayer } from "@/components/preach-player";
import { SketchBubble } from "@/components/sketch-bubble";
import { TalismanCard } from "@/components/talisman-card";
import { VibeBackground } from "@/components/vibe-background";
import { playChime } from "@/lib/sound";
import { cn } from "@/lib/utils";

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
    <SketchBubble width="100%" tailSide="right" tailY={0.7}>
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
    <SketchBubble width="100%" tailSide="right" tailY={0.7}>
      <span className="break-words">{text}</span>
    </SketchBubble>
  );
}

/** Hand-drawn double eighth-note (the 🎶 shape, but as SVG so it inherits the
 *  hand-drawn vibe of everything else). Shown in the bubble during instrumental
 *  breaks while Buddha is "humming". */
function MusicNoteIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 64"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <ellipse
        cx="20"
        cy="48"
        rx="7.5"
        ry="5.5"
        fill="currentColor"
        transform="rotate(-22 20 48)"
      />
      <ellipse
        cx="50"
        cy="44"
        rx="7.5"
        ry="5.5"
        fill="currentColor"
        transform="rotate(-22 50 44)"
      />
      <line x1="27" y1="46" x2="27" y2="14" />
      <line x1="57" y1="42" x2="57" y2="10" />
      <path d="M27 14 L57 10 L57 19 L27 23 Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Bubble content for an instrumental break — a gently bobbing music-note */
function HummingBubble() {
  return (
    <SketchBubble width="100%" tailSide="right" tailY={0.7}>
      <motion.span
        className="inline-flex items-center justify-center w-full text-stone-700"
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <MusicNoteIcon className="w-14 h-14" />
      </motion.span>
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
  let safety = 4;
  while (avoid !== undefined && pick === avoid && safety-- > 0) {
    pick = arr[Math.floor(Math.random() * arr.length)];
  }
  return pick;
}

export default function Home() {
  const { messages, buddhaState, sendMessage, isTyping, setBuddhaStateOverride } =
    useBuddhaChat();
  const [userTyping, setUserTyping] = useState(false);
  const [override, setOverride] = useState<OverrideBubble | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [talismanText, setTalismanText] = useState<string | null>(null);

  const reactionIdxRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastIdleLineRef = useRef<string | undefined>(undefined);

  // Music is the centerpiece of monkradio — auto-play, always on.
  const {
    song: preachSong,
    currentLine: preachLine,
    status: preachStatus,
    syncOffset: preachSyncOffset,
    skip: skipSong,
    togglePlay: togglePreachPlay,
    nudgeSync: nudgePreachSync,
  } = usePreachSong(true);

  // True while a song is actively playing audio (not paused / loading / error).
  const musicPlaying = preachStatus === "playing";
  // Whenever a song is loaded (regardless of play state). Used for sprite + bubble routing.
  const hasSong = !!preachSong;

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
      // Don't drop idle thoughts on top of an existing override OR while
      // music is actively playing (we don't want non-lyric chatter mid-song).
      if (override) return;
      if (musicPlaying) return;
      const line = pickRandom(IDLE_LINES, lastIdleLineRef.current);
      lastIdleLineRef.current = line;
      setOverride({ id: `idle-${Date.now()}`, text: line, source: "idle" });
    }, IDLE_DELAY_MS);
  }, [override, musicPlaying]);

  // Kick off and reset on activity.
  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer, messages.length, userTyping]);

  // If music starts playing, immediately tear down any active idle bubble so
  // the only thing showing during a song is the lyric / humming bubble.
  useEffect(() => {
    if (musicPlaying) {
      setOverride((cur) => (cur ? null : cur));
    }
  }, [musicPlaying]);

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

  // ── Click reactions on Buddha's head ──────────────────────────────
  const handleHeadClick = useCallback(() => {
    // Don't show pop-up reactions while a song is playing — only lyrics
    // belong in the bubble during playback. The sprite still acknowledges
    // the poke briefly, but no text bubble appears.
    if (musicPlaying) {
      const reaction = HEAD_REACTIONS[reactionIdxRef.current % HEAD_REACTIONS.length];
      reactionIdxRef.current++;
      setBuddhaStateOverride(reaction.state, REACTION_HOLD_MS);
      return;
    }

    const reaction = HEAD_REACTIONS[reactionIdxRef.current % HEAD_REACTIONS.length];
    reactionIdxRef.current++;

    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    setOverride({ id: `click-${Date.now()}`, text: reaction.text, source: "click" });
    setBuddhaStateOverride(reaction.state, REACTION_HOLD_MS);

    reactionTimerRef.current = setTimeout(() => {
      setOverride((cur) => (cur && cur.source === "click" ? null : cur));
    }, REACTION_HOLD_MS);
  }, [setBuddhaStateOverride, musicPlaying]);

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

  // ── Bubble routing ────────────────────────────────────────────────
  // While music is actively playing: ONLY lyric / humming bubbles are
  // allowed — no idle thoughts, no click reactions, no chat replies.
  // While music is paused (or no song yet): the chat experience returns
  // and we can show overrides + Buddha's chat replies as usual.
  const preachSinging = musicPlaying && preachLine.trim().length > 0;
  const preachHumming = musicPlaying && hasSong && !preachSinging;

  const showLyricBubble = preachSinging;
  const showHummingBubble = preachHumming;
  const showOverrideBubble = !musicPlaying && !!override;
  const showBuddhaReplyBubble =
    !musicPlaying &&
    !override &&
    !!latestBuddha &&
    latestBuddha.content.length > 0 &&
    !isTyping &&
    !userTyping &&
    buddhaState !== "thinking";

  // Buddha's sprite mirrors the audio:
  //   singing  → speaking sprite (mouth moving)
  //   humming  → idle sprite (calm)
  //   no music or paused → driven by chat state
  const effectiveBuddhaState: BuddhaState = musicPlaying
    ? preachSinging
      ? "speaking"
      : "idle"
    : buddhaState;

  // Concatenated lyrics feed the vibe engine so the background hue
  // also reflects the song currently playing — not just the chat.
  const musicText = useMemo(() => {
    if (!preachSong) return "";
    return preachSong.lyrics.map((l) => l.text).join(" ");
  }, [preachSong]);

  const vibe = useVibe(messages, musicText);

  return (
    <div className="h-[100dvh] w-full relative overflow-hidden text-foreground">
      {/* Vibe-aware adaptive background — colors shift with the chat AND the song */}
      <VibeBackground vibe={vibe} />

      {/* Buddha — anchored right of center on desktop so the left half is
          free for a properly-sized bubble. Centered on narrow screens. */}
      <div
        className={cn(
          "absolute inset-0 z-20 flex items-center pointer-events-none pb-24",
          "justify-center md:justify-end px-4 md:pr-[7vw]",
          "buddha-fade-in",
        )}
      >
        <div className="relative pointer-events-auto">
          <BuddhaSprite
            state={effectiveBuddhaState}
            size="lg"
            onHeadClick={handleHeadClick}
          />
        </div>
      </div>

      {/* Bubble — floats top-left with a right-pointing tail toward Buddha. */}
      <div
        className={cn(
          "absolute z-30 pointer-events-none",
          "left-1/2 -translate-x-1/2 md:left-[4vw] md:translate-x-0",
        )}
        style={{
          top: "6vh",
          width: "min(92vw, 520px)",
        }}
      >
        <AnimatePresence mode="wait">
          {showOverrideBubble && override && (
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
          {showLyricBubble && (
            <motion.div
              key={`preach-line-${preachLine}`}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4, transition: { duration: 0.25 } }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <StaticThought text={preachLine} />
            </motion.div>
          )}
          {showHummingBubble && (
            <motion.div
              key="preach-humming"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4, transition: { duration: 0.25 } }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <HummingBubble />
            </motion.div>
          )}
          {showBuddhaReplyBubble && latestBuddha && (
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

      {/* BOTTOM AREA — music player is always pinned here. When the song is
          paused, the chat input slides in just BELOW the player so the user
          can talk to Buddha without losing the now-playing context. */}
      <div
        className="absolute inset-x-0 bottom-0 z-30 px-4 md:px-6 flex flex-col items-stretch gap-2"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      >
        <PreachPlayer
          song={preachSong}
          status={preachStatus}
          syncOffset={preachSyncOffset}
          onTogglePlay={togglePreachPlay}
          onSkip={skipSong}
          onNudgeSync={nudgePreachSync}
        />
        <AnimatePresence>
          {!musicPlaying && (
            <motion.div
              key="chat-input-paused"
              initial={{ opacity: 0, y: 12, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: 12, height: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <ChatInput
                onSendMessage={handleSend}
                onTypingChange={handleTypingChange}
                disabled={isTyping}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
