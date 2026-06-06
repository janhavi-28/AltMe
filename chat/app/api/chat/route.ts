import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini SDK
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Basic check for prompt injections
const PROMPT_INJECTION_KEYWORDS = [
  "ignore previous instructions",
  "you are now",
  "pretend to be",
  "system prompt",
  "forget everything"
];

export async function POST(req: Request) {
  try {
    const { messages, userMessage } = await req.json();

    if (!userMessage) {
      return new Response("Missing user message", { status: 400 });
    }

    // 1. Guardrails Check
    const lowerMessage = userMessage.toLowerCase();
    const isInjected = PROMPT_INJECTION_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
    
    if (isInjected) {
      return new Response("I'm Sachin's AI rep and I'll stay that way 😊", {
        headers: {
          "Content-Type": "text/plain",
          "X-Sources": JSON.stringify([])
        }
      });
    }

    // 2. Fetch RAG Context from the Python backend
    const ragApiUrl = process.env.RAG_API_URL || "http://localhost:8000/query";
    let ragResultText = "";
    let ragSources = [];

    try {
      const ragRes = await fetch(ragApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userMessage })
      });
      
      if (ragRes.ok) {
        const ragData = await ragRes.json();
        ragResultText = ragData.answer || "";
        ragSources = ragData.sources || [];
      } else {
        console.error("RAG API returned error:", await ragRes.text());
      }
    } catch (e) {
      console.error("Failed to reach RAG endpoint:", e);
    }

    // 3. Build System Prompt & Call Gemini
    const systemPrompt = `You are Sachin's AI representative. Answer only using the context below. If the answer isn't in the context, say so. Never hallucinate. 
    
Context from knowledge base:
${ragResultText}`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", systemInstruction: systemPrompt });

    // Format chat history for Gemini (excluding the current userMessage which we pass directly)
    const formattedHistory = messages.map((m: any) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }]
    }));

    const chat = model.startChat({
      history: formattedHistory,
    });

    // Request streaming response
    const resultStream = await chat.sendMessageStream(userMessage);

    // 4. Create standard Web Stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of resultStream.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              controller.enqueue(new TextEncoder().encode(chunkText));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });

    // 5. Return stream with Sources attached as a Header
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
