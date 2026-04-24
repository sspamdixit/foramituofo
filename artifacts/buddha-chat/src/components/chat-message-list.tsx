import { motion } from "framer-motion";
import { type ChatMessage } from "@/hooks/use-buddha-chat";
import { cn } from "@/lib/utils";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isTyping: boolean;
}

export function ChatMessageList({ messages, isTyping }: ChatMessageListProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6 py-4 px-2 md:px-8 w-full max-w-2xl mx-auto">
      {messages.map((msg) => (
        <motion.div
          key={msg.id}
          initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn(
            "flex w-full",
            msg.role === "user" ? "justify-end" : "justify-start"
          )}
        >
          <div
            className={cn(
              "px-5 py-3 rounded-2xl max-w-[85%] shadow-sm text-base leading-relaxed",
              msg.role === "user"
                ? "bg-white/90 text-foreground ml-12 rounded-br-sm"
                : "bg-card/95 border border-border/50 text-foreground mr-12 rounded-bl-sm"
            )}
          >
            {msg.content}
          </div>
        </motion.div>
      ))}

      {isTyping && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-start w-full"
        >
          <div className="px-5 py-3 text-white/80 text-sm">
            The Buddha is reflecting...
          </div>
        </motion.div>
      )}
    </div>
  );
}
