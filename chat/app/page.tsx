"use client";
import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

const SUGGESTED = [
  "Why should we hire you?",
  "Tell me about your projects",
  "Book a call with Janhavi",
];

const BOOKING_KEYWORDS = ["book", "call", "schedule", "available", "interview", "meet", "slot"];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [showSuggested, setShowSuggested] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const detectBooking = (text: string) =>
    BOOKING_KEYWORDS.some((k) => text.toLowerCase().includes(k));

  const send = async (text: string) => {
    if (!text.trim()) return;
    setShowSuggested(false);
    if (detectBooking(text)) setShowBooking(true);

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: messages }),
      });

      const sourcesHeader = res.headers.get("X-Sources");
      const sources = sourcesHeader ? JSON.parse(sourcesHeader) : [];
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "", sources }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value);
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: full, sources };
            return updated;
          });
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatSource = (s: string) => {
    const lower = s?.toLowerCase() || "";
    if (lower.includes("resume")) return "📄 Resume";
    if (lower.includes("github")) return "💻 GitHub";
    if (lower.includes("bio")) return "👤 Bio";
    return `👤 ${s}`;
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080810",
      color: "#e2e8f0",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      display: "flex",
      flexDirection: "column",
    }}>

      {/* Ambient background */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,57,255,0.15) 0%, transparent 70%)",
      }} />

      {/* Header */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(8,8,16,0.85)",
        backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: "56px",
      }}>
        <span style={{
          fontWeight: 700, fontSize: "18px", letterSpacing: "-0.5px",
          background: "linear-gradient(135deg, #a78bfa, #6366f1)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>AltMe</span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 8px #22c55e",
            animation: "pulse 2s infinite",
          }} />
          <span style={{ fontSize: "13px", color: "#94a3b8" }}>Online</span>
        </div>
      </header>

      {/* Chat area */}
      <main style={{
        flex: 1, overflowY: "auto", paddingTop: "72px",
        paddingBottom: showBooking ? "220px" : "120px",
        position: "relative", zIndex: 1,
      }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "0 16px" }}>

          {/* Hero — shown before first message */}
          {messages.length === 0 && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              paddingTop: "60px", paddingBottom: "40px", textAlign: "center",
              animation: "fadeIn 0.5s ease",
            }}>
              {/* Avatar */}
              <div style={{
                width: "80px", height: "80px", borderRadius: "50%",
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "28px", fontWeight: 700, color: "white",
                boxShadow: "0 0 40px rgba(124,58,237,0.4)",
                marginBottom: "20px",
              }}>JK</div>

              <h1 style={{ fontSize: "26px", fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.5px" }}>
                Janhavi Kolekar
              </h1>
              <p style={{ fontSize: "14px", color: "#94a3b8", margin: "0 0 16px" }}>
                AI / ML Engineer • GenAI & LLM Applications
              </p>

              {/* Skill badges */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", marginBottom: "20px" }}>
                {["LangGraph", "RAG Systems", "Voice Agents", "FastAPI", "Gemini"].map((s) => (
                  <span key={s} style={{
                    padding: "4px 12px", borderRadius: "20px", fontSize: "12px",
                    background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)",
                    color: "#a78bfa",
                  }}>{s}</span>
                ))}
              </div>

              <p style={{ fontSize: "14px", color: "#64748b", maxWidth: "380px" }}>
                Ask me anything about Janhavi's background, projects, or book a 15-min call
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: "flex",
              flexDirection: msg.role === "user" ? "row-reverse" : "row",
              alignItems: "flex-start", gap: "10px",
              marginBottom: "20px",
              animation: "fadeIn 0.3s ease",
            }}>
              {/* Avatar for assistant */}
              {msg.role === "assistant" && (
                <div style={{
                  width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", fontWeight: 700, color: "white",
                }}>JK</div>
              )}

              <div style={{ maxWidth: "80%", display: "flex", flexDirection: "column", gap: "6px",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  padding: "12px 16px", borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: msg.role === "user"
                    ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                    : "rgba(255,255,255,0.05)",
                  border: msg.role === "assistant" ? "1px solid rgba(255,255,255,0.08)" : "none",
                  fontSize: "14px", lineHeight: "1.6", color: "#e2e8f0",
                  whiteSpace: "pre-wrap",
                }}>
                  {msg.content}
                </div>

                {/* Source pills */}
                {msg.sources && msg.sources.length > 0 && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {Array.from(new Set(msg.sources.map(formatSource))).map((label, j) => (
                      <span key={j} style={{
                        padding: "2px 8px", borderRadius: "10px", fontSize: "11px",
                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                        color: "#64748b",
                      }}>{label}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "50%",
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "12px", fontWeight: 700, color: "white",
              }}>JK</div>
              <div style={{
                padding: "12px 16px", borderRadius: "18px 18px 18px 4px",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              }}>
                <div style={{ display: "flex", gap: "4px" }}>
                  {[0,1,2].map((i) => (
                    <div key={i} style={{
                      width: "6px", height: "6px", borderRadius: "50%",
                      background: "#7c3aed",
                      animation: `bounce 1s infinite ${i * 0.2}s`,
                    }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* Booking card */}
      {showBooking && (
        <div style={{
          position: "fixed", bottom: "110px", left: "50%", transform: "translateX(-50%)",
          width: "min(480px, calc(100vw - 32px))",
          background: "rgba(13,13,25,0.95)", border: "1px solid rgba(99,57,255,0.3)",
          borderRadius: "16px", padding: "16px 20px", zIndex: 40,
          backdropFilter: "blur(12px)",
          boxShadow: "0 0 40px rgba(99,57,255,0.15)",
          animation: "slideUp 0.3s ease",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>
                📅 Book a 15-min Interview
              </div>
              <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                15 min • Google Meet • Janhavi Kolekar
              </div>
            </div>
            <button onClick={() => setShowBooking(false)} style={{
              background: "none", border: "none", color: "#64748b",
              cursor: "pointer", fontSize: "18px", lineHeight: 1,
            }}>×</button>
          </div>
          <button
            onClick={() => window.open(process.env.NEXT_PUBLIC_CAL_URL || "https://cal.com/janhavi-kolekar-niuycl/15min", "_blank")}
            style={{
              marginTop: "12px", width: "100%", padding: "10px",
              borderRadius: "10px", border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              color: "white", fontWeight: 600, fontSize: "14px",
            }}>
            Schedule Now →
          </button>
        </div>
      )}

      {/* Input area */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 40,
        background: "rgba(8,8,16,0.95)", backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "12px 16px 20px",
      }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>

          {/* Suggested chips */}
          {showSuggested && (
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
              {SUGGESTED.map((s) => (
                <button key={s} onClick={() => send(s)} style={{
                  padding: "6px 14px", borderRadius: "20px", fontSize: "13px",
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "#94a3b8", cursor: "pointer", whiteSpace: "nowrap",
                  transition: "all 0.2s",
                }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.background = "rgba(124,58,237,0.2)";
                    (e.target as HTMLElement).style.borderColor = "rgba(124,58,237,0.4)";
                    (e.target as HTMLElement).style.color = "#a78bfa";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                    (e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
                    (e.target as HTMLElement).style.color = "#94a3b8";
                  }}
                >{s}</button>
              ))}
            </div>
          )}

          {/* Input row */}
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
              placeholder="Ask me anything..."
              style={{
                flex: 1, padding: "12px 16px", borderRadius: "12px",
                background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#e2e8f0", fontSize: "14px", outline: "none",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(124,58,237,0.6)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              style={{
                padding: "12px 20px", borderRadius: "12px", border: "none",
                background: loading || !input.trim()
                  ? "rgba(124,58,237,0.3)"
                  : "linear-gradient(135deg, #7c3aed, #4f46e5)",
                color: "white", cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                fontSize: "16px", fontWeight: 600, transition: "all 0.2s",
              }}>→</button>
          </div>
          <p style={{ textAlign: "center", fontSize: "11px", color: "#374151", marginTop: "8px" }}>
            AltMe AI • Answers may be inaccurate
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; } 40% { transform: scale(1.2); opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #080810; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.3); border-radius: 4px; }
      `}</style>
    </div>
  );
}
