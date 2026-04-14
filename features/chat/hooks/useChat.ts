import { useCallback, useMemo, useState } from "react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatAction {
  type: string;
  payload: Record<string, unknown>;
}

interface UseChatOptions {
  context?: object;
  endpoint?: string;
  initialMessage: string;
  clearMessage?: string;
  offlineMessage?: string;
  executeAction?: (action: ChatAction) => Promise<string> | string;
}

export function useChat({
  context,
  endpoint = "/api/chat",
  initialMessage,
  clearMessage = "Chat cleared! How can I help?",
  offlineMessage = "Cannot reach ByteBot right now.",
  executeAction,
}: UseChatOptions) {
  const initialMessages = useMemo<ChatMessage[]>(
    () => [
      {
        role: "assistant",
        content: initialMessage,
      },
    ],
    [initialMessage]
  );
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<ChatAction | null>(null);

  const sendMessage = useCallback(
    async (userInput: string) => {
      if (!userInput.trim()) return;

      const normalizedInput = userInput.trim().toLowerCase();
      const userMessage: ChatMessage = { role: "user", content: userInput };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);

      if (pendingAction && executeAction) {
        if (["confirm", "yes", "apply", "run it", "do it"].includes(normalizedInput)) {
          setIsLoading(true);
          try {
            const result = await executeAction(pendingAction);
            setMessages([...updatedMessages, { role: "assistant", content: result }]);
          } catch (error) {
            const failure = error instanceof Error ? error.message : "I could not apply that action.";
            setMessages([...updatedMessages, { role: "assistant", content: failure }]);
          } finally {
            setPendingAction(null);
            setIsLoading(false);
          }
          return;
        }

        if (["cancel", "no", "stop", "never mind", "dont", "don't"].includes(normalizedInput)) {
          setPendingAction(null);
          setMessages([...updatedMessages, { role: "assistant", content: "Action cancelled. Nothing changed." }]);
          return;
        }
      }

      setIsLoading(true);

      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      const recentMessages = updatedMessages.slice(-6);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: recentMessages,
            orderContext: context ?? null,
          }),
          signal: controller.signal,
        });

        window.clearTimeout(timeout);
        const data = await response.json();

        if (!response.ok || data.error) {
          const errorMessage = data.error || `Server error ${response.status}`;
          console.error("ByteBot error:", errorMessage);

          let friendlyMessage = "Sorry, something went wrong. Please try again.";
          if (response.status === 429) {
            friendlyMessage = "ByteBot is a bit busy right now. Please wait a moment and try again.";
          } else if (response.status === 413) {
            friendlyMessage = "That question was too long for me to process. Try asking something shorter.";
          }

          setMessages([...updatedMessages, { role: "assistant", content: friendlyMessage }]);
          return;
        }

        if (data.action) {
          setPendingAction(data.action as ChatAction);
        } else {
          setPendingAction(null);
        }

        setMessages([...updatedMessages, { role: "assistant", content: data.reply }]);
      } catch (error) {
        window.clearTimeout(timeout);

        const isTimeout = error instanceof Error && error.name === "AbortError";
        const isOffline = error instanceof Error && error.message.includes("fetch");

        let fallbackMessage = "Oops! Something went wrong. Please try again.";
        if (isTimeout) {
          fallbackMessage = "ByteBot took too long to respond. Please try again.";
        } else if (isOffline) {
          fallbackMessage = offlineMessage;
        }

        setMessages([...updatedMessages, { role: "assistant", content: fallbackMessage }]);
      } finally {
        setIsLoading(false);
      }
    },
    [context, endpoint, executeAction, messages, offlineMessage, pendingAction]
  );

  const clearChat = useCallback(() => {
    setPendingAction(null);
    setMessages([
      {
        role: "assistant",
        content: clearMessage,
      },
    ]);
  }, [clearMessage]);

  return { messages, isLoading, sendMessage, clearChat };
}
