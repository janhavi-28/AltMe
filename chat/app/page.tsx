"use client";

import { useState, useRef, useEffect } from "react";

type Source = {
  id: number;
  source_type: string;
  repo_name?: string;
  similarity?: number;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setShowCalendar(false);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages, // Send history
          userMessage: userMessage
        })
      });

      if (!res.ok) {
        throw new Error("API request failed");
      }

      // Parse custom sources header
      const sourcesHeader = res.headers.get("X-Sources");
      let parsedSources: Source[] = [];
      if (sourcesHeader) {
        try {
          parsedSources = JSON.parse(sourcesHeader);
        } catch (e) {
          console.error("Failed to parse sources", e);
        }
      }

      // Handle streaming text
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = "";

      // Add a placeholder message for the assistant
      setMessages((prev) => [...prev, { role: "assistant", content: "", sources: parsedSources }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunkText = decoder.decode(value, { stream: true });
          assistantResponse += chunkText;

          // Update the last message
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1].content = assistantResponse;
            return updated;
          });
        }
      }

    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error connecting to the server." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to format source citations
  const renderSources = (sources: Source[]) => {
    if (!sources || sources.length === 0) return null;
    return (
      <div className="mt-2 text-xs text-gray-500 flex flex-wrap gap-2">
        {sources.map((s, idx) => (
          <span key={idx} className="bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
            {s.source_type === "resume" && "📄 Resume"}
            {s.source_type === "github" && `💻 github.com/${s.repo_name}`}
            {s.source_type === "bio" && "👤 Bio"}
          </span>
        ))}
      </div>
    );
  };

  // Helper to check if we should show a booking button
  const shouldShowBooking = (text: string) => {
    const lower = text.toLowerCase();
    return lower.includes("book") || lower.includes("schedule") || lower.includes("meeting") || lower.includes("call");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
      
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px]"></div>
      </div>

      <div className="w-full max-w-3xl bg-white/10 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] flex flex-col h-[85vh] overflow-hidden border border-white/10 relative z-10 transition-all duration-300">
        
        {/* Header */}
        <div className="bg-white/5 border-b border-white/10 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                J
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-indigo-950 rounded-full"></div>
            </div>
            <div>
              <h1 className="text-white font-semibold tracking-wide text-lg">Janhavi's AI Representative</h1>
              <p className="text-indigo-200/70 text-xs font-medium">Always online</p>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-fade-in-up">
              <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center mb-2">
                <span className="text-4xl">✨</span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Say Hello!</h2>
              <p className="text-indigo-200/80 max-w-md">
                I'm Janhavi's AI assistant. You can ask me about her skills, experience, recent projects, or even book a quick call.
              </p>
            </div>
          )}

          {messages.map((m, idx) => (
            <div key={idx} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"} animate-fade-in`}>
              <div
                className={`max-w-[85%] px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                  m.role === "user" 
                  ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-br-sm" 
                  : "bg-white/10 text-gray-100 rounded-bl-sm border border-white/5"
                }`}
                style={{ whiteSpace: "pre-wrap" }}
              >
                {m.content}
              </div>

              {/* Citations below assistant message */}
              {m.role === "assistant" && renderSources(m.sources || [])}

              {/* Booking Button Injection */}
              {m.role === "assistant" && shouldShowBooking(m.content) && idx === messages.length - 1 && !isLoading && (
                <div className="mt-4 animate-bounce-in">
                  <button 
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-sm px-5 py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center gap-2"
                  >
                    <span>{showCalendar ? "✕ Close Calendar" : "📅 Find a Time"}</span>
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Cal.com Inline Embed */}
          {showCalendar && (
            <div className="w-full h-[450px] mt-4 border border-white/10 rounded-2xl overflow-hidden bg-white/5 animate-fade-in">
              <iframe 
                src={process.env.NEXT_PUBLIC_CAL_URL || "https://cal.com/janhavi-kolekar/interview"} 
                className="w-full h-full"
                title="Book a call"
              />
            </div>
          )}

          {isLoading && (
            <div className="flex items-start gap-2 text-indigo-200/60 text-sm pl-2">
              <div className="flex space-x-1 mt-1.5">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
              </div>
              <span>Typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white/5 border-t border-white/10">
          <form onSubmit={handleSubmit} className="flex gap-3 relative">
            <input
              type="text"
              className="flex-1 bg-white/10 border border-white/10 rounded-full px-6 py-3.5 text-white placeholder-indigo-200/50 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all shadow-inner"
              placeholder="Ask me anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-indigo-500 text-white px-6 py-3.5 rounded-full font-medium hover:bg-indigo-400 disabled:opacity-50 disabled:hover:bg-indigo-500 transition-all shadow-lg flex items-center justify-center min-w-[100px]"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                "Send"
              )}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
