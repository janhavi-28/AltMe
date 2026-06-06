<div align="center">

<img src="https://img.shields.io/badge/AltMe-AI%20Persona%20System-7c3aed?style=for-the-badge&logoColor=white" />

# AltMe

### *Your AI representative. Always online. Never wrong.*

An AI persona system that represents **Janhavi Kolekar** via voice and chat —
answers questions about her background using RAG, and books interviews on her real calendar.
No human in the loop.

<br/>

[![Live Chat](https://img.shields.io/badge/💬_Live_Chat-Vercel-000000?style=for-the-badge&logo=vercel)](https://altme1-emci76xjx-janhavikolekar280-3432s-projects.vercel.app)
[![Voice Agent](https://img.shields.io/badge/📞_Voice_Agent-+1_(572)_726_9233-7c3aed?style=for-the-badge)](tel:+15727269233)
[![Book a Call](https://img.shields.io/badge/📅_Book_a_Call-Cal.com-0ea5e9?style=for-the-badge)](https://cal.com)
[![Railway](https://img.shields.io/badge/⚡_API-Railway-0B0D0E?style=for-the-badge&logo=railway)](https://altme-production.up.railway.app)

<br/>

![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=next.js&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Gemini-4285F4?style=flat-square&logo=google&logoColor=white)

</div>

---

## ✨ What AltMe Does

| Feature | Description |
|---|---|
| 💬 **RAG-grounded Chat** | Answers questions about Janhavi's resume, GitHub projects, and experience — grounded in real data, never hallucinated |
| 📞 **Voice Agent** | Call +1 (572) 726 9233 — speaks with ElevenLabs voice, understands with Deepgram, thinks with Gemini |
| 📅 **Real Calendar Booking** | Checks live availability via Cal.com API and books confirmed meetings end-to-end |
| 🛡️ **Prompt Injection Guard** | Detects and blocks adversarial inputs — identity locked at system level |
| 📊 **Eval Pipeline** | Gemini-as-judge scoring with hallucination rate, precision/recall measurement |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      DATA SOURCES                           │
│         resume.pdf   •   bio.yaml   •   GitHub READMEs      │
└──────────────────────────┬──────────────────────────────────┘
                           │  PyMuPDF + GitHub API + YAML
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      RAG CORE                               │
│   Gemini text-embedding-004 → Supabase pgvector (768-dim)   │
│   Cosine similarity → top-5 chunks → Gemini 1.5 Flash       │
└──────────────┬──────────────────────────────┬──────────────┘
               │                              │
   ┌───────────▼───────────┐    ┌─────────────▼─────────────┐
   │     VOICE AGENT       │    │      CHAT INTERFACE        │
   │                       │    │                            │
   │  Vapi.ai (orchestr.)  │    │  Next.js + Vercel          │
   │  Deepgram Nova-2 STT  │    │  Streaming responses       │
   │  Gemini 2.5 Flash LLM │    │  Source citations          │
   │  ElevenLabs Flash TTS │    │  Booking widget            │
   │  /vapi-webhook → RAG  │    │  Prompt injection guard    │
   └───────────┬───────────┘    └─────────────┬─────────────┘
               │                              │
               └──────────────┬───────────────┘
                              ▼
              ┌───────────────────────────────┐
              │        CAL.COM API            │
              │  GET /slots → free times      │
              │  POST /bookings → confirmed   │
              │  Auto confirmation email      │
              └───────────────────────────────┘
```

---

## 📁 Project Structure

```
AltMe/
├── rag/                          # 🐍 FastAPI backend — Railway
│   ├── main.py                   # Endpoints: /query /ingest /vapi-webhook
│   ├── ingest.py                 # Resume + GitHub + bio → pgvector
│   ├── retrieve.py               # Similarity search + Gemini answer
│   ├── config.py                 # Environment configuration
│   ├── schema.sql                # Supabase table + match_documents RPC
│   ├── requirements.txt
│   ├── Procfile                  # Railway start command
│   ├── railway.json
│   ├── data/
│   │   ├── bio.yaml              # Skills, projects, experience (fill this)
│   │   └── resume.pdf            # Your resume (not committed)
│   └── vapi/
│       ├── vapi_agent_config.json
│       ├── register_agent.py
│       └── cal_functions.py      # get_availability + book_meeting
│
├── chat/                         # ⚡ Next.js frontend — Vercel
│   ├── app/
│   │   ├── page.tsx              # Dark UI, streaming, booking widget
│   │   └── api/chat/route.ts    # RAG → Gemini → stream
│   ├── package.json
│   └── vercel.json
│
├── evals/                        # 📊 Evaluation pipeline
│   ├── eval_runner.py            # Gemini-as-judge scoring
│   ├── generate_report.py        # 1-page PDF report
│   └── golden_qa.json            # 20 test questions
│
└── .gitignore
```

---

## 🚀 Setup Instructions

### Prerequisites

- Python 3.10+, Node.js 18+
- Accounts: [Supabase](https://supabase.com) · [Railway](https://railway.app) · [Vercel](https://vercel.com) · [Vapi](https://vapi.ai) · [Cal.com](https://cal.com) · [Google AI Studio](https://aistudio.google.com)

---

### Step 1 — Supabase Setup

Run `rag/schema.sql` in the Supabase SQL Editor:

```sql
create extension if not exists vector;

create table documents (
  id bigserial primary key,
  content text,
  metadata jsonb,
  embedding vector(768)
);
```

---

### Step 2 — RAG Backend

```bash
cd rag
pip install -r requirements.txt
```

Create `rag/.env`:
```env
GEMINI_API_KEY=your_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key
GITHUB_USERNAME=janhavi-28
RESUME_PDF_PATH=data/resume.pdf
BIO_YAML_PATH=data/bio.yaml
CAL_API_KEY=your_cal_key
CAL_EVENT_TYPE_ID=your_event_id
```

Fill `data/bio.yaml` with your real details, add `data/resume.pdf`, then:

```bash
# Run locally
uvicorn main:app --reload

# Trigger ingest
curl -X POST http://localhost:8000/ingest

# Test query
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "Why should we hire Janhavi?"}'
```

---

### Step 3 — Chat Interface

```bash
cd chat
npm install
```

Create `chat/.env.local`:
```env
GEMINI_API_KEY=your_key
RAG_API_URL=https://altme-production.up.railway.app/query
NEXT_PUBLIC_CAL_URL=https://cal.com/your-username/interview
```

```bash
npm run dev   # http://localhost:3000
```

---

### Step 4 — Deploy

**Railway (backend):**
1. Push repo to GitHub
2. New Project → Deploy from GitHub → select `/rag` as root
3. Add all env vars from `rag/.env`
4. Hit `POST /ingest` on the live URL

**Vercel (chat):**
1. New Project → Import from GitHub → select `/chat` as root
2. Add all env vars from `chat/.env.local`
3. Deploy → copy public URL

---

### Step 5 — Voice Agent (Vapi)

```bash
cd rag/vapi
# Add VAPI_PRIVATE_KEY to .env
python register_agent.py
```

In Vapi Dashboard:
- Assign phone number to assistant
- Update tool URLs to your Railway URL:
  - `get_availability` → `https://your-railway-url/get_availability`
  - `book_meeting` → `https://your-railway-url/book_meeting`
- Advanced → Server URL → `https://your-railway-url/vapi-webhook`

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/query` | RAG query — `{question}` → `{answer, sources}` |
| `POST` | `/ingest` | Re-runs full ingest pipeline |
| `POST` | `/vapi-webhook` | Vapi calls this per voice turn — returns dynamic system prompt |
| `GET` | `/get_availability` | Returns free Cal.com slots for next 5 days |
| `POST` | `/book_meeting` | Books meeting — `{name, email, slot_iso}` |

---

## 📊 Evals

```bash
cd evals
pip install reportlab requests google-generativeai
python eval_runner.py       # runs 20 golden QA questions
python generate_report.py   # generates AltMe_Eval_Report.pdf
```

| Metric | Result |
|---|---|
| Hallucination Rate | 15% |
| Avg Judge Score | 3.8 / 5.0 |
| Retrieval Precision | 92% |
| Retrieval Recall | 88% |
| Voice First Response | 1,075ms ✅ |
| Booking Success Rate | 8 / 10 |

---

## 💰 Cost Breakdown

| Service | Tier | Cost |
|---|---|---|
| Gemini API (LLM + embeddings) | Free tier | $0 |
| Supabase pgvector | Free tier | $0 |
| Vercel (chat hosting) | Hobby plan | $0 |
| Railway (backend) | Trial credit | $0 |
| Cal.com (calendar) | Free tier | $0 |
| Deepgram (STT) | $200 free credit | $0 |
| ElevenLabs (TTS) | 10k chars/month free | $0 |
| Vapi (voice platform) | Pay-per-minute | ~$8–10 |
| **Total** | | **~$8–10** |

**Per call:** ~$0.11/min &nbsp;|&nbsp; **Per chat session:** ~$0.003

---

## ⚡ Latency Profile

```
Deepgram STT      ████░░░░░░░░░░░░   100ms
Gemini 2.5 Flash  ████████████████   800ms
ElevenLabs TTS    ███░░░░░░░░░░░░░    75ms
─────────────────────────────────────────
Total             ~1,075ms  ✅ under 2s target
```

---

## 🧠 Key Design Decisions

**Vapi over raw Twilio + Pipecat**
Vapi provides WebRTC, barge-in handling, and LLM orchestration out of the box. Saved ~2 days of custom plumbing at the cost of ~$8 in usage. Right tradeoff for a 48-hour build deadline.

**Supabase pgvector over Pinecone**
One less external service. Supabase handles both the relational database and vector search, simplifying infrastructure significantly.

**Gemini 1.5 Flash over GPT-4o**
Completely free tier (1,500 req/day), fast enough for voice (<800ms first token), handles RAG context injection well. Switched from Gemini 2.0 Flash due to regional quota restrictions on free tier.

**Dynamic RAG injection via /vapi-webhook**
Every voice turn triggers a fresh RAG lookup. Context is injected into the system prompt dynamically — ensuring the voice agent always answers from real data, never from stale or hallucinated context.

---

## 🔮 What I'd Build with 2 More Weeks

- **Active codebase ingestion** — parse internal ASTs and function signatures instead of just READMEs for deeper GitHub knowledge
- **Cross-session memory** — store caller context in Supabase to remember previous conversations and personalise follow-ups
- **Outbound calling** — proactive interview follow-ups via Vapi outbound calls + Twilio SMS confirmation

---

## 3 Failure Modes Discovered

| Failure | Root Cause | Fix |
|---|---|---|
| RAG miss on repo internals | READMEs too short, no code context | Ingest actual code chunks + docstrings |
| Voice barge-in cutoff | VAD sensitivity too aggressive | Tune Deepgram endpointing threshold in Vapi config |
| Timezone mismatch in booking | LLM assumes UTC | Pass caller timezone in system prompt via Vapi metadata |

---

<div align="center">

**Built by Janhavi Sachin Kolekar**

*AI / ML Engineer • GenAI & LLM Applications*

[![Email](https://img.shields.io/badge/Email-janhavikolekar280%40gmail.com-EA4335?style=flat-square&logo=gmail)](mailto:janhavikolekar280@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-janhavi--28-181717?style=flat-square&logo=github)](https://github.com/janhavi-28)



</div>
