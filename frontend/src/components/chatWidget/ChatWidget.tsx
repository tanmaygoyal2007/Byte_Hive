"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, RotateCcw, Send } from "lucide-react";
import { useChat } from "../../hooks/useChat";
import SiriBorder from "../siriBorder/SiriBorder";
import "./ChatWidget.css";

const QUICK_PROMPTS = [
  "What's vegetarian?",
  "Suggest something under ₹100",
  "Where do I collect my order?",
  "How long will it take?",
];

export default function ChatWidget({ orderContext }: { orderContext?: object }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const { messages, isLoading, sendMessage, clearChat } = useChat(orderContext);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <>
      <SiriBorder active={isOpen} />

      {/* FAB Button */}
      <button
        className={`bh-fab ${isOpen ? "bh-fab-open" : ""}`}
        onClick={() => setIsOpen((v) => !v)}
        aria-label="Toggle ByteBot"
      >
        {isOpen ? (
          <X size={20} />
        ) : (
          <>
            <MessageCircle size={20} />
            <span className="bh-fab-label">ByteBot</span>
          </>
        )}
      </button>

      {/* Chat Panel */}
      <div className={`bh-panel ${isOpen ? "bh-panel-open" : ""}`}>

        {/* Header */}
        <div className="bh-header">
          <div className="bh-header-left">
            <div className="bh-avatar">🤖</div>
            <div className="bh-header-info">
              <div className="bh-bot-name">ByteHive AI Assistant</div>
              <div className="bh-bot-status">
                <span className="bh-status-dot" />
                <span className="bh-bot-subtitle">Online · Campus food assistant</span>
              </div>
            </div>
          </div>
          <div className="bh-header-actions">
            <button className="bh-clear-btn" onClick={clearChat} title="Clear chat">
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="bh-messages">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`bh-msg-row ${msg.role === "user" ? "bh-user-row" : "bh-bot-row"}`}
            >
              {msg.role === "assistant" && (
                <div className="bh-msg-avatar">🤖</div>
              )}
              <div
                className={`bh-bubble ${
                  msg.role === "user" ? "bh-user-bubble" : "bh-bot-bubble"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="bh-msg-row bh-bot-row">
              <div className="bh-msg-avatar">🤖</div>
              <div className="bh-bubble bh-bot-bubble bh-typing">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        {messages.length === 1 && (
          <div className="bh-quick-prompts">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                className="bh-quick-btn"
                onClick={() => sendMessage(p)}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="bh-input-area">
          <input
            ref={inputRef}
            className="bh-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask about menu, orders, outlets…"
            disabled={isLoading}
          />
          <button
            className="bh-send-btn"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </>
  );
}