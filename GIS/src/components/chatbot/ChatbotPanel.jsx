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

  const [isCollapsed, setIsCollapsed] = useState(false);

  const [chatbotWidth, setChatbotWidth] = useState(() => {
    const raw = window.localStorage.getItem("gis_chatbot_width");
    const n = raw ? Number(raw) : 360;
    if (Number.isFinite(n)) return n;
    return 360;
  });

  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    window.localStorage.setItem("gis_chatbot_width", String(chatbotWidth));
  }, [chatbotWidth]);


  const [messages, setMessages] = useState(() => [
    {
      id: "welcome",
      role: "assistant",
      text: "Hi! I’m your AI Assistant. Ask me about the map, layers, or analysis.",
      createdAt: Date.now(),
    },
  ]);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);


  const historyRef = useRef(null);
  const inputRef = useRef(null);

  const canSend = useMemo(() => {
    return input.trim().length > 0 && !isTyping;
  }, [input, isTyping]);

  useEffect(() => {
    if (!isCollapsed) {
      // Restore focus to input when expanding.
      // Small delay helps after CSS animation triggers.
      const t = setTimeout(() => {
        inputRef.current?.focus?.();
      }, 150);
      return () => clearTimeout(t);
    }
  }, [isCollapsed]);

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
      response = "Use the Upload controls in the secondary navbar to add datasets/files. After upload, they will appear as layers you can toggle.";
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

  const applyWidth = (next) => {
    const min = 280;
    const max = 560;
    const clamped = Math.max(min, Math.min(max, next));
    setChatbotWidth(clamped);
  };

  const startResize = (e) => {
    if (e.button !== 0) return;
    setIsResizing(true);
    e.preventDefault();

    const startX = e.clientX;
    const startWidth = chatbotWidth;

    const onMove = (ev) => {
      const dx = startX - ev.clientX; // dragging left increases width
      applyWidth(startWidth + dx);
    };

    const onUp = () => {
      setIsResizing(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  return (
    <section
      className={`chatbot-root ${isCollapsed ? "collapsed" : "expanded"} ${isResizing ? "resizing" : ""}`}
      aria-label="AI Chatbot"
      data-theme={isDarkMode ? "dark" : "light"}
      style={{ width: chatbotWidth, "--chatbot-width": `${chatbotWidth}px` }}
    >
      <div className="chatbot-card glass-panel" data-resizing={isResizing ? "true" : "false"}>
        <button
          type="button"
          className="chatbot-resize-handle"
          onPointerDown={startResize}
          aria-label="Resize AI assistant panel"
          title="Drag to resize"
        />
        <header className="chatbot-header">
          <div className="chatbot-title">
            <span className="chatbot-icon" aria-hidden="true">
              <Icon icon="mdi:robot-outline" width={18} height={18} />
            </span>
            <span>AI Assistant</span>
          </div>


        </header>

        <div className="chatbot-history" ref={historyRef}>
          <div className="chatbot-conversation">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`chatbot-message ${m.role}`}
                role="article"
                aria-label={m.role === "user" ? "User message" : "Assistant message"}
              >
                <div className="chatbot-bubble">{m.text}</div>
              </div>
            ))}

            {isTyping && (
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


        <footer className="chatbot-input-row">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="chatbot-input"
            placeholder="Ask something..."
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

