import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onTypingChange?: (isTyping: boolean) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, onTypingChange, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const setValue = (next: string) => {
    setInput(next);
    onTypingChange?.(next.length > 0);
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSendMessage(trimmed);
    setInput("");
    onTypingChange?.(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSend();
      }}
      className="w-full max-w-xl mx-auto"
    >
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Speak your mind..."
          disabled={disabled}
          autoComplete="off"
          className="minimal-input comic-text w-full bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-center text-2xl md:text-3xl py-2 disabled:opacity-50 vibe-text-strong"
          style={{ color: "var(--vibe-text)" }}
        />
        {/* Hand-drawn underline */}
        <svg
          viewBox="0 0 600 18"
          preserveAspectRatio="none"
          className="block w-full h-3 -mt-1"
          aria-hidden="true"
        >
          <path
            d="M 6 9 C 80 4, 160 14, 240 8 S 400 4, 480 11 S 560 6, 594 9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.55"
          />
        </svg>
      </div>
    </form>
  );
}
