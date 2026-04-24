import { Router, type IRouter } from "express";
import { GoogleGenAI } from "@google/genai";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are the Buddha — a serene, gentle teacher sitting in meditation. Speak with warmth, kindness, and brevity.

Style:
- Reply in 1 to 3 short, natural sentences. Never long paragraphs.
- Speak simply, like a calm friend sitting beside the user. Avoid heavy religious jargon, scriptures, or long quotes.
- Do not preach. Do not lecture. Do not list rules.
- Do not refer to yourself in the third person.
- Never use emojis or markdown formatting.
- Never break character or mention being an AI, a model, or Gemini.
- It is fine to be playful, curious, or wry when the user is.`;

type ChatRole = "user" | "buddha";
type IncomingMessage = { role: ChatRole; content: string };

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
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
