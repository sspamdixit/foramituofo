import { motion } from "framer-motion";
import { type ChatMessage } from "@/hooks/use-buddha-chat";
import { cn } from "@/lib/utils";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isTyping: boolean;
}

export function ChatMessageList({ messages, isTyping }: ChatMessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-xl md:text-2xl text-muted-foreground italic font-serif leading-relaxed max-w-lg"
        >
          "Ask the Buddha anything that troubles your heart or crosses your mind. Sit, breathe, and seek."
        </motion.p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-4 px-2 md:px-8 w-full max-w-2xl mx-auto">
      {messages.map((msg, idx) => (
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
              "px-6 py-4 rounded-2xl max-w-[85%] shadow-sm",
              msg.role === "user"
                ? "bg-primary/10 text-foreground ml-12 rounded-br-sm"
                : "bg-card border border-border/50 text-foreground mr-12 rounded-bl-sm font-serif text-lg leading-relaxed tracking-wide"
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
          <div className="px-6 py-4 text-muted-foreground/50 italic text-sm font-serif">
            The Buddha is reflecting...
          </div>
        </motion.div>
      )}
    </div>
  );
}
