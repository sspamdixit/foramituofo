import { useState, useCallback, useRef, useEffect } from "react";

export type BuddhaState =
  | "idle"
  | "thinking"
  | "speaking"
  | "blessing"
  | "refusing";

export type ChatMessage = {
  id: string;
  role: "user" | "buddha";
  content: string;
  createdAt: Date;
  isStreaming?: boolean;
};

const REFUSAL_LINE = "That is not something I can speak on. Ask another.";
const FALLBACK_LINE = "The path is unclear. Try once more in a moment.";
const TYPEWRITER_MS = 28;

function makeId() {
  return Math.random().toString(36).substring(2, 10);
}

export function useBuddhaChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [buddhaState, setBuddhaState] = useState<BuddhaState>("idle");
  const [isTyping, setIsTyping] = useState(false);

  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overrideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      if (overrideTimeoutRef.current) clearTimeout(overrideTimeoutRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  /**
   * Force Buddha into a particular pose for `holdMs`, then return to idle.
   * Used by click-reactions and the "bless" easter egg. If the chat hook is
   * already mid-stream, the override still wins for visual purposes.
   */
  const setBuddhaStateOverride = useCallback(
    (state: BuddhaState, holdMs: number) => {
      if (overrideTimeoutRef.current) clearTimeout(overrideTimeoutRef.current);
      setBuddhaState(state);
      overrideTimeoutRef.current = setTimeout(() => {
        setBuddhaState("idle");
        overrideTimeoutRef.current = null;
      }, holdMs);
    },
    [],
  );

  const finishMessage = useCallback(
    (id: string, finalState: BuddhaState, finalText: string) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, isStreaming: false, content: finalText } : m,
        ),
      );

      // Hold the pose long enough for the typewriter to finish revealing,
      // then settle back to idle.
      const settleMs = Math.max(1500, finalText.length * TYPEWRITER_MS + 1400);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      setBuddhaState(finalState);
      idleTimeoutRef.current = setTimeout(() => {
        setBuddhaState("idle");
        idleTimeoutRef.current = null;
      }, settleMs);
    },
    [],
  );

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      // Cancel any in-flight request
      if (abortRef.current) abortRef.current.abort();
      if (idleTimeoutRef.current) {
        clearTimeout(idleTimeoutRef.current);
        idleTimeoutRef.current = null;
      }

      const controller = new AbortController();
      abortRef.current = controller;

      const userMessage: ChatMessage = {
        id: makeId(),
        role: "user",
        content: trimmed,
        createdAt: new Date(),
      };

      // Snapshot of history (excludes the new user message — backend appends it)
      const historyForRequest = messages
        .filter((m) => !m.isStreaming && m.content.length > 0)
        .map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [...prev, userMessage]);
      setBuddhaState("thinking");
      setIsTyping(true);

      let buddhaId: string | null = null;
      let accumulated = "";
      let refused = false;

      const ensureBuddhaMessage = () => {
        if (buddhaId) return;
        buddhaId = makeId();
        setIsTyping(false);
        setBuddhaState("speaking");
        setMessages((prev) => [
          ...prev,
          {
            id: buddhaId!,
            role: "buddha",
            content: "",
            createdAt: new Date(),
            isStreaming: true,
          },
        ]);
      };

      const updateBuddhaContent = (text: string) => {
        if (!buddhaId) return;
        const id = buddhaId;
        setMessages((prev) =>
          prev.map((m) => (m.id === id ? { ...m, content: text } : m)),
        );
      };

      try {
        const response = await fetch(`${import.meta.env.BASE_URL}api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            history: historyForRequest,
            message: trimmed,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        // eslint-disable-next-line no-constant-condition
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

            let data: { type?: string; text?: string; message?: string };
            try {
              data = JSON.parse(dataStr);
            } catch {
              continue;
            }

            if (data.type === "delta" && typeof data.text === "string") {
              ensureBuddhaMessage();
              accumulated += data.text;
              updateBuddhaContent(accumulated);
            } else if (data.type === "refused") {
              refused = true;
              ensureBuddhaMessage();
              accumulated = REFUSAL_LINE;
              setBuddhaState("refusing");
              updateBuddhaContent(accumulated);
            } else if (data.type === "error") {
              throw new Error(data.message ?? "Stream error");
            }
          }
        }

        if (!buddhaId) {
          // Stream ended with no content — show fallback
          buddhaId = makeId();
          accumulated = FALLBACK_LINE;
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: buddhaId!,
              role: "buddha",
              content: accumulated,
              createdAt: new Date(),
              isStreaming: true,
            },
          ]);
          finishMessage(buddhaId, "idle", accumulated);
        } else {
          finishMessage(buddhaId, refused ? "refusing" : "speaking", accumulated);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Chat error", err);

        if (!buddhaId) {
          buddhaId = makeId();
          accumulated = FALLBACK_LINE;
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: buddhaId!,
              role: "buddha",
              content: accumulated,
              createdAt: new Date(),
              isStreaming: true,
            },
          ]);
        }
        finishMessage(buddhaId, "idle", accumulated || FALLBACK_LINE);
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    },
    [messages, finishMessage],
  );

  return {
    messages,
    buddhaState,
    sendMessage,
    isTyping,
    setBuddhaStateOverride,
  };
}
