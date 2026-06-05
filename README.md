# AltMe — AI Persona System

AltMe is an AI representative that acts as a digital persona for Janhavi. It can chat with users, answer questions about her background, experience, and skills using Retrieval-Augmented Generation (RAG), and seamlessly book interviews directly onto her real calendar.

## Project Structure

*   **`/rag`**: The FastAPI backend. Handles document ingestion (parsing resumes and bios), vector storage via Supabase pgvector, and the retrieval-augmented generation endpoints using Google Gemini.
*   **`/chat`**: The Next.js frontend. Provides a clean, chat-based UI for users to interact with the AI representative in real-time.
*   **`/evals`**: An evaluation pipeline to test the accuracy and hallucination rate of the RAG system, automatically generating detailed PDF reports.
*   **`/rag/vapi`**: Configuration and scripts for integrating **Vapi**, allowing users to speak to the AI persona over the phone.

## Setup & Deployment

1.  **Backend (Railway)**: Deploy the `/rag` directory as the root. Set up the environment variables (`GEMINI_API_KEY`, `SUPABASE_URL`, `CAL_API_KEY`, etc.). Run `/ingest` to load your data.
2.  **Frontend (Vercel)**: Deploy the `/chat` directory as the root. Provide the `NEXT_PUBLIC_CAL_URL` and `RAG_API_URL` environment variables.
3.  **Voice (Vapi)**: Update the `serverUrl` in `vapi_agent_config.json` with your live Railway URL, and run `register_agent.py` to activate phone capabilities.
