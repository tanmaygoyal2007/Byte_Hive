"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, ChevronDown, ClipboardList, MessageCircle, Package, RotateCcw, Send, SlidersHorizontal, X } from "lucide-react";
import { useChat, type ChatAction } from "@/features/chat/hooks/useChat";
import SiriBorder from "@/components/components/ui/SiriBorder";

const STUDENT_QUICK_PROMPTS = [
  "What's vegetarian?",
  "Suggest something under Rs 100",
  "Add a veg item under Rs 100 to cart",
  "Where do I collect my order?",
  "How long will it take?",
];

const STUDENT_ORDER_PROMPTS = [
  "Track my current order",
  "Add Cold Coffee to cart",
  "How long will my order take?",
  "Where do I collect my order?",
  "Is my order delayed?",
  "What is my pickup code?",
];

const VENDOR_QUICK_PROMPTS = [
  "Summarize my queue",
  "Show urgent orders",
  "Which orders are delayed?",
  "What menu items are unavailable?",
];

const VENDOR_ORDER_PROMPTS = [
  "How many active orders do I have?",
  "Which order should I prepare next?",
  "Show delayed orders",
  "What is my average ETA today?",
  "Draft a short delay message",
];

const VENDOR_CONTROL_GROUPS = [
  {
    label: "Outlet",
    prompts: [
      "Close this outlet for next 3 hours",
      "Reopen this outlet now",
    ],
  },
  {
    label: "Menu",
    prompts: [
      "Mark all beverages unavailable",
      "Mark all beverages available",
      "Add item Masala Chai in Beverages for Rs 35",
    ],
  },
  {
    label: "Pricing",
    prompts: [
      "Increase all beverages by 2%",
      "Decrease all desserts by 5%",
      "Set Cold Coffee to Rs 85",
    ],
  },
] as const;

type ChatWidgetMode = "student" | "vendor";

interface ChatWidgetProps {
  mode?: ChatWidgetMode;
  orderContext?: object;
  executeAction?: (action: ChatAction) => Promise<string> | string;
}

export default function ChatWidget({ mode = "student", orderContext, executeAction }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isOrderHelpOpen, setIsOrderHelpOpen] = useState(false);
  const [isAdvancedHelpOpen, setIsAdvancedHelpOpen] = useState(false);
  const isVendorMode = mode === "vendor";
  const quickPrompts = isVendorMode ? VENDOR_QUICK_PROMPTS : STUDENT_QUICK_PROMPTS;
  const helperPrompts = isVendorMode ? VENDOR_ORDER_PROMPTS : STUDENT_ORDER_PROMPTS;
  const helperLabel = isVendorMode ? "Ops Help" : "Order Help";
  const headerTitle = isVendorMode ? "ByteHive Vendor Copilot" : "ByteHive AI Assistant";
  const subtitle = isVendorMode ? "Online - Outlet operations assistant" : "Online - Campus food assistant";
  const initialMessage = isVendorMode
    ? "Hey! I'm ByteBot, your vendor operations copilot. I can help you manage queue pressure, delayed orders, menu availability, and daily outlet insights. What would you like to check?"
    : "Hey! I'm ByteBot, your campus food assistant. I can help you explore the menu, track your order, or suggest something delicious. What can I do for you?";
  const clearMessage = isVendorMode ? "Vendor chat cleared! What should we check next?" : "Chat cleared! How can I help?";
  const placeholder = isVendorMode ? "Ask about orders, delays, menu, insights..." : "Ask about menu, orders, outlets...";
  const endpoint = isVendorMode ? "/api/vendor/chat" : "/api/chat";
  const offlineMessage = isVendorMode
    ? "Cannot reach the vendor copilot right now."
    : "Cannot reach ByteBot right now.";
  const { messages, isLoading, sendMessage, clearChat } = useChat({
    context: orderContext,
    endpoint,
    initialMessage,
    clearMessage,
    offlineMessage,
    executeAction,
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const orderHelpRef = useRef<HTMLDivElement>(null);
  const advancedHelpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOrderHelpOpen && !isAdvancedHelpOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (orderHelpRef.current && !orderHelpRef.current.contains(event.target as Node)) {
        setIsOrderHelpOpen(false);
      }
      if (advancedHelpRef.current && !advancedHelpRef.current.contains(event.target as Node)) {
        setIsAdvancedHelpOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isAdvancedHelpOpen, isOrderHelpOpen]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
  };

  const handlePromptSelection = (value: string) => {
    if (!value || isLoading) return;
    sendMessage(value);
    setIsOrderHelpOpen(false);
    setIsAdvancedHelpOpen(false);
  };

  return (
    <>
      <SiriBorder active={isOpen} />

      <button
        className={`bh-fab ${isOpen ? "bh-fab-open" : ""}`}
        onClick={() => setIsOpen((value) => !value)}
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

      <div className={`bh-panel ${isOpen ? "bh-panel-open" : ""}`}>
        <div className="bh-header">
          <div className="bh-header-left">
            <div className="bh-avatar"><Bot size={20} aria-hidden="true" /></div>
            <div className="bh-header-info">
              <div className="bh-bot-name">{headerTitle}</div>
              <div className="bh-bot-status">
                <span className="bh-status-dot" />
                <span className="bh-bot-subtitle">{subtitle}</span>
              </div>
            </div>
          </div>
          <div className="bh-header-actions">
            <button className="bh-clear-btn" onClick={clearChat} title="Clear chat">
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        <div className="bh-messages">
          {messages.map((message, index) => (
            <div key={index} className={`bh-msg-row ${message.role === "user" ? "bh-user-row" : "bh-bot-row"}`}>
              {message.role === "assistant" && <div className="bh-msg-avatar"><Bot size={15} aria-hidden="true" /></div>}
              <div className={`bh-bubble ${message.role === "user" ? "bh-user-bubble" : "bh-bot-bubble"}`}>{message.content}</div>
            </div>
          ))}

          {isLoading && (
            <div className="bh-msg-row bh-bot-row">
              <div className="bh-msg-avatar"><Bot size={15} aria-hidden="true" /></div>
              <div className="bh-bubble bh-bot-bubble bh-typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {messages.length === 1 && (
          <div className="bh-quick-prompts">
            {quickPrompts.map((prompt) => (
              <button key={prompt} className="bh-quick-btn" onClick={() => sendMessage(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
        )}

        <div className="bh-actions-row">
          <div className="bh-actions-stack">
            {isVendorMode && (
              <div className="bh-order-help" ref={advancedHelpRef}>
                <button
                  type="button"
                  className={`bh-order-help-trigger bh-order-help-trigger-advanced ${isAdvancedHelpOpen ? "bh-order-help-trigger-open" : ""}`}
                  onClick={() => {
                    setIsAdvancedHelpOpen((value) => !value);
                    setIsOrderHelpOpen(false);
                  }}
                  aria-label="Open advanced control help"
                  aria-expanded={isAdvancedHelpOpen}
                  disabled={isLoading}
                >
                  <SlidersHorizontal size={17} />
                  <span className="bh-order-help-pulse" />
                </button>

                {isAdvancedHelpOpen && (
                  <div className="bh-order-help-menu">
                    <div className="bh-order-help-head">
                      <strong>Advanced</strong>
                      <ChevronDown size={16} />
                    </div>
                    {VENDOR_CONTROL_GROUPS.map((group) => (
                      <div key={group.label} className="bh-order-help-group">
                        <div className="bh-order-help-group-label">{group.label}</div>
                        {group.prompts.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            className="bh-order-help-option"
                            onClick={() => handlePromptSelection(prompt)}
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="bh-order-help" ref={orderHelpRef}>
              <button
                type="button"
                className={`bh-order-help-trigger ${isOrderHelpOpen ? "bh-order-help-trigger-open" : ""}`}
                onClick={() => {
                  setIsOrderHelpOpen((value) => !value);
                  setIsAdvancedHelpOpen(false);
                }}
                aria-label={`Open ${helperLabel.toLowerCase()}`}
                aria-expanded={isOrderHelpOpen}
                disabled={isLoading}
              >
                {isVendorMode ? <ClipboardList size={17} /> : <Package size={17} />}
                <span className="bh-order-help-pulse" />
              </button>

              {isOrderHelpOpen && (
                <div className="bh-order-help-menu">
                  <div className="bh-order-help-head">
                    <strong>{helperLabel}</strong>
                    <ChevronDown size={16} />
                  </div>
                  {helperPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="bh-order-help-option"
                      onClick={() => handlePromptSelection(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bh-input-area">
          <input
            ref={inputRef}
            className="bh-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSend()}
            placeholder={placeholder}
            disabled={isLoading}
          />
          <button className="bh-send-btn" onClick={handleSend} disabled={!input.trim() || isLoading} aria-label="Send">
            <Send size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
