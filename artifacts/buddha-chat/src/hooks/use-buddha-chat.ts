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
};

const BUDDHA_RESPONSES = [
  "Breathe. The answer is closer than you think.",
  "Sit with the question a moment longer.",
  "What you seek is also seeking you.",
  "Peace comes from within. Do not seek it without.",
  "Let go of the need to control, and you will find harmony.",
  "Your mind is like water. When it is agitated, it becomes difficult to see. But if you allow it to settle, the answer becomes clear.",
  "The present moment is filled with joy and happiness. If you are attentive, you will see it.",
  "You already have everything you need.",
];

export function useBuddhaChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [buddhaState, setBuddhaState] = useState<BuddhaState>("idle");
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = useCallback((content: string) => {
    if (!content.trim()) return;

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: content.trim(),
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setBuddhaState("thinking");
    setIsTyping(true);

    // Simulate thinking delay
    const thinkingTime = 1200 + Math.random() * 800; // 1.2 to 2.0 seconds

    setTimeout(() => {
      setBuddhaState("speaking");
      
      const randomResponse = BUDDHA_RESPONSES[Math.floor(Math.random() * BUDDHA_RESPONSES.length)];
      
      const buddhaMessage: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: "buddha",
        content: randomResponse,
        createdAt: new Date(),
      };
      
      setMessages((prev) => [...prev, buddhaMessage]);
      setIsTyping(false);

      // Go back to idle after a short while
      setTimeout(() => {
        setBuddhaState("idle");
      }, 3000);

    }, thinkingTime);
  }, []);

  return {
    messages,
    buddhaState,
    sendMessage,
    isTyping,
  };
}
