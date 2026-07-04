"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, ExternalLink } from "lucide-react";
import { COMPANY } from "@/lib/utils";
import AIOrb from "./AIOrb";

type Message = { role: "bot" | "user"; text: string };

const QUICK_REPLIES = [
  "Good areas to invest in Hyderabad?",
  "HMDA vs DTCP plots",
  "EMI for ₹50L loan at 9% for 20 years",
  "What is RERA?",
  "NRI property investment",
];

export default function KnownAIChat() {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input,    setInput]    = useState("");
  const [typing,   setTyping]   = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);

  const isFreshChat = messages.length === 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const send = async (text: string) => {
    if (!text.trim() || typing) return;

    const userMsg: Message = { role: "user", text: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setTyping(true);

    try {
      const res = await fetch("/api/jarvis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          history: messages, // full conversation history for context
        }),
      });
      const data = await res.json();
      const reply = data.reply || "Sorry, I had trouble there. Please try again, or WhatsApp us on 97017 71333!";
      setMessages(prev => [...prev, { role: "bot", text: reply }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "bot",
        text: "Sorry, I had trouble there. Please try again, or WhatsApp us on 97017 71333 for instant help!",
      }]);
    } finally {
      setTyping(false);
    }
  };

  const goldBg = "#C9A24B";

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full text-black shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-105"
        style={{ background: "#0a0a0a" }}
        aria-label="Open KnownAI chat"
        title="KnownAI — PropKnown AI Real Estate Expert"
      >
        {open ? <X size={22} className="text-white" /> : <AIOrb size={38} active={typing} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-80 md:w-96 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          style={{ background: "#1a1a1a", border: "1px solid #333", maxHeight: "calc(100vh - 140px)" }}
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center gap-3 border-b shrink-0" style={{ background: "#0a0a0a", borderColor: "#333" }}>
            <AIOrb size={36} active={typing} />
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold">KnownAI</p>
              <p className="text-gray-400 text-xs truncate">PropKnown AI Real Estate Expert</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-xs">Online</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {isFreshChat && (
              <div className="flex flex-col items-center text-center pt-2 pb-4">
                <AIOrb size={56} className="mb-3" />
                <p className="text-white font-semibold text-sm">KnownAI ready to chat</p>
                <p className="text-gray-400 text-xs mt-1.5 max-w-[220px] leading-relaxed">
                  Ask me anything about properties, areas, RERA, investment — I&apos;m here to help!
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "bot" && <AIOrb size={24} className="mr-2 mt-1" />}
                <div
                  className={`max-w-[82%] px-3 py-2.5 rounded-xl text-sm leading-relaxed whitespace-pre-line break-words ${
                    msg.role === "user" ? "rounded-br-none text-black" : "text-gray-200 rounded-bl-none"
                  }`}
                  style={msg.role === "user" ? { background: goldBg } : { background: "#2a2a2a" }}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div className="flex items-center gap-2">
                <AIOrb size={24} active />
                <div className="px-3 py-2.5 rounded-xl rounded-bl-none flex gap-1 items-center" style={{ background: "#2a2a2a" }}>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.18}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick replies */}
          <div className="px-4 py-2 flex gap-2 overflow-x-auto border-t shrink-0" style={{ borderColor: "#333" }}>
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                disabled={typing}
                className="shrink-0 text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-all disabled:opacity-50"
                style={{ border: "1px solid #444", color: "#ccc" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = goldBg; e.currentTarget.style.color = goldBg; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#444"; e.currentTarget.style.color = "#ccc"; }}
              >
                {q}
              </button>
            ))}
          </div>

          {/* WhatsApp CTA */}
          <div className="px-4 py-2 border-t shrink-0" style={{ borderColor: "#333" }}>
            <a
              href={`https://wa.me/${COMPANY.whatsapp}?text=Hi%20PropKnown!%20I'd%20like%20to%20discuss%20a%20property.`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-90"
              style={{ background: "#25D366", color: "#fff" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Talk to Raghu on WhatsApp
              <ExternalLink size={12} />
            </a>
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="p-3 flex gap-2 border-t shrink-0"
            style={{ borderColor: "#333" }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={typing}
              placeholder="Ask KnownAI anything…"
              className="flex-1 text-white placeholder-gray-500 text-sm rounded-lg px-3 py-2 focus:outline-none disabled:opacity-60"
              style={{ background: "#2a2a2a", border: "1px solid #444" }}
            />
            <button
              type="submit"
              disabled={typing || !input.trim()}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-black transition-all disabled:opacity-40 shrink-0 hover:opacity-80"
              style={{ background: goldBg }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
