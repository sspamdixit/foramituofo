import { Router, type IRouter } from "express";

const router: IRouter = Router();

type Song = {
  title: string;
  artist: string;
  /** YouTube video ID — preferred official audio/video uploads. */
  videoId: string;
};

/** Curated pool. All have well-known synced lyrics on lrclib.net and
 *  long-stable official video uploads on YouTube. */
const SONGS: Song[] = [
  { title: "Imagine", artist: "John Lennon", videoId: "YkgkThdzX-8" },
  { title: "Let It Be", artist: "The Beatles", videoId: "QDYfEBY9NM4" },
  { title: "Hey Jude", artist: "The Beatles", videoId: "A_MjCqQoLLA" },
  { title: "Stand by Me", artist: "Ben E. King", videoId: "hwZNL7QVJjE" },
  { title: "Wonderwall", artist: "Oasis", videoId: "bx1Bh8ZvH84" },
  { title: "Riptide", artist: "Vance Joy", videoId: "uJ_1HMAGb4k" },
  { title: "Counting Stars", artist: "OneRepublic", videoId: "hT_nvWreIhg" },
  { title: "Fix You", artist: "Coldplay", videoId: "k4V3Mo61fJM" },
  { title: "Lemon Tree", artist: "Fools Garden", videoId: "1LWzV4KdC1g" },
  { title: "Ho Hey", artist: "The Lumineers", videoId: "zvCBSSwgtg4" },
  { title: "The Sound of Silence", artist: "Simon & Garfunkel", videoId: "4fWyzwo1xg0" },
  { title: "Skinny Love", artist: "Bon Iver", videoId: "ssdgFoHLwnk" },
];

type LyricLine = { time: number; text: string };

/** Parse standard `[mm:ss.xx]` LRC lines into sorted timestamps. */
function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    // Some lrc files have multiple timestamps per line, e.g. "[00:12.34][01:23.45]Text"
    const matches = [...raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    if (matches.length === 0) continue;
    const text = raw.replace(/\[\d+:\d+(?:\.\d+)?\]/g, "").trim();
    if (text.length === 0) continue;
    for (const m of matches) {
      const time = parseInt(m[1], 10) * 60 + parseFloat(m[2]);
      lines.push({ time, text });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

/** Fetch a high-res album cover from the public iTunes Search API.
 *  Returns null on any failure so the player just renders without art. */
async function fetchArtwork(
  title: string,
  artist: string,
): Promise<string | null> {
  const url =
    "https://itunes.apple.com/search?" +
    new URLSearchParams({
      term: `${title} ${artist}`,
      entity: "song",
      limit: "1",
    }).toString();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!r.ok) return null;
    const data = (await r.json()) as {
      results?: Array<{ artworkUrl100?: string }>;
    };
    const art = data.results?.[0]?.artworkUrl100;
    if (!art) return null;
    // iTunes serves 100×100 by default; swap for higher res.
    return art.replace("100x100", "600x600");
  } catch {
    return null;
  }
}

router.get("/preach/song", async (req, res) => {
  // Try songs in random order until we find one with usable synced lyrics.
  const shuffled = [...SONGS].sort(() => Math.random() - 0.5);

  for (const song of shuffled) {
    const url =
      "https://lrclib.net/api/get?" +
      new URLSearchParams({
        artist_name: song.artist,
        track_name: song.title,
      }).toString();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const r = await fetch(url, {
        headers: { "User-Agent": "buddha-chat/1.0 (preach mode)" },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!r.ok) continue;
      const data = (await r.json()) as { syncedLyrics?: string | null };
      const synced = data.syncedLyrics?.trim();
      if (!synced) continue;
      const lyrics = parseLrc(synced);
      if (lyrics.length < 4) continue;

      // Best-effort album art lookup — non-blocking failure
      const artworkUrl = await fetchArtwork(song.title, song.artist);

      res.json({
        title: song.title,
        artist: song.artist,
        videoId: song.videoId,
        artworkUrl,
        lyrics,
      });
      return;
    } catch (err) {
      req.log.warn({ err, song }, "lrclib lookup failed; trying next song");
    }
  }

  res.status(503).json({ error: "No song with lyrics available right now." });
});

export default router;
