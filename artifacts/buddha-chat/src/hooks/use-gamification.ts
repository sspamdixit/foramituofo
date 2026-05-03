import { useState, useCallback, useRef, useEffect } from "react";
import type { Vibe } from "./use-vibe";

export type Badge = {
  id: string;
  name: string;
  description: string;
  emoji: string;
};

export type VibeChallenge = {
  fromVibe: Vibe;
  toVibe: Vibe;
  description: string;
  completed: boolean;
  date: string;
};

const ALL_BADGES: Record<string, Badge> = {
  first_chat: {
    id: "first_chat",
    name: "First Words",
    description: "Started a chat with the Monk",
    emoji: "💬",
  },
  streak_3: {
    id: "streak_3",
    name: "3-Day Streak",
    description: "Vibed for 3 days straight",
    emoji: "🔥",
  },
  streak_7: {
    id: "streak_7",
    name: "Week of Wisdom",
    description: "7 days of daily vibing",
    emoji: "🌟",
  },
  vibe_explorer: {
    id: "vibe_explorer",
    name: "Vibe Master",
    description: "Discovered all 7 vibes",
    emoji: "🎨",
  },
  lyric_decoder: {
    id: "lyric_decoder",
    name: "Lyric Decoder",
    description: "Decoded your first lyric for hidden wisdom",
    emoji: "🔍",
  },
  snapshot_taker: {
    id: "snapshot_taker",
    name: "Vibe Sharer",
    description: "Captured your first vibe snapshot",
    emoji: "📸",
  },
  song_explorer: {
    id: "song_explorer",
    name: "Song Explorer",
    description: "Skipped through 10 songs",
    emoji: "🎵",
  },
  challenge_complete: {
    id: "challenge_complete",
    name: "Challenge Accepted",
    description: "Completed a vibe challenge",
    emoji: "⚡",
  },
  deep_thinker: {
    id: "deep_thinker",
    name: "Deep Thinker",
    description: "Asked the Monk about life and existence",
    emoji: "🌊",
  },
};

const CHALLENGE_MAP: Record<Vibe, { to: Vibe; desc: string }> = {
  calm: { to: "joyful", desc: "Find a song that sparks pure joy" },
  joyful: { to: "deep", desc: "Find a track that makes you think deeply" },
  melancholy: { to: "bliss", desc: "Find a song that fills you with peace" },
  fiery: { to: "chill", desc: "Find a chill track to cool the flames" },
  bliss: { to: "fiery", desc: "Find a fiery song to ignite your spirit" },
  deep: { to: "chill", desc: "Find a chill song to breathe and settle" },
  chill: { to: "melancholy", desc: "Find a track that moves you to feel deeply" },
};

const DEEP_KEYWORDS = [
  "why", "meaning", "purpose", "exist", "soul", "universe", "death", "life",
  "real", "consciousness", "truth", "god", "infinity", "fate", "destiny",
];

const LS = {
  streak: "monk-streak-count",
  streakDate: "monk-streak-date",
  badges: "monk-badges",
  vibes: "monk-vibes-discovered",
  skips: "monk-songs-skipped",
  challenge: "monk-daily-challenge",
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable
  }
}

function updateStreak(): { streak: number; newBadge: Badge | null } {
  const today = todayStr();
  const lastDate = lsGet<string>(LS.streakDate, "");
  let streak = lsGet<number>(LS.streak, 0);

  if (lastDate === today) return { streak, newBadge: null };

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (lastDate === yesterdayStr) {
    streak += 1;
  } else {
    streak = 1;
  }

  lsSet(LS.streak, streak);
  lsSet(LS.streakDate, today);

  const earnedBadges = lsGet<string[]>(LS.badges, []);
  if (streak >= 7 && !earnedBadges.includes("streak_7")) {
    const updated = [...earnedBadges, "streak_7"];
    lsSet(LS.badges, updated);
    return { streak, newBadge: ALL_BADGES.streak_7 };
  }
  if (streak >= 3 && !earnedBadges.includes("streak_3")) {
    const updated = [...earnedBadges, "streak_3"];
    lsSet(LS.badges, updated);
    return { streak, newBadge: ALL_BADGES.streak_3 };
  }
  return { streak, newBadge: null };
}

export function useGamification() {
  const [streak, setStreak] = useState(() => lsGet<number>(LS.streak, 0));
  const [earnedBadges, setEarnedBadges] = useState<Badge[]>(() => {
    const ids = lsGet<string[]>(LS.badges, []);
    return ids.map((id) => ALL_BADGES[id]).filter(Boolean);
  });
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  const [challenge, setChallenge] = useState<VibeChallenge | null>(() => {
    return lsGet<VibeChallenge | null>(LS.challenge, null);
  });

  const newBadgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const awardBadge = useCallback((id: string) => {
    const badge = ALL_BADGES[id];
    if (!badge) return;
    setEarnedBadges((prev) => {
      if (prev.find((b) => b.id === id)) return prev;
      const updated = [...prev, badge];
      lsSet(LS.badges, updated.map((b) => b.id));
      return updated;
    });
    setNewBadge(badge);
    if (newBadgeTimerRef.current) clearTimeout(newBadgeTimerRef.current);
    newBadgeTimerRef.current = setTimeout(() => setNewBadge(null), 4000);
  }, []);

  // Update streak on mount
  useEffect(() => {
    const { streak: s, newBadge: b } = updateStreak();
    setStreak(s);
    if (b) {
      setNewBadge(b);
      if (newBadgeTimerRef.current) clearTimeout(newBadgeTimerRef.current);
      newBadgeTimerRef.current = setTimeout(() => setNewBadge(null), 4000);
    }
  }, []);

  const onChatSent = useCallback(
    (messageText: string) => {
      const ids = lsGet<string[]>(LS.badges, []);
      if (!ids.includes("first_chat")) {
        awardBadge("first_chat");
      }
      const lower = messageText.toLowerCase();
      if (!ids.includes("deep_thinker") && DEEP_KEYWORDS.some((kw) => lower.includes(kw))) {
        awardBadge("deep_thinker");
      }
    },
    [awardBadge],
  );

  const onLyricDecoded = useCallback(() => {
    const ids = lsGet<string[]>(LS.badges, []);
    if (!ids.includes("lyric_decoder")) {
      awardBadge("lyric_decoder");
    }
  }, [awardBadge]);

  const onSnapshotTaken = useCallback(() => {
    const ids = lsGet<string[]>(LS.badges, []);
    if (!ids.includes("snapshot_taker")) {
      awardBadge("snapshot_taker");
    }
  }, [awardBadge]);

  const onSongSkipped = useCallback(() => {
    const count = lsGet<number>(LS.skips, 0) + 1;
    lsSet(LS.skips, count);
    if (count >= 10) {
      const ids = lsGet<string[]>(LS.badges, []);
      if (!ids.includes("song_explorer")) {
        awardBadge("song_explorer");
      }
    }
  }, [awardBadge]);

  const onVibeChanged = useCallback(
    (vibe: Vibe) => {
      // Track discovered vibes
      const discovered = new Set(lsGet<Vibe[]>(LS.vibes, []));
      discovered.add(vibe);
      lsSet(LS.vibes, [...discovered]);
      if (discovered.size >= 7) {
        const ids = lsGet<string[]>(LS.badges, []);
        if (!ids.includes("vibe_explorer")) {
          awardBadge("vibe_explorer");
        }
      }

      // Check if challenge is completed
      setChallenge((cur) => {
        if (!cur || cur.completed) return cur;
        if (vibe === cur.toVibe) {
          const updated: VibeChallenge = { ...cur, completed: true };
          lsSet(LS.challenge, updated);
          const ids = lsGet<string[]>(LS.badges, []);
          if (!ids.includes("challenge_complete")) {
            // Award after a short delay so the challenge banner shows first
            setTimeout(() => awardBadge("challenge_complete"), 600);
          }
          return updated;
        }
        return cur;
      });

      // Generate a new challenge if none exists or it's a new day
      setChallenge((cur) => {
        const today = todayStr();
        if (cur && cur.date === today) return cur;
        const mapping = CHALLENGE_MAP[vibe];
        const newChallenge: VibeChallenge = {
          fromVibe: vibe,
          toVibe: mapping.to,
          description: mapping.desc,
          completed: false,
          date: today,
        };
        lsSet(LS.challenge, newChallenge);
        return newChallenge;
      });
    },
    [awardBadge],
  );

  const dismissChallenge = useCallback(() => {
    lsSet(LS.challenge, null);
    setChallenge(null);
  }, []);

  return {
    streak,
    earnedBadges,
    newBadge,
    challenge,
    onChatSent,
    onLyricDecoded,
    onSnapshotTaken,
    onSongSkipped,
    onVibeChanged,
    dismissChallenge,
  };
}
