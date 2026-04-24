import { useEffect, useRef, useState } from "react";

const TYPEWRITER_SPEED_MS = 28;

export function useTypewriter(text: string, animate: boolean) {
  const [displayed, setDisplayed] = useState(animate ? "" : text);
  const textRef = useRef(text);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    if (!animate) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setDisplayed(text);
      return;
    }

    setDisplayed((prev) => (text.startsWith(prev) ? prev : ""));

    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      setDisplayed((prev) => {
        const target = textRef.current;
        if (prev.length >= target.length) return prev;
        return target.slice(0, prev.length + 1);
      });
    }, TYPEWRITER_SPEED_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [text, animate]);

  return { displayed, done: displayed.length >= text.length };
}
