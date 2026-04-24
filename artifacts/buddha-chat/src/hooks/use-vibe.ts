import { useMemo } from "react";
import type { ChatMessage } from "./use-buddha-chat";

export type Vibe =
  | "calm"
  | "joyful"
  | "melancholy"
  | "fiery"
  | "bliss"
  | "deep"
  | "chill";

const VIBE_KEYWORDS: Record<Exclude<Vibe, "calm">, string[]> = {
  joyful: [
    "lol", "lmao", "haha", "hehe", "rofl",
    "love", "loved", "happy", "excited", "stoked", "yay", "yes!",
    "amazing", "awesome", "incredible", "based", "fire", "lit",
    "let's go", "lfg", "best", "great", "win", "winning", "good news",
  ],
  melancholy: [
    "sad", "cry", "crying", "cried", "tears",
    "miss", "missed", "lonely", "alone", "lost",
    "hurt", "hurts", "broken", "break up", "breakup",
    "grief", "grieving", "depressed", "depression",
    "tired", "exhausted", "empty", "numb", "drained",
  ],
  fiery: [
    "angry", "anger", "hate", "mad", "pissed",
    "fuck", "fucked", "shit", "damn",
    "frustrated", "frustration", "rage", "furious",
    "annoyed", "annoying", "betrayed", "fed up",
  ],
  bliss: [
    "bless", "blessed", "blessing",
    "peace", "peaceful", "thank", "thanks", "thank you",
    "grateful", "gratitude", "beautiful",
    "sacred", "holy", "love you",
  ],
  deep: [
    "why", "meaning", "purpose", "exist", "existence",
    "soul", "universe", "cosmos", "death", "dying",
    "life", "real", "reality", "consciousness", "truth",
    "god", "infinity", "eternal", "fate", "destiny",
  ],
  chill: [
    "chill", "chilling", "relax", "relaxed",
    "vibe", "vibing", "ok", "okay", "fine",
    "cool", "alright", "good", "breathe", "calm",
  ],
};

const VIBE_PRIORITY: Array<Exclude<Vibe, "calm">> = [
  "fiery",
  "melancholy",
  "bliss",
  "deep",
  "joyful",
  "chill",
];

function scoreVibes(text: string): Record<Exclude<Vibe, "calm">, number> {
  const haystack = ` ${text.toLowerCase()} `;
  const scores = {
    joyful: 0,
    melancholy: 0,
    fiery: 0,
    bliss: 0,
    deep: 0,
    chill: 0,
  };
  for (const vibe of VIBE_PRIORITY) {
    for (const kw of VIBE_KEYWORDS[vibe]) {
      let i = haystack.indexOf(kw);
      while (i !== -1) {
        const before = haystack[i - 1];
        const after = haystack[i + kw.length];
        const isWordBoundary =
          (before === undefined || /[^a-z0-9]/.test(before)) &&
          (after === undefined || /[^a-z0-9]/.test(after));
        if (isWordBoundary) scores[vibe] += 1;
        i = haystack.indexOf(kw, i + kw.length);
      }
    }
  }
  return scores;
}

/**
 * Pick the vibe of the recent conversation, optionally blended with the
 * vibe of a song's lyrics so the background reacts to both the chat tone
 * AND the music currently playing.
 *
 * - Looks at the last 6 messages
 * - Weights more recent messages heavier
 * - Considers the user's words first, then Buddha's reply
 * - If `musicText` is provided (e.g. concatenated lyrics), it's folded in
 *   with a moderate weight so music can drive the mood when chat is quiet.
 * - Returns "calm" when nothing notable lights up
 */
export function useVibe(messages: ChatMessage[], musicText?: string): Vibe {
  return useMemo(() => {
    const recent = messages.slice(-6);
    if (recent.length === 0 && !musicText) return "calm";

    const totals: Record<Exclude<Vibe, "calm">, number> = {
      joyful: 0,
      melancholy: 0,
      fiery: 0,
      bliss: 0,
      deep: 0,
      chill: 0,
    };

    recent.forEach((msg, idx) => {
      const recencyWeight = 1 + idx * 0.6;
      const roleWeight = msg.role === "user" ? 1.4 : 1;
      const scores = scoreVibes(msg.content ?? "");
      for (const v of VIBE_PRIORITY) {
        totals[v] += scores[v] * recencyWeight * roleWeight;
      }
    });

    if (musicText && musicText.trim().length > 0) {
      const scores = scoreVibes(musicText);
      // Lyrics tend to repeat keywords, so dampen each hit. Still strong
      // enough to drive the mood when no chat activity is happening.
      for (const v of VIBE_PRIORITY) {
        totals[v] += scores[v] * 0.35;
      }
    }

    let best: Exclude<Vibe, "calm"> | null = null;
    let bestScore = 0;
    for (const v of VIBE_PRIORITY) {
      if (totals[v] > bestScore) {
        bestScore = totals[v];
        best = v;
      }
    }

    if (best && bestScore >= 1) return best;
    return "calm";
  }, [messages, musicText]);
}
