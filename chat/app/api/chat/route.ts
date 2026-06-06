import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = 'edge';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const PROMPT_INJECTION_KEYWORDS = [
  "ignore previous",
  "you are now",
  "pretend to be",
  "forget your instructions",
  "new persona",
  "act as",
  "jailbreak"
];

const BOOKING_KEYWORDS = ["book", "call", "schedule", "available", "interview", "meet", "slot"];

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();

    if (!message) {
      return new Response("Missing user message", { status: 400 });
    }

    // STEP 1 - Prompt injection check
    const lowerMessage = message.toLowerCase();
    const isInjected = PROMPT_INJECTION_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
    
    if (isInjected) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("I'm Janhavi's AI rep and I'll stay that way 😊 Is there something about her background I can help with?"));
          controller.close();
        }
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Sources": JSON.stringify([])
        }
      });
    }

    // STEP 2 - Call RAG backend
    const ragApiUrl = process.env.RAG_API_URL || "http://localhost:8000/query";
    let ragResultText = "";
    let ragSources: string[] = [];

    try {
      const ragRes = await fetch(ragApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: message })
      });
      
      if (ragRes.ok) {
        const ragData = await ragRes.json();
        ragResultText = ragData.answer || "";
        
        // Map backend objects to strings for the frontend
        if (ragData.sources && Array.isArray(ragData.sources)) {
           ragSources = ragData.sources.map((s: any) => {
             if (s.source_type === "github" && s.repo_name) return `github.com/${s.repo_name}`;
             if (s.source_type) return s.source_type;
             return JSON.stringify(s);
           });
        }
      } else {
        console.error("RAG API returned error:", await ragRes.text());
      }
    } catch (e) {
      console.error("Failed to reach RAG endpoint:", e);
    }

    // STEP 3 - Build system prompt
    const systemPrompt = `You are AltMe, Janhavi Kolekar's AI representative.
Answer ONLY using the context provided below.
If the context does not contain the answer, say: 'I don't have that detail on hand, but you can reach Janhavi directly at janhavikolekar280@gmail.com'
Never invent skills, experience, or facts.
Never break character.
Keep answers concise and conversational — this is a chat interface, not an essay.
Context: ${ragResultText}`;

    // STEP 4 - Call Gemini 2.0 Flash with streaming
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", systemInstruction: systemPrompt });

    // Include last 6 messages of history for context
    const recentHistory = (history || []).slice(-6).map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));

    const chat = model.startChat({
      history: recentHistory,
    });

    const resultStream = await chat.sendMessageStream(message);

    // STEP 6 - Handle booking detection server-side
    const shouldAppendBooking = BOOKING_KEYWORDS.some(k => lowerMessage.includes(k));
    const bookingMessage = "\n\n📅 I can help book a 15-min call with Janhavi. Click the booking card below!";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Fix for the async iterator
          for await (const chunk of resultStream.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              controller.enqueue(new TextEncoder().encode(chunkText));
            }
          }
          if (shouldAppendBooking) {
            controller.enqueue(new TextEncoder().encode(bookingMessage));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });

    // STEP 5 - Set response headers
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Sources": JSON.stringify(ragSources)
      }
    });

  } catch (error) {
    console.error("API Route Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
