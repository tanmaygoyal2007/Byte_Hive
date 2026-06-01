"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ClipboardList, Loader2, MessageCircle, Mic, MicOff, Package, RotateCcw, Send, SlidersHorizontal, Volume2, VolumeX, X } from "lucide-react";
import { useChat, type ChatAction } from "@/features/chat/hooks/useChat";
import SiriBorder from "@/components/components/ui/SiriBorder";

type SpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
};

type SpeechRecognitionResultList = {
  length: number;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionErrorEvent = Event & {
  error: string;
};

type SpeechRecognition = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onstart: (() => void) | null;
  abort: () => void;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

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
type VoiceMode = "idle" | "listening" | "processing" | "speaking" | "error";

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
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [isSpeechOutputSupported, setIsSpeechOutputSupported] = useState(false);
  const [isVoiceReplyEnabled, setIsVoiceReplyEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>("idle");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [speakingMessageIndex, setSpeakingMessageIndex] = useState<number | null>(null);
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
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isLoadingRef = useRef(isLoading);
  const sendMessageRef = useRef(sendMessage);
  const lastSpokenMessageIndexRef = useRef<number | null>(null);
  const voiceSendTimerRef = useRef<number | null>(null);
  const voiceLoadPromiseRef = useRef<Promise<SpeechSynthesisVoice[]> | null>(null);
  const speechRequestIdRef = useRef(0);
  const isOpenRef = useRef(isOpen);
  const voiceModeRef = useRef<VoiceMode>("idle");
  const voiceSessionActiveRef = useRef(false);
  const finalTranscriptRef = useRef("");
  const voiceModeLabel = voiceMode === "listening" ? "Listening..." : voiceMode === "processing" ? "Processing..." : voiceMode === "error" ? "Voice paused" : "Speaking...";
  const isVoiceOverlayOpen = voiceMode !== "idle";

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    voiceModeRef.current = voiceMode;
  }, [voiceMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedPreference = window.localStorage.getItem("bytehive-voice-replies");
    if (storedPreference !== null) {
      setIsVoiceReplyEnabled(storedPreference === "true");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("bytehive-voice-replies", String(isVoiceReplyEnabled));
  }, [isVoiceReplyEnabled]);

  const stopSpeech = useCallback(() => {
    speechRequestIdRef.current += 1;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingMessageIndex(null);
    if (voiceSessionActiveRef.current) {
      voiceSessionActiveRef.current = false;
      setVoiceMode("idle");
    }
  }, []);

  const resetVoiceSession = useCallback(() => {
    recognitionRef.current?.abort();
    setIsListening(false);
    finalTranscriptRef.current = "";
    setVoiceTranscript("");
    setVoiceError("");
    voiceSessionActiveRef.current = false;
    setVoiceMode("idle");
    stopSpeech();
  }, [stopSpeech]);

  const sendVoiceTranscript = useCallback((transcript: string) => {
    const message = transcript.trim();
    if (!message || isLoadingRef.current) return;

    stopSpeech();
    setInput(message);
    setVoiceTranscript(message);
    setVoiceError("");
    setVoiceMode("processing");
    voiceSessionActiveRef.current = true;

    if (voiceSendTimerRef.current) {
      window.clearTimeout(voiceSendTimerRef.current);
    }

    voiceSendTimerRef.current = window.setTimeout(() => {
      if (!isLoadingRef.current) {
        sendMessageRef.current(message);
        setInput("");
      }
    }, 120);
  }, [stopSpeech]);

  const getSpeakableText = useCallback((content: string) => {
    return content
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[*_>#-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }, []);

  const loadSpeechVoices = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return Promise.resolve<SpeechSynthesisVoice[]>([]);
    }

    const synthesis = window.speechSynthesis;
    const voices = synthesis.getVoices();
    if (voices.length > 0) {
      return Promise.resolve(voices);
    }

    if (voiceLoadPromiseRef.current) {
      return voiceLoadPromiseRef.current;
    }

    voiceLoadPromiseRef.current = new Promise<SpeechSynthesisVoice[]>((resolve) => {
      const previousVoicesChanged = synthesis.onvoiceschanged;
      const handleVoicesChanged = (event: Event) => {
        const loadedVoices = synthesis.getVoices();
        if (loadedVoices.length === 0) return;

        synthesis.onvoiceschanged = previousVoicesChanged;
        if (typeof previousVoicesChanged === "function") {
          previousVoicesChanged.call(synthesis, event);
        }
        voiceLoadPromiseRef.current = null;
        resolve(loadedVoices);
      };

      synthesis.onvoiceschanged = handleVoicesChanged;

      window.setTimeout(() => {
        if (synthesis.onvoiceschanged === handleVoicesChanged) {
          synthesis.onvoiceschanged = previousVoicesChanged;
        }
        voiceLoadPromiseRef.current = null;
        resolve(synthesis.getVoices());
      }, 1200);
    });

    return voiceLoadPromiseRef.current;
  }, []);

  const pickNaturalVoice = useCallback((voices: SpeechSynthesisVoice[]) => {
    const findByName = (name: string) => voices.find((voice) => voice.name === name);

    return findByName("Google UK English Female")
      ?? findByName("Google US English")
      ?? findByName("Microsoft Jenny Online (Natural) - English (United States)")
      ?? findByName("Microsoft Aria Online (Natural) - English (United States)")
      ?? findByName("Microsoft Zira")
      ?? findByName("Microsoft David")
      ?? voices.find((voice) => voice.lang.toLowerCase() === "en-us" && !voice.localService)
      ?? voices.find((voice) => voice.lang.toLowerCase() === "en-in")
      ?? voices.find((voice) => voice.lang.toLowerCase().startsWith("en"));
  }, []);

  const speakAssistantMessage = useCallback(async (content: string, index: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const speechText = getSpeakableText(content);
    if (!speechText) return;

    const synthesis = window.speechSynthesis;
    const speechRequestId = speechRequestIdRef.current + 1;
    speechRequestIdRef.current = speechRequestId;
    synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(speechText);
    const preferredVoice = pickNaturalVoice(await loadSpeechVoices());
    if (speechRequestIdRef.current !== speechRequestId) return;
    if (!isOpenRef.current) return;

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.lang = "en-US";
    utterance.rate = 1.15;
    utterance.pitch = 1.05;
    utterance.volume = 1;
    utterance.onend = () => {
      if (speechRequestIdRef.current === speechRequestId) {
        setSpeakingMessageIndex(null);
        if (voiceSessionActiveRef.current) {
          voiceSessionActiveRef.current = false;
          setVoiceMode("idle");
        }
      }
    };
    utterance.onerror = () => {
      if (speechRequestIdRef.current === speechRequestId) {
        setSpeakingMessageIndex(null);
        if (voiceSessionActiveRef.current) {
          voiceSessionActiveRef.current = false;
          setVoiceMode("idle");
        }
      }
    };

    setSpeakingMessageIndex(index);
    if (voiceSessionActiveRef.current) {
      setVoiceMode("speaking");
    }
    synthesis.speak(utterance);
  }, [getSpeakableText, loadSpeechVoices, pickNaturalVoice]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    const speechOutputSupported = "speechSynthesis" in window;
    const supported = Boolean(SpeechRecognition && speechOutputSupported);
    setIsSpeechOutputSupported(speechOutputSupported);
    setIsVoiceSupported(supported);

    if (!SpeechRecognition || !supported) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-IN";
    recognition.onstart = () => {
      finalTranscriptRef.current = "";
      voiceSessionActiveRef.current = true;
      setIsListening(true);
      setVoiceMode("listening");
      setVoiceTranscript("");
      setVoiceError("");
    };
    recognition.onend = () => {
      setIsListening(false);
      if (voiceModeRef.current === "listening" && !finalTranscriptRef.current.trim()) {
        voiceSessionActiveRef.current = false;
        setVoiceMode("idle");
      }
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      voiceSessionActiveRef.current = false;
      voiceModeRef.current = "error";
      setVoiceMode("error");
      setVoiceError(event.error === "not-allowed" || event.error === "service-not-allowed"
        ? "Microphone access is blocked. Allow it in your browser settings."
        : "Voice input stopped. Tap the mic to try again.");
    };
    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript ?? "";
        if (event.results[index].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const currentTranscript = `${finalTranscriptRef.current} ${finalTranscript || interimTranscript}`.trim();
      setVoiceTranscript(currentTranscript);

      if (finalTranscript.trim()) {
        finalTranscriptRef.current = `${finalTranscriptRef.current} ${finalTranscript}`.trim();
        sendVoiceTranscript(finalTranscriptRef.current);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      recognitionRef.current = null;
      if (voiceSendTimerRef.current) {
        window.clearTimeout(voiceSendTimerRef.current);
      }
      stopSpeech();
    };
  }, [sendVoiceTranscript, stopSpeech]);

  useEffect(() => {
    const latestMessageIndex = messages.length - 1;
    const latestMessage = messages[latestMessageIndex];
    if (!latestMessage || latestMessage.role !== "assistant") return;

    if (messages.length === 1) {
      lastSpokenMessageIndexRef.current = latestMessageIndex;
      return;
    }

    if (!isOpen) {
      lastSpokenMessageIndexRef.current = latestMessageIndex;
      return;
    }

    if (!isVoiceReplyEnabled || !isVoiceSupported || isLoading || typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (lastSpokenMessageIndexRef.current === latestMessageIndex) return;

    lastSpokenMessageIndexRef.current = latestMessageIndex;
    speakAssistantMessage(latestMessage.content, latestMessageIndex);
  }, [isLoading, isOpen, isVoiceReplyEnabled, isVoiceSupported, messages, speakAssistantMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      window.setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isLoading]);

  useEffect(() => {
    if (isOpen) {
      window.setTimeout(() => inputRef.current?.focus(), 300);
      return;
    }

    resetVoiceSession();
    setIsOrderHelpOpen(false);
    setIsAdvancedHelpOpen(false);
  }, [isOpen, resetVoiceSession]);

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
    stopSpeech();
    sendMessage(input.trim());
    setInput("");
  };

  const handlePromptSelection = (value: string) => {
    if (!value || isLoading) return;
    stopSpeech();
    sendMessage(value);
    setIsOrderHelpOpen(false);
    setIsAdvancedHelpOpen(false);
  };

  const handleVoiceButtonClick = () => {
    if (!isVoiceSupported) return;

    if (speakingMessageIndex !== null) {
      stopSpeech();
      return;
    }

    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    stopSpeech();
    try {
      finalTranscriptRef.current = "";
      voiceSessionActiveRef.current = true;
      setVoiceTranscript("");
      setVoiceError("");
      setVoiceMode("listening");
      recognition.start();
    } catch {
      setIsListening(false);
      voiceSessionActiveRef.current = false;
      voiceModeRef.current = "error";
      setVoiceMode("error");
      setVoiceError("Voice input could not start. Tap the mic to try again.");
    }
  };

  const handleVoiceOverlayCancel = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    finalTranscriptRef.current = "";
    setVoiceTranscript("");
    setVoiceError("");
    stopSpeech();
    voiceSessionActiveRef.current = false;
    setVoiceMode("idle");
  };

  const handleMessageSpeechClick = (content: string, index: number) => {
    if (!isSpeechOutputSupported) return;

    if (speakingMessageIndex === index) {
      stopSpeech();
      return;
    }

    speakAssistantMessage(content, index);
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

      <div className={`bh-panel ${isOpen ? "bh-panel-open" : ""} ${isVoiceOverlayOpen ? "bh-panel-voice-active" : ""}`}>
        <div className="bh-header">
          <div className="bh-header-left">
            <div className="bh-avatar">🤖</div>
            <div className="bh-header-info">
              <div className="bh-bot-name">{headerTitle}</div>
              <div className="bh-bot-status">
                <span className="bh-status-dot" />
                <span className="bh-bot-subtitle">{subtitle}</span>
              </div>
            </div>
          </div>
          <div className="bh-header-actions">
            {isSpeechOutputSupported && (
              <button
                type="button"
                className={`bh-voice-reply-toggle ${isVoiceReplyEnabled ? "bh-voice-reply-toggle-on" : ""}`}
                onClick={() => {
                  stopSpeech();
                  setIsVoiceReplyEnabled((value) => !value);
                }}
                title={isVoiceReplyEnabled ? "Voice replies on" : "Voice replies off"}
                aria-label={isVoiceReplyEnabled ? "Turn voice replies off" : "Turn voice replies on"}
                aria-pressed={isVoiceReplyEnabled}
              >
                {isVoiceReplyEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </button>
            )}
            <button className="bh-clear-btn" onClick={clearChat} title="Clear chat">
              <RotateCcw size={15} />
            </button>
          </div>
        </div>

        <div className="bh-messages">
          {messages.map((message, index) => (
            <div key={index} className={`bh-msg-row ${message.role === "user" ? "bh-user-row" : "bh-bot-row"} ${message.role === "assistant" && speakingMessageIndex === index ? "bh-bot-row-speaking" : ""}`}>
              {message.role === "assistant" && <div className="bh-msg-avatar">🤖</div>}
              {message.role === "assistant" ? (
                <div className="bh-bot-message-stack">
                  <div className={`bh-bubble bh-bot-bubble ${speakingMessageIndex === index ? "bh-speaking-bubble" : ""}`}>
                    {message.content}
                    {speakingMessageIndex === index && (
                      <span className="bh-inline-waveform" aria-hidden="true">
                        <span />
                        <span />
                        <span />
                      </span>
                    )}
                  </div>
                  {isSpeechOutputSupported && (
                    <button
                      type="button"
                      className={`bh-message-speaker-btn ${speakingMessageIndex === index ? "bh-message-speaker-active" : ""}`}
                      onClick={() => handleMessageSpeechClick(message.content, index)}
                      aria-label={speakingMessageIndex === index ? "Stop reading message" : "Read message aloud"}
                      title={speakingMessageIndex === index ? "Stop reading" : "Read aloud"}
                    >
                      {speakingMessageIndex === index ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    </button>
                  )}
                </div>
              ) : (
                <div className="bh-bubble bh-user-bubble">
                  {message.content}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="bh-msg-row bh-bot-row">
              <div className="bh-msg-avatar">🤖</div>
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

        {isVoiceOverlayOpen ? (
          <div className={`bh-voice-overlay bh-voice-overlay-${voiceMode}`}>
            <div className="bh-voice-equalizer" aria-hidden="true">
              <span className="bh-voice-bar" />
              <span className="bh-voice-bar" />
              <span className="bh-voice-bar" />
              <span className="bh-voice-bar" />
              <span className="bh-voice-bar" />
            </div>
            <div className="bh-voice-state-label" aria-live="polite">{voiceModeLabel}</div>
            {voiceMode !== "error" && (
              <div className="bh-voice-transcript">
                {voiceTranscript || "Say something to ByteBot..."}
              </div>
            )}
            {voiceError && <div className="bh-voice-error" role="status">{voiceError}</div>}
            <button
              type="button"
              className="bh-voice-overlay-button"
              onClick={handleVoiceOverlayCancel}
              aria-label="Stop voice conversation"
              title="Stop voice conversation"
            >
              {voiceMode === "processing" ? <Loader2 size={28} /> : voiceMode === "speaking" ? <VolumeX size={28} /> : <MicOff size={28} />}
            </button>
          </div>
        ) : (
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
            {isVoiceSupported && (
              <button
                type="button"
                className={`bh-voice-btn ${isListening ? "bh-voice-listening" : ""} ${speakingMessageIndex !== null ? "bh-voice-speaking" : ""}`}
                onClick={handleVoiceButtonClick}
                disabled={isLoading && !isListening && speakingMessageIndex === null}
                aria-label={isListening ? "Stop listening" : speakingMessageIndex !== null ? "Stop speaking" : "Start voice input"}
                title={isListening ? "Stop listening" : speakingMessageIndex !== null ? "Stop speaking" : "Start voice input"}
              >
                {speakingMessageIndex !== null ? <VolumeX size={16} /> : isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}
            <button className="bh-send-btn" onClick={handleSend} disabled={!input.trim() || isLoading} aria-label="Send">
              <Send size={16} />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
