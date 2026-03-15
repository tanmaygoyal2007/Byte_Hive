import { useState, useCallback } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function useChat(orderContext?: object) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hey! 👋 I'm ByteBot, your campus food assistant. I can help you explore the menu, track your order, or suggest something delicious. What can I do for you?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (userInput: string) => {
      if (!userInput.trim()) return;

      const userMessage: ChatMessage = { role: "user", content: userInput };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setIsLoading(true);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      // Only send last 6 messages to avoid token limit
      const recentMessages = updatedMessages.slice(-6);

      try {
        const res = await fetch("http://localhost:3001/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: recentMessages,
            orderContext: orderContext || null,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const data = await res.json();

        if (!res.ok || data.error) {
          const errMsg = data.error || `Server error ${res.status}`;
          console.error("ByteBot error:", errMsg);

          // User-friendly messages based on error type
          let friendlyMessage = "Sorry, something went wrong. Please try again! 🙏";
          if (res.status === 429) {
            friendlyMessage = "ByteBot is a bit busy right now. Please wait a moment and try again! ⏳";
          } else if (res.status === 413) {
            friendlyMessage = "That question was too long for me to process. Try asking something shorter! ✂️";
          }

          setMessages([...updatedMessages, {
            role: "assistant",
            content: friendlyMessage,
          }]);
          return;
        }

        setMessages([...updatedMessages, { role: "assistant", content: data.reply }]);
      } catch (err) {
        clearTimeout(timeout);

        const isTimeout = err instanceof Error && err.name === "AbortError";
        const isOffline = err instanceof Error && err.message.includes("fetch");

        let errorMessage = "Oops! Something went wrong. Please try again. 🙏";
        if (isTimeout) {
          errorMessage = "ByteBot took too long to respond. Please try again! ⏱️";
        } else if (isOffline) {
          errorMessage = "Cannot reach ByteBot. Make sure the backend is running on port 3001! 🔌";
        }

        setMessages([...updatedMessages, {
          role: "assistant",
          content: errorMessage,
        }]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, orderContext]
  );

  const clearChat = useCallback(() => {
    setMessages([{ role: "assistant", content: "Chat cleared! How can I help? 😊" }]);
  }, []);

  return { messages, isLoading, sendMessage, clearChat };
}