import { Router, type IRouter } from "express";
import { GoogleGenAI } from "@google/genai";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are The Chillest Monk — Buddha, but reincarnated with the vibe of a wise older brother who grew up online. Calm, witty, a little sarcastic, but you ALWAYS have the user's back.

Voice:
- Mix modern slang ("bro", "vibe", "cooked", "canon event", "lowkey", "no cap", "fr", "the audacity", "touch grass") with genuinely deep spiritual wisdom. The slang lands; the wisdom hits.
- Example energy: "Bro, your ego is reaching peak levels. Chill out, look at the clouds — they aren't stressed about their LinkedIn reach."
- Another: "That's a canon event, fr. You can't skip it. But you can stop watching the replay every night before bed."
- Be playful and a bit roasty when the moment calls for it, but always end on something kind, real, or quietly profound.

Rules:
- Reply in 1 to 3 short, natural sentences. Never long paragraphs.
- No emojis. No markdown. No bullet lists. No scripture quotes.
- Do not refer to yourself in the third person.
- Never break character or mention being an AI, a model, or Gemini.
- If something is heavy (grief, loss, real pain): drop the slang slightly, speak softer, still keep the warm bro energy — like a friend on the floor next to them, not a guru on a mountain.`;

type ChatRole = "user" | "buddha";
type IncomingMessage = { role: ChatRole; content: string };

const replitGeminiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
const replitGeminiBaseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
const directGeminiKey = process.env.GEMINI_API_KEY;

const ai = replitGeminiBaseUrl
  ? new GoogleGenAI({
      apiKey: replitGeminiKey,
      httpOptions: {
        apiVersion: "",
        baseUrl: replitGeminiBaseUrl,
      },
    })
  : new GoogleGenAI({
      apiKey: directGeminiKey,
    });

router.post("/chat", async (req, res) => {
  const body = req.body as {
    history?: IncomingMessage[];
    message?: string;
  };

  const message = body.message?.trim();
  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const history = Array.isArray(body.history) ? body.history : [];
  const contents = [
    ...history.map((m) => ({
      role: m.role === "buddha" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const send = (event: Record<string, unknown>) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  // Try the primary model, then fall back to a lighter one on overload.
  const modelChain = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
  let stream: AsyncGenerator<{ text?: string; candidates?: any[]; promptFeedback?: any }> | null = null;
  let lastError: unknown = null;

  for (const model of modelChain) {
    try {
      stream = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 0.85,
          maxOutputTokens: 8192,
        },
      });
      break;
    } catch (err) {
      lastError = err;
      req.log.warn({ err, model }, "Gemini model unavailable, trying next");
    }
  }

  if (!stream) {
    req.log.error({ lastError }, "All Gemini models unavailable");
    send({ type: "error", message: "The wise one is silent right now." });
    res.end();
    return;
  }

  let refused = false;
  let sentAny = false;

  try {
    for await (const chunk of stream) {
      const candidate = chunk.candidates?.[0];
      const finishReason = candidate?.finishReason;
      const blockReason = chunk.promptFeedback?.blockReason;

      if (
        blockReason ||
        finishReason === "SAFETY" ||
        finishReason === "PROHIBITED_CONTENT" ||
        finishReason === "BLOCKLIST" ||
        finishReason === "RECITATION"
      ) {
        refused = true;
        continue;
      }

      const text = chunk.text ?? "";
      if (text) {
        sentAny = true;
        send({ type: "delta", text });
      }
    }
  } catch (err) {
    req.log.error({ err }, "Stream interrupted");
    send({ type: "error", message: "The breath was lost." });
    res.end();
    return;
  }

  if (refused && !sentAny) {
    send({ type: "refused" });
  } else {
    send({ type: "done" });
  }
  res.end();
});

export default router;
