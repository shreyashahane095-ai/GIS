import React, { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { useTheme } from "../../context/ThemeContext";
import "./ChatbotPanel.css";

/**
 * Fixed AI Chatbot Panel
 * - Fixed to the right edge of viewport
 * - Collapsible and minimizable without losing conversation
 * - Keeps state locally (mock AI response)
 */
const ChatbotPanel = () => {
  const { isDarkMode } = useTheme(); // ensures re-render on theme change (via data-theme)



  const [chatbotWidth, setChatbotWidth] = useState(() => {
    const raw = window.localStorage.getItem("gis_chatbot_width");
    const n = raw ? Number(raw) : 360;
    if (Number.isFinite(n)) return n;
    return 360;
  });

  // Resize UI removed


  useEffect(() => {
    window.localStorage.setItem("gis_chatbot_width", String(chatbotWidth));
  }, [chatbotWidth]);


  const [messages, setMessages] = useState(() => []);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);


  const historyRef = useRef(null);
  const inputRef = useRef(null);

  const canSend = useMemo(() => {
    return input.trim().length > 0 && !isTyping;
  }, [input, isTyping]);



  useEffect(() => {
    // Auto-scroll to bottom when new message arrives / typing updates.
    if (!historyRef.current) return;
    historyRef.current.scrollTop = historyRef.current.scrollHeight;
  }, [messages, isTyping]);

  const pushMessage = (role, text) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        role,
        text,
        createdAt: Date.now(),
      },
    ]);
  };

  // Mock AI response for UI completion.
  const simulateAIResponse = async (userText) => {
    setIsTyping(true);

    // typing delay
    await new Promise((r) => setTimeout(r, 650));

    // very small heuristic response
    const lower = userText.toLowerCase();
    let response = "Got it. Tell me more about your goal and I’ll suggest next steps.";
    if (lower.includes("layer")) {
      response = "Layers help you structure data. Try selecting a dataset and adjusting visualization settings (color, opacity, stroke) for clarity.";
    } else if (lower.includes("measure") || lower.includes("distance") || lower.includes("area")) {
      response = "To measure, open the Measure tool and choose distance/area. Then click on the map and finish with Enter/right-click.";
    } else if (lower.includes("theme") || lower.includes("dark") || lower.includes("light")) {
      response = "You can toggle between Light and Dark using the theme button in the top navbar. The chatbot follows the app theme automatically.";
    } else if (lower.includes("upload") || lower.includes("image")) {
      response = "Use the Upload Data and Add Image buttons in the left sidebar to add datasets/files. After upload, they will appear as layers you can toggle.";
    }

    await new Promise((r) => setTimeout(r, 450));

    setIsTyping(false);
    pushMessage("assistant", response);
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    setInput("");
    pushMessage("user", trimmed);
    simulateAIResponse(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  // Resize handle removed (no side scrolling / drag-to-resize UI)


  const showEmptyState = messages.length === 0;

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    setIsTyping(false);

    const t = setTimeout(() => {
      inputRef.current?.focus?.();
    }, 50);

    return () => clearTimeout(t);
  };

  const handleChipClick = (text) => {
    setInput(text);
    const t = setTimeout(() => {
      inputRef.current?.focus?.();
    }, 50);
    return () => clearTimeout(t);
  };

  return (
    <section
      className={`chatbot-root`}

      aria-label="AI Chatbot"
      data-theme={isDarkMode ? "dark" : "light"}
      style={{ "--chatbot-width": `${chatbotWidth}px` }}
    >
      <div className="chatbot-card glass-panel">



        <header className="chatbot-header" role="banner">
          <div className="chatbot-header-left">
            <div className="chatbot-avatar" aria-hidden="true">
              <Icon icon="mdi:robot-outline" width={18} height={18} />
            </div>

            <div className="chatbot-header-text">
              <div className="chatbot-bot-name">ChatBot</div>
              <div className="chatbot-bot-subtitle">Your Analytical AI Bot</div>
            </div>
          </div>

          <div className="chatbot-actions" aria-label="Chatbot actions">
            <button
              type="button"
              className="chatbot-new-chat-btn"
              onClick={handleNewChat}
              aria-label="Start a new chat"
              title="New Chat"
            >
              <Icon
                icon="mdi:plus"
                width={16}
                height={16}
                aria-hidden="true"
              />
            </button>

          </div>
        </header>

        <div className="chatbot-tabs" role="tablist" aria-label="Chat tabs">
          <button type="button" className="chatbot-tab active" role="tab" aria-selected="true">
            Current Chat
          </button>
          <button type="button" className="chatbot-tab" role="tab" aria-selected="false">
            History
          </button>
        </div>

        <div className="chatbot-history" ref={historyRef} aria-live="polite">
          <div className="chatbot-conversation">
            {showEmptyState ? (
              <div className="chatbot-empty-state" role="status" aria-live="polite">
                <div className="chatbot-empty-avatar" aria-hidden="true">
                  <Icon icon="mdi:robot-outline" width={22} height={22} />
                </div>

                <div className="chatbot-empty-greeting">
                  <span className="chatbot-empty-greet-text">Hey </span>
                  <span className="chatbot-empty-username">User</span>
                  <span className="chatbot-empty-greet-text"> 👋</span>
                </div>

                <div className="chatbot-empty-subtitle">Ask me about your data.</div>

              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`chatbot-message ${m.role}`}
                  role="article"
                  aria-label={m.role === "user" ? "User message" : "Assistant message"}
                >
                  <div className="chatbot-bubble">{m.text}</div>
                </div>
              ))
            )}

            {isTyping && !showEmptyState && (
              <div className="chatbot-message assistant" role="status" aria-live="polite">
                <div className="chatbot-bubble">
                  <span className="typing-dots" aria-label="Assistant is typing">
                    <span />
                    <span />
                    <span />
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <footer className="chatbot-input-row" role="form" aria-label="Chat input area">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="chatbot-input"
            placeholder="Ask anything..."
            aria-label="Chat input"
          />

          <button
            type="button"
            className="chatbot-send-btn"
            onClick={handleSend}
            disabled={!canSend}
            aria-label="Send message"
            title={canSend ? "Send" : "Type a message"}
          >
            <Icon icon="mdi:send" width={18} height={18} />
          </button>
        </footer>
      </div>
    </section>
  );
};

export default ChatbotPanel;

