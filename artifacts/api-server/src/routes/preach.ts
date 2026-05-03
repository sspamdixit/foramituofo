import { Router, type IRouter } from "express";
import { Readable } from "node:stream";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";

const execFileAsync = promisify(execFile);

/** Locate the yt-dlp binary installed by pip in the Replit Python libs dir. */
function findYtdlp(): string {
  const candidates = [
    "/home/runner/workspace/.pythonlibs/bin/yt-dlp",
    "/usr/local/bin/yt-dlp",
    "/usr/bin/yt-dlp",
    "yt-dlp", // fallback – rely on PATH
  ];
  return candidates.find((p) => p === "yt-dlp" || existsSync(p)) ?? "yt-dlp";
}
const YTDLP = findYtdlp();

const router: IRouter = Router();

type LyricLine = { time: number; text: string };

/** A pool of well-known artists across genres / eras. The picker grabs one
 *  at random, then asks lrclib for that artist's catalog of synced lyrics
 *  and Lavalink for a matching audio track — so any popular track from these
 *  artists can come up, not just a hand-curated 12. Add more freely. */
const ARTISTS: string[] = [
  // Hip-hop / rap
  "Kanye West", "Drake", "Kendrick Lamar", "J. Cole", "Travis Scott",
  "Tyler, the Creator", "Eminem", "Jay-Z", "Nas", "Outkast",
  "A Tribe Called Quest", "Lauryn Hill", "Frank Ocean", "Childish Gambino",
  "Mac Miller", "Doja Cat", "Lil Wayne", "Missy Elliott", "Snoop Dogg",
  "Kid Cudi", "Run the Jewels", "André 3000",
  // Pop
  "Lady Gaga", "Taylor Swift", "Beyoncé", "Rihanna", "Ariana Grande",
  "Billie Eilish", "Dua Lipa", "Olivia Rodrigo", "Adele", "Ed Sheeran",
  "Bruno Mars", "Justin Bieber", "Harry Styles", "The Weeknd",
  "Sabrina Carpenter", "SZA", "Charli XCX", "Katy Perry", "Pink",
  "Sia", "Miley Cyrus", "Shawn Mendes",
  // Rock / classic rock
  "The Beatles", "Queen", "Led Zeppelin", "Pink Floyd", "Jimi Hendrix",
  "The Rolling Stones", "David Bowie", "Fleetwood Mac", "The Doors",
  "Bob Dylan", "Bruce Springsteen", "The Who", "Eagles", "AC/DC",
  "Guns N' Roses", "Nirvana", "Radiohead", "Red Hot Chili Peppers",
  "Arctic Monkeys", "Coldplay", "Oasis", "U2", "The Strokes",
  "The Killers", "Foo Fighters", "Pearl Jam", "Soundgarden",
  "Green Day", "Blink-182", "Linkin Park",
  // Singer-songwriter / folk
  "Bon Iver", "Sufjan Stevens", "Phoebe Bridgers", "Hozier",
  "Florence + The Machine", "Ben Howard", "Mumford & Sons",
  "Iron & Wine", "Vance Joy", "The Lumineers", "Joni Mitchell",
  "Leonard Cohen", "Paul Simon", "Simon & Garfunkel", "Cat Stevens",
  "Joan Baez", "James Taylor", "Carole King", "Neil Young",
  // Soul / R&B / funk
  "Stevie Wonder", "Marvin Gaye", "Aretha Franklin", "Ray Charles",
  "Sam Cooke", "Otis Redding", "Etta James", "Whitney Houston",
  "Prince", "Michael Jackson", "D'Angelo", "Erykah Badu", "Solange",
  "H.E.R.", "Anderson .Paak", "Daniel Caesar", "Steve Lacy",
  "Bill Withers", "Curtis Mayfield", "Al Green",
  // Indie / alt
  "Tame Impala", "MGMT", "Vampire Weekend", "Arcade Fire", "Fleet Foxes",
  "The National", "Beach House", "Mitski", "Lana Del Rey", "Lorde",
  "Alex G", "Big Thief", "boygenius", "Death Cab for Cutie",
  "Modest Mouse", "Yeah Yeah Yeahs",
  // Electronic / dance
  "Daft Punk", "Disclosure", "Flume", "ODESZA", "Bonobo", "Kaytranada",
  "Justice", "M83", "James Blake", "Burial", "Four Tet",
  // Latin / world / other
  "Bad Bunny", "Rosalía", "Karol G", "Shakira", "Manu Chao",
  "Caetano Veloso", "Fela Kuti", "Ali Farka Touré",
  // Country / Americana
  "Johnny Cash", "Willie Nelson", "Dolly Parton", "Kacey Musgraves",
  "Chris Stapleton", "Sturgill Simpson",
  // Jazz / standards
  "Frank Sinatra", "Ella Fitzgerald", "Nina Simone", "Billie Holiday",
  "Louis Armstrong", "Norah Jones",
];

// ─── lrclib types ────────────────────────────────────────────────────────────
type LrcLibSearchResult = {
  id: number;
  trackName: string;
  artistName: string;
  albumName: string;
  duration: number | null;
  instrumental: boolean;
  plainLyrics: string | null;
  syncedLyrics: string | null;
};

/** Parse standard `[mm:ss.xx]` LRC lines into sorted timestamps. */
function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
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

/** Fetch high-res album art from the iTunes Search API. Best-effort. */
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
    return art.replace("100x100", "600x600");
  } catch {
    return null;
  }
}

/** Loose normalize for fuzzy artist-name matching ("Beyonce" ≈ "Beyoncé"). */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

/** Fetch the artist's catalog of tracks that have synced lyrics on lrclib. */
async function fetchSyncedSongsForArtist(
  artist: string,
): Promise<LrcLibSearchResult[]> {
  const url =
    "https://lrclib.net/api/search?" +
    new URLSearchParams({ q: artist }).toString();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const r = await fetch(url, {
      headers: { "User-Agent": "monkradio/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!r.ok) return [];
    const data = (await r.json()) as LrcLibSearchResult[];
    const target = norm(artist);
    return data.filter(
      (d) =>
        !!d.syncedLyrics &&
        !d.instrumental &&
        norm(d.artistName).includes(target),
    );
  } catch {
    return [];
  }
}

// ─── Lavalink public nodes ────────────────────────────────────────────────────
// These are freely-shared community Lavalink v4 nodes. Multiple nodes are
// tried in order so a single outage doesn't block track resolution.
type LavalinkNode = {
  host: string;
  port: number;
  password: string;
  secure: boolean;
};

const LAVALINK_NODES: LavalinkNode[] = [
  { host: "lavalink.devamop.in",       port: 443,   password: "DevamOP",                 secure: true  },
  { host: "lava.link",                port: 80,    password: "discloud",                secure: false },
  { host: "lavalinkv4.serenetia.com",  port: 443,   password: "https://dsc.gg/cantina",  secure: true  },
  { host: "lavalink.jirayu.net",      port: 13592, password: "youshallnotpass",         secure: false },
];

type LavalinkTrackInfo = {
  identifier: string; // YouTube video ID
  title: string;
  author: string;
  length: number;    // duration in milliseconds
  uri: string;
};

/** Search public Lavalink nodes for a YouTube track matching `query`.
 *  Returns the top result's info, or null if all nodes are unreachable. */
async function findTrackViaLavalink(
  query: string,
): Promise<LavalinkTrackInfo | null> {
  for (const node of LAVALINK_NODES) {
    try {
      const protocol = node.secure ? "https" : "http";
      const url =
        `${protocol}://${node.host}:${node.port}/v4/loadtracks?identifier=` +
        encodeURIComponent(`ytsearch:${query}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const r = await fetch(url, {
        headers: { Authorization: node.password },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!r.ok) continue;
      const data = (await r.json()) as {
        loadType: string;
        data?: Array<{ info: LavalinkTrackInfo }>;
      };
      if (
        data.loadType === "search" &&
        Array.isArray(data.data) &&
        data.data.length > 0
      ) {
        return data.data[0].info;
      }
    } catch {
      // Node unreachable — try the next one
    }
  }
  return null;
}

// In-memory cache: "<artist>::<title>" → { videoId, duration }. Persists for
// the life of the server so repeat plays skip the Lavalink round-trip.
type TrackCacheEntry = { videoId: string; duration: number };
const trackCache = new Map<string, TrackCacheEntry>();
const cacheKey = (artist: string, title: string) =>
  norm(artist) + "::" + norm(title);

// ─── Audio format cache ───────────────────────────────────────────────────────
// Caches the direct YouTube CDN URL so we only call yt-dlp once per track.
// YouTube CDN URLs expire in ~6 h — we evict after 4 h to stay safe.
type AudioEntry = {
  url: string;
  mimeType: string;
  contentLength: number;
  expiry: number;
};
const audioCache = new Map<string, AudioEntry>();

// Ongoing resolutions: prevents parallel yt-dlp calls for the same videoId.
const resolutionInFlight = new Map<string, Promise<AudioEntry>>();

async function resolveAudioUrl(videoId: string): Promise<AudioEntry> {
  const cached = audioCache.get(videoId);
  if (cached && Date.now() < cached.expiry) return cached;

  // Deduplicate concurrent requests for the same video
  const existing = resolutionInFlight.get(videoId);
  if (existing) return existing;

  const promise = (async (): Promise<AudioEntry> => {
    try {
      // Let yt-dlp pick the best client automatically (it defaults to
      // ANDROID_VR which doesn't need a PO Token and works from server IPs).
      const { stdout } = await execFileAsync(
        YTDLP,
        [
          "-f", "bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio",
          "--get-url",
          "--no-playlist",
          "--quiet",
          `https://www.youtube.com/watch?v=${videoId}`,
        ],
        { timeout: 30_000 },
      );

      // stdout is just the URL (warnings go to stderr when --quiet is active)
      const url = stdout.trim().split(/\s+/).find((l) => l.startsWith("http"));
      if (!url) throw new Error("yt-dlp returned no URL");

      // The YouTube CDN URL embeds clen (content-length) and mime in its query
      const parsed = new URL(url);
      const clen = parseInt(parsed.searchParams.get("clen") ?? "0", 10);
      const mimeRaw = parsed.searchParams.get("mime") ?? "";
      const mimeType = mimeRaw || (url.includes("itag=140") ? "audio/mp4" : "audio/webm");

      const entry: AudioEntry = {
        url,
        mimeType,
        contentLength: clen,
        expiry: Date.now() + 4 * 60 * 60 * 1000,
      };
      audioCache.set(videoId, entry);
      return entry;
    } finally {
      resolutionInFlight.delete(videoId);
    }
  })();

  resolutionInFlight.set(videoId, promise);
  return promise;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.get("/preach/song", async (req, res) => {
  const MAX_ARTIST_ATTEMPTS = 6;
  const MAX_TRACKS_PER_ARTIST = 4;

  for (let attempt = 0; attempt < MAX_ARTIST_ATTEMPTS; attempt++) {
    const artist = ARTISTS[Math.floor(Math.random() * ARTISTS.length)];
    const candidates = await fetchSyncedSongsForArtist(artist);
    if (candidates.length === 0) {
      req.log.info({ artist }, "no synced songs found; trying another artist");
      continue;
    }

    const shuffled = [...candidates]
      .sort(() => Math.random() - 0.5)
      .slice(0, MAX_TRACKS_PER_ARTIST);

    for (const cand of shuffled) {
      const synced = cand.syncedLyrics?.trim();
      if (!synced) continue;
      const lyrics = parseLrc(synced);
      if (lyrics.length < 4) continue;

      const key = cacheKey(cand.artistName, cand.trackName);
      let trackEntry = trackCache.get(key) ?? null;

      if (!trackEntry) {
        const trackInfo = await findTrackViaLavalink(
          `${cand.artistName} ${cand.trackName}`,
        );
        if (!trackInfo) continue;
        trackEntry = {
          videoId: trackInfo.identifier,
          duration: Math.round(trackInfo.length / 1000),
        };
        trackCache.set(key, trackEntry);
      }

      const artworkUrl = await fetchArtwork(cand.trackName, cand.artistName);

      const videoId = trackEntry.videoId;

      // Fire-and-forget: warm the audio URL cache so the first stream
      // request returns immediately instead of waiting for yt-dlp.
      resolveAudioUrl(videoId).catch(() => {});

      res.json({
        title: cand.trackName,
        artist: cand.artistName,
        videoId,
        duration: trackEntry.duration,
        artworkUrl,
        lyrics,
      });
      return;
    }
  }

  res.status(503).json({ error: "Couldn't tune in to anything right now." });
});

/** Audio stream proxy.
 *
 *  GET /api/preach/stream/:videoId
 *
 *  Resolves the direct YouTube CDN URL via yt-dlp (Android client — no JS
 *  cipher extraction needed), then proxies it including any Range header the
 *  browser sends for seeking. This gives the <audio> element full native scrub
 *  support: the seek bar fills in and seeking is instant.
 *
 *  The CDN URL is cached for 4 h; /preach/song pre-warms it so the first play
 *  usually hits the cache.
 */
router.get("/preach/stream/:videoId", async (req, res) => {
  const { videoId } = req.params;
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    res.status(400).json({ error: "Invalid videoId" });
    return;
  }

  // Use a manual AbortController so we can cancel cleanly when the client
  // disconnects — avoids unhandled 'error' events from AbortSignal.timeout.
  const abort = new AbortController();
  const connectTimeout = setTimeout(() => abort.abort(), 30_000);

  try {
    const fmt = await resolveAudioUrl(videoId);

    const rangeHeader = req.headers["range"];
    const upstream = await fetch(fmt.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        ...(rangeHeader ? { Range: rangeHeader } : {}),
      },
      signal: abort.signal,
    });

    // Headers received — connection established, cancel the connect timeout.
    clearTimeout(connectTimeout);

    res.status(rangeHeader && upstream.status === 206 ? 206 : 200);
    res.setHeader("Content-Type", fmt.mimeType);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "no-cache");

    const cl = upstream.headers.get("content-length");
    if (cl) res.setHeader("Content-Length", cl);
    else if (fmt.contentLength > 0)
      res.setHeader("Content-Length", fmt.contentLength);

    const cr = upstream.headers.get("content-range");
    if (cr) res.setHeader("Content-Range", cr);

    // Convert the WHATWG ReadableStream → Node Readable and pipe to response.
    // Listen for 'error' so Node doesn't throw if the client disconnects mid-stream.
    const nodeStream = Readable.fromWeb(
      upstream.body as import("stream/web").ReadableStream,
    );
    nodeStream.on("error", (err) => {
      req.log.warn({ err, videoId }, "Stream error (client likely disconnected)");
      if (!res.headersSent) res.status(502).json({ error: "Couldn't stream audio." });
      else res.end();
    });
    nodeStream.pipe(res);
    req.on("close", () => {
      abort.abort();
      nodeStream.destroy();
    });
  } catch (err) {
    clearTimeout(connectTimeout);
    req.log.error({ err, videoId }, "Audio stream failed");
    if (!res.headersSent) {
      res.status(502).json({ error: "Couldn't stream audio." });
    }
  }
});

export default router;
