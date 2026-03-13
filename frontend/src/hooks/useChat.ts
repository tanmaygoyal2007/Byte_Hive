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

      try {
        const res = await fetch("http://localhost:3001/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: updatedMessages,
            orderContext: orderContext || null,
          }),
        });

        const data = await res.json();
        setMessages([...updatedMessages, { role: "assistant", content: data.reply }]);
      } catch {
        setMessages([...updatedMessages, {
          role: "assistant",
          content: "Oops! Couldn't connect to ByteBot. Please try again. 🙏",
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