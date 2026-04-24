import { Router, type IRouter } from "express";

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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY not configured" });
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

  const requestBody = JSON.stringify({
    contents,
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 220,
    },
  });

  // Try the primary model, then fall back to a lighter one on overload.
  const modelChain = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
  let geminiRes: Response | null = null;
  let lastError: { status: number; body: string } | null = null;

  for (const model of modelChain) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });
      if (r.ok && r.body) {
        geminiRes = r;
        break;
      }
      const text = await r.text().catch(() => "");
      lastError = { status: r.status, body: text.slice(0, 500) };
      req.log.warn({ model, status: r.status }, "Gemini model unavailable, trying next");
      // Only retry on overload / rate-limit / server errors
      if (![429, 500, 502, 503, 504].includes(r.status)) break;
    } catch (err) {
      req.log.warn({ err, model }, "Gemini fetch failed, trying next");
    }
  }

  if (!geminiRes || !geminiRes.body) {
    req.log.error({ lastError }, "All Gemini models unavailable");
    send({ type: "error", message: "The wise one is silent right now." });
    res.end();
    return;
  }

  const reader = geminiRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let refused = false;
  let sentAny = false;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const dataStr = line.slice(5).trim();
        if (!dataStr) continue;

        try {
          const data = JSON.parse(dataStr);
          const candidate = data.candidates?.[0];
          const finishReason = candidate?.finishReason;
          const blockReason = data.promptFeedback?.blockReason;

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

          const parts = candidate?.content?.parts as
            | Array<{ text?: string }>
            | undefined;
          const text = parts?.map((p) => p.text ?? "").join("") ?? "";
          if (text) {
            sentAny = true;
            send({ type: "delta", text });
          }
        } catch (e) {
          req.log.warn({ err: e, line }, "Failed to parse Gemini SSE line");
        }
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
