import { Router, type IRouter } from "express";

const router: IRouter = Router();

type LyricLine = { time: number; text: string };

/** A pool of well-known artists across genres / eras. The picker grabs one
 *  at random, then asks lrclib for that artist's catalog of synced lyrics
 *  and YouTube for a matching video — so any popular track from these
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
  "Modest Mouse", "Sufjan Stevens", "Yeah Yeah Yeahs",
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

// ─── lrclib types ───────────────────────────────────────────────────
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
        // Loose artist match — lrclib's `q=` matches across fields, so
        // a "Kanye West" search can return Nicki Minaj feat. Kanye. We
        // only want tracks whose artist actually IS our pick.
        norm(d.artistName).includes(target),
    );
  } catch {
    return [];
  }
}

// In-memory cache: "<artist>::<title>" → videoId. Persists for the life of
// the server; populated on first lookup, hit on every subsequent play of
// the same song. Cuts a YouTube round-trip out of repeat plays.
const videoIdCache = new Map<string, string>();
const cacheKey = (artist: string, title: string) =>
  norm(artist) + "::" + norm(title);

/** Resolve a YouTube videoId for the given query by scraping YouTube's
 *  public search page. No API key required. We pick the first videoId
 *  found in the response — for "<artist> <title> audio" queries this is
 *  reliably the official audio / topic upload. */
async function findYouTubeVideo(query: string): Promise<string | null> {
  const url =
    "https://www.youtube.com/results?search_query=" +
    encodeURIComponent(query);
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const r = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
        // Skip the EU consent interstitial that otherwise replaces the
        // search results with a consent page.
        Cookie: "CONSENT=YES+1",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!r.ok) return null;
    const html = await r.text();
    const matches = html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g);
    for (const m of matches) {
      // Take the first unique id — that's the top result.
      return m[1];
    }
    return null;
  } catch {
    return null;
  }
}

router.get("/preach/song", async (req, res) => {
  // Up to N attempts: pick a random artist, find a synced song, find a
  // YouTube video for it. If anything in that chain fails, try again with
  // a different artist / track.
  const MAX_ARTIST_ATTEMPTS = 6;
  const MAX_TRACKS_PER_ARTIST = 4;

  for (let attempt = 0; attempt < MAX_ARTIST_ATTEMPTS; attempt++) {
    const artist = ARTISTS[Math.floor(Math.random() * ARTISTS.length)];
    const candidates = await fetchSyncedSongsForArtist(artist);
    if (candidates.length === 0) {
      req.log.info({ artist }, "no synced songs found; trying another artist");
      continue;
    }

    // Random sample so we don't always pick the same first track for an
    // artist on repeat lookups.
    const shuffled = [...candidates]
      .sort(() => Math.random() - 0.5)
      .slice(0, MAX_TRACKS_PER_ARTIST);

    for (const cand of shuffled) {
      const synced = cand.syncedLyrics?.trim();
      if (!synced) continue;
      const lyrics = parseLrc(synced);
      if (lyrics.length < 4) continue;

      const key = cacheKey(cand.artistName, cand.trackName);
      let videoId = videoIdCache.get(key) ?? null;
      if (!videoId) {
        videoId = await findYouTubeVideo(
          `${cand.artistName} ${cand.trackName} audio`,
        );
        if (videoId) videoIdCache.set(key, videoId);
      }
      if (!videoId) continue;

      const artworkUrl = await fetchArtwork(cand.trackName, cand.artistName);

      res.json({
        title: cand.trackName,
        artist: cand.artistName,
        videoId,
        artworkUrl,
        lyrics,
      });
      return;
    }
  }

  res.status(503).json({ error: "Couldn't tune in to anything right now." });
});

export default router;
