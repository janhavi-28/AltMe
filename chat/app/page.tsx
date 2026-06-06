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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-lg flex flex-col h-[80vh] overflow-hidden border border-gray-200">
        
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 font-semibold shadow-sm text-center">
          Janhavi's AI Representative
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-10">
              <p>Say hello! You can ask about my skills, projects, or book a call.</p>
            </div>
          )}

          {messages.map((m, idx) => (
            <div key={idx} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                  m.role === "user" 
                  ? "bg-blue-500 text-white rounded-br-none" 
                  : "bg-gray-100 text-gray-800 rounded-bl-none"
                }`}
                style={{ whiteSpace: "pre-wrap" }}
              >
                {m.content}
              </div>

              {/* Citations below assistant message */}
              {m.role === "assistant" && renderSources(m.sources || [])}

              {/* Booking Button Injection */}
              {m.role === "assistant" && shouldShowBooking(m.content) && idx === messages.length - 1 && !isLoading && (
                <div className="mt-3">
                  <button 
                    onClick={() => setShowCalendar(!showCalendar)}
                    className="bg-black text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition"
                  >
                    {showCalendar ? "Close Calendar" : "📅 Book a Call"}
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Cal.com Inline Embed */}
          {showCalendar && (
            <div className="w-full h-[400px] mt-4 border border-gray-200 rounded-lg overflow-hidden">
              <iframe 
                src={process.env.NEXT_PUBLIC_CAL_URL || "https://cal.com/janhavi-kolekar/interview"} 
                className="w-full h-full"
                title="Book a call"
              />
            </div>
          )}

          {isLoading && (
            <div className="text-gray-400 text-sm animate-pulse ml-2">Typing...</div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-gray-100 flex gap-2">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 text-white px-5 py-2 rounded-full font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            Send
          </button>
        </form>

      </div>
    </div>
  );
}
