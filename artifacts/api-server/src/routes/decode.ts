import { Router, type IRouter } from "express";
import { GoogleGenAI } from "@google/genai";

const router: IRouter = Router();

const DECODE_PROMPT = `You are The Chillest Monk — Buddha, but reincarnated with the vibe of a wise older brother who grew up online.

Your job: decode the hidden spiritual wisdom in ONE song lyric. The user tapped it because something about it hit different.

Rules:
- 2 to 4 short, punchy sentences. No more.
- Mix modern slang with genuine spiritual insight — same voice as always.
- Be specific about THIS lyric. Connect it to a universal human experience.
- End with a line that makes them see the lyric differently forever.
- No emojis. No markdown. No bullet lists. No scripture quotes.`;

const replitGeminiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
const replitGeminiBaseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
const directGeminiKey = process.env.GEMINI_API_KEY;

const ai = replitGeminiBaseUrl
  ? new GoogleGenAI({
      apiKey: replitGeminiKey,
      httpOptions: { apiVersion: "", baseUrl: replitGeminiBaseUrl },
    })
  : new GoogleGenAI({ apiKey: directGeminiKey });

const MODEL_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-1.5-flash-8b",
];

const isTransient = (err: unknown) => {
  const msg = String((err as { message?: string })?.message ?? "").toLowerCase();
  return (
    msg.includes("quota") ||
    msg.includes("rate") ||
    msg.includes("429") ||
    msg.includes("503") ||
    msg.includes("overload") ||
    msg.includes("unavailable")
  );
};

router.post("/preach/decode", async (req, res) => {
  const body = req.body as { lyric?: string; songTitle?: string; artist?: string };
  const lyric = body.lyric?.trim();
  if (!lyric) {
    res.status(400).json({ error: "lyric is required" });
    return;
  }

  const songTitle = body.songTitle?.trim() ?? "Unknown";
  const artist = body.artist?.trim() ?? "Unknown";

  const prompt = `Song: "${songTitle}" by ${artist}\nLyric: "${lyric}"\n\nDecode the hidden spiritual wisdom in this lyric.`;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const send = (ev: Record<string, unknown>) =>
    res.write(`data: ${JSON.stringify(ev)}\n\n`);

  let stream: AsyncGenerator<{ text?: string }> | null = null;
  for (const model of MODEL_CHAIN) {
    try {
      stream = await ai.models.generateContentStream({
        model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          systemInstruction: DECODE_PROMPT,
          temperature: 0.9,
          maxOutputTokens: 512,
        },
      });
      break;
    } catch (err) {
      if (!isTransient(err)) break;
    }
  }

  if (!stream) {
    send({ type: "error", message: "The monk went quiet." });
    res.end();
    return;
  }

  let sent = false;
  try {
    for await (const chunk of stream) {
      const text = chunk.text ?? "";
      if (text) {
        sent = true;
        send({ type: "delta", text });
      }
    }
  } catch {
    // stream interruption — end gracefully
  }

  send(sent ? { type: "done" } : { type: "error", message: "The monk went silent." });
  res.end();
});

export default router;
