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
  const [showBookingCard, setShowBookingCard] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendQuery = async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return;

    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setShowBookingCard(false);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages,
          userMessage: userMessage
        })
      });

      if (!res.ok) throw new Error("API request failed");

      const sourcesHeader = res.headers.get("X-Sources");
      let parsedSources: Source[] = [];
      if (sourcesHeader) {
        try { parsedSources = JSON.parse(sourcesHeader); } catch (e) {}
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantResponse = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "", sources: parsedSources }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunkText = decoder.decode(value, { stream: true });
          assistantResponse += chunkText;

          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1].content = assistantResponse;
            return updated;
          });
        }
      }

      if (shouldShowBooking(assistantResponse)) {
        setShowBookingCard(true);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendQuery(input);
  };

  const renderSources = (sources: Source[]) => {
    if (!sources || sources.length === 0) return null;
    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {sources.map((s, idx) => (
          <span key={idx} className="bg-[#13131a] text-gray-400 text-xs px-2.5 py-1 rounded-full border border-white/5 flex items-center gap-1">
            {s.source_type === "resume" && "📄 Resume"}
            {s.source_type === "github" && `💻 github.com/${s.repo_name}`}
            {s.source_type === "bio" && "👤 Bio"}
          </span>
        ))}
      </div>
    );
  };

  const shouldShowBooking = (text: string) => {
    const lower = text.toLowerCase();
    return lower.includes("book") || lower.includes("schedule") || lower.includes("meeting") || lower.includes("call") || lower.includes("interview");
  };

  const suggestedQuestions = [
    "Why should we hire you?",
    "Tell me about your projects",
    "Book a call with Janhavi"
  ];

  return (
    <div className="h-screen flex flex-col font-sans" style={{ backgroundColor: "#0a0a0f" }}>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
      
      {/* Header */}
      <header className="flex-none px-6 py-4 flex items-center justify-between border-b border-white/5 bg-[#0a0a0f] z-10 shadow-sm">
        <div className="text-xl font-bold bg-gradient-to-r from-[#7c3aed] to-[#4f46e5] bg-clip-text text-transparent">
          AltMe
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </div>
          <span className="text-gray-300 text-sm font-medium">Online</span>
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto scrollbar-hide relative pb-4">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 w-full pt-8 sm:pt-12">
          
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-10 pb-8 animate-fade-in text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#4f46e5] flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-[#7c3aed]/20 mb-6 border border-white/10">
                JK
              </div>
              <h1 className="text-white font-bold text-2xl mb-2">Janhavi Kolekar</h1>
              <p className="text-gray-400 text-sm mb-6">AI / ML Engineer • GenAI & LLM Applications</p>
              
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                <span className="px-4 py-1.5 rounded-full bg-[#7c3aed]/10 text-[#a78bfa] text-xs font-medium border border-[#7c3aed]/20">LangGraph</span>
                <span className="px-4 py-1.5 rounded-full bg-[#7c3aed]/10 text-[#a78bfa] text-xs font-medium border border-[#7c3aed]/20">RAG Systems</span>
                <span className="px-4 py-1.5 rounded-full bg-[#7c3aed]/10 text-[#a78bfa] text-xs font-medium border border-[#7c3aed]/20">Voice Agents</span>
              </div>
              
              <p className="text-gray-500 text-sm">Ask me anything about my background, projects, or book a call</p>
            </div>
          )}

          <div className="space-y-6">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
                
                {m.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#4f46e5] flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mr-3 mt-1 shadow-sm">
                    JK
                  </div>
                )}
                
                <div className="max-w-[85%]">
                  <div
                    className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                      m.role === "user" 
                      ? "bg-gradient-to-r from-[#7c3aed] to-[#4f46e5] text-white rounded-br-sm" 
                      : "bg-[#1e1e2e] text-gray-200 border border-white/5 rounded-bl-sm"
                    }`}
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {m.content}
                  </div>
                  
                  {m.role === "assistant" && renderSources(m.sources || [])}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#4f46e5] flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mr-3 mt-1 shadow-sm">
                  JK
                </div>
                <div className="bg-[#1e1e2e] border border-white/5 rounded-2xl rounded-bl-sm px-5 py-4 flex items-center gap-1.5 h-[50px]">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-none bg-[#0a0a0f] border-t border-white/5 p-4 z-20">
        <div className="max-w-3xl mx-auto w-full relative">
          
          {/* Booking Card */}
          {showBookingCard && (
            <div className="absolute bottom-[calc(100%+16px)] left-0 right-0 sm:left-auto sm:w-[350px] bg-[#13131a] border border-[#7c3aed]/30 rounded-2xl p-5 shadow-2xl shadow-black/80 animate-fade-in z-50">
              <button onClick={() => setShowBookingCard(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
              <h3 className="text-white font-bold text-lg mb-1 flex items-center gap-2">📅 Book an Interview</h3>
              <p className="text-gray-400 text-sm mb-5">30 min • Google Meet</p>
              <a 
                href={process.env.NEXT_PUBLIC_CAL_URL || "https://cal.com/janhavi-kolekar/interview"}
                target="_blank"
                rel="noopener noreferrer" 
                className="w-full inline-flex justify-center items-center bg-teal-500 hover:bg-teal-400 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors shadow-lg shadow-teal-500/20"
                onClick={() => setShowBookingCard(false)}
              >
                Schedule Now
              </a>
            </div>
          )}

          {/* Suggested Questions */}
          {messages.length === 0 && (
            <div className="flex flex-wrap gap-2 mb-4 justify-start animate-fade-in">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendQuery(q)}
                  className="bg-[#1e1e2e] hover:bg-[#2a2a3e] border border-white/10 hover:border-[#7c3aed]/30 text-gray-300 text-sm px-4 py-2 rounded-full transition-all whitespace-nowrap"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative flex items-center">
            <input
              type="text"
              className="w-full bg-[#13131a] border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-white placeholder-gray-500 focus:outline-none focus:border-[#7c3aed]/50 focus:ring-1 focus:ring-[#7c3aed]/50 transition-all shadow-inner text-[15px]"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-[#7c3aed] to-[#4f46e5] text-white w-10 h-10 rounded-xl flex items-center justify-center hover:opacity-90 disabled:opacity-50 disabled:hover:opacity-50 transition-opacity"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
              )}
            </button>
          </form>
          <div className="text-center mt-3">
            <p className="text-[11px] text-gray-600 font-medium tracking-wide">AltMe AI • Answers may be inaccurate</p>
          </div>
        </div>
      </div>
    </div>
  );
}
