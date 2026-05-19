# Architecture

AI Persona is a **retrieval-augmented** assistant over your resume and GitHub, with **real calendar booking**, exposed through **web chat** (Next.js → FastAPI, sync + NDJSON streaming) and **phone voice** (Vapi → FastAPI webhook; fast profile LLM replies plus calendar tools).

**Current deployment (from project env):** frontend on **Vercel**, API on **Railway**, vector store on **Pinecone**, voice on **Vapi**, calendar on **Cal.com**. Chat completion uses a **configurable provider chain** (**Groq / NVIDIA NIM / ModelScope / OpenAI** per `LLM_PROVIDER_ORDER`); embeddings use **NVIDIA NIM** or **ModelScope (OpenAI-compatible)** into a matching Pinecone index. Voice answers use a low-latency LLM (Groq or OpenAI) with an embedded profile, while calendar tools still resolve through Cal.com.

---

## System context (C4-style)

```mermaid
flowchart TB
    subgraph clients [Clients]
        U[User]
    end
    subgraph web [Web]
        FE[Next.js Chat UI]
    end
    subgraph voice [Voice]
        VA[Vapi]
        STT[Deepgram STT]
        TTS[ElevenLabs TTS]
    end
    subgraph backend [Backend]
        API[FastAPI]
        RAG[RAGEngine]
        CAL[CalendarService]
        VOICE[VoiceResponder]
    end
    subgraph data [Data and models]
        PC[(Pinecone)]
        EMB[NVIDIA NIM / ModelScope embeddings]
        LLM[Groq / NVIDIA / ModelScope / OpenAI chat]
        VLLM[Groq / OpenAI voice LLM]
        GH[GitHub API]
        PDF[Resume PDF]
        CFG[persona_config.yaml]
        CC[Cal.com]
    end
    U --> FE
    U --> VA
    FE -->|POST /api/chat\nPOST /api/chat/stream| API
    VA -->|voice webhooks| API
    VA --> STT
    VA --> TTS
    API --> RAG
    API --> CAL
    API --> VOICE
    API -->|latest repo lookup| GH
    RAG --> PC
    RAG --> EMB
    RAG --> LLM
    RAG --> PDF
    RAG --> CFG
    VOICE --> VLLM
    CAL --> CC
```

---

## LLM and embeddings (runtime)

| Layer | Typical setup | Notes |
|-------|----------------|-------|
| **Chat LLM** | Ordered chain via `LLM_PROVIDER_ORDER` | Defaults in code include Groq, NVIDIA NIM, ModelScope, OpenAI; timeouts in `LLM_REQUEST_TIMEOUT_SECONDS`. |
| **Voice LLM** | Groq llama-3.1-8b-instant or OpenAI gpt-4o-mini | Used inside `/api/voice/vapi/webhook` for fast profile answers (no Pinecone lookup). |
| **Embeddings** | NVIDIA NIM NeMo 300M when `NVIDIA_EMBEDDING_API_KEY` is set; otherwise ModelScope/OpenAI-compatible | Dimension must match `PINECONE_EMBEDDING_DIMENSION` (2048 for NeMo, 4096 for Qwen, 1536 for text-embedding-3-small). |
| **Fallback embeddings** | OpenAI text-embedding-3-small | Used when NVIDIA embedding key is unset and no custom `EMBEDDING_API_BASE` is configured. |

Re-ingest documents whenever you change embedding provider or dimension.

---

## Persona configuration

Persona settings live in `backend/data/persona_config.yaml` and influence both chat and ingestion:

- **Name/role** surface in prompts and `/api/persona` for the frontend header.
- **resume_file** selects which PDF under `backend/data/` is ingested.
- **background_notes** and **target_role_requirements** are injected into the chat system prompt.
- **github_showcase_repos** and **github_exclude_repos** filter ingestion and boost retrieval ranking.

---

## Chat query lifecycle

**Sequence**

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Next.js
    participant API as FastAPI
    participant GH as GitHub API
    participant RAG as RAGEngine
    participant PC as Pinecone
    participant LLM as Chat LLM
    participant CAL as CalendarService
    U->>FE: Message
    FE->>API: POST /api/chat or /api/chat/stream
    alt "latest GitHub" query
        API->>GH: fetch_latest_public_repos
        GH-->>API: repo list
        API-->>FE: deterministic list
    else Booking intent
        API->>CAL: get availability
        CAL-->>API: slots
        API->>RAG: query() + booking context
        RAG->>PC: similarity_search_with_score
        PC-->>RAG: chunks + scores
        RAG->>LLM: grounded system + context
        LLM-->>RAG: answer
        RAG-->>API: answer + sources
        API-->>FE: JSON message + sources
    else RAG path
        API->>RAG: query()
        RAG->>PC: similarity_search_with_score
        PC-->>RAG: chunks + scores
        RAG->>LLM: grounded system + context
        LLM-->>RAG: answer
        RAG-->>API: answer + sources
        API-->>FE: JSON message + sources
    end
    FE-->>U: Markdown + citations
```

**ASCII overview**

```
User types message
        │
        ▼
Next.js frontend (useChat hook)
        │  POST /api/chat or /api/chat/stream (NDJSON tokens)
        ▼
FastAPI chat route
        │
        ├─ Latest GitHub query? ──YES──► GitHub API → deterministic latest list
        │
        ├─ Detect booking intent? ──YES──► CalendarService → availability context → RAGEngine.query(additional_context)
        │
        ▼ NO
RAGEngine.query()
        │
        ├─ 1. similarity_search_with_score (Pinecone, top-k)
        ├─ 2. Filter by similarity threshold (default 0.70)
        ├─ 3. Optional fallback if nothing passes threshold
        ├─ 4. Format context string from retrieved chunks
        ├─ 5. Build system prompt (grounding prompt + context + history)
        └─ 6. LLM completion (provider chain) → answer
        │
        ▼
ChatResponse (message + sources + booking_link + available_slots + timezone)
        │
        ▼
MessageBubble renders markdown + source citations
```

`/api/chat/stream` returns NDJSON events (`token`, `done`, `error`) for progressive UI updates while reusing the same booking/RAG logic as `/api/chat`.

---

## Voice call lifecycle

```mermaid
sequenceDiagram
    participant C as Caller
    participant V as Vapi
    participant API as FastAPI webhook
    participant VLLM as Voice LLM
    participant CAL as CalendarService
    participant CC as Cal.com
    C->>V: Audio
    V->>V: STT then LLM + tools
    V->>API: POST /api/voice/vapi/webhook
    alt assistant-request (normal questions)
        API->>VLLM: fast profile prompt
        VLLM-->>API: response text
    else get_availability / book_meeting
        API->>CAL: Cal.com
        CAL-->>API: slots / booking result
    end
    API-->>V: JSON result
    V-->>C: TTS audio
```

**ASCII overview**

```
Phone rings Vapi number
        │
        ▼
Vapi STT (Deepgram nova-2) → transcript
        │
        ▼
LLM reasoning → assistant-request or scheduling tool call
        │
        ▼
Vapi HTTP function-call → POST /api/voice/vapi/webhook
        │
        ├─ assistant-request → Voice LLM (Groq/OpenAI) with embedded profile
        ├─ get_availability  → CalendarService.get_availability()
        └─ book_meeting       → CalendarService.create_booking()
        │
        ▼
Result returned to Vapi as JSON
        │
        ▼
Vapi TTS (ElevenLabs) → audio played to caller
```

---

## Ingestion pipeline

```
persona_config.yaml (resume_file, repo filters)
          │
resume.pdf ──► pypdf extract ──► section splitter + full-text chunking ──► RecursiveCharacterTextSplitter
                                                                          │
GitHub API ──► PyGithub fetch ──► README + metadata + portfolio summary ──┤
                                   format_repo_for_embedding             │
                                                                          ▼
                                                       Embedding API (NVIDIA NIM or ModelScope / OpenAI-compatible)
                                                                          │
                                                                          ▼
                                                       Pinecone serverless index
                                                       (cosine similarity; dimension matches embedding model, e.g. 2048)
```

Operational refreshes run locally via `make ingest` or in production via `POST /api/ingest/github` and `POST /api/ingest/all`.

---

## Infrastructure

| Component | Service | Notes |
|-----------|---------|-------|
| Backend API | Railway | e.g. `BACKEND_URL` in `.env` |
| Frontend | Vercel | e.g. `FRONTEND_URL` / `CHAT_URL` |
| Vector DB | Pinecone (serverless) | Index name + dimension must match embeddings |
| Voice | Vapi | SIP, STT, TTS; `BACKEND_URL` for webhooks |
| Calendar | Cal.com | API + `EVENT_TYPE_ID` |
| Embeddings | NVIDIA NIM (NeMo 300M) or ModelScope / other | See `backend/app/config.py` |
| Chat LLM | Groq / NVIDIA / ModelScope / OpenAI (chain) | `LLM_PROVIDER_ORDER` |
| Voice LLM | Groq / OpenAI | Used in `/api/voice/vapi/webhook` for fast profile replies |
| TTS | ElevenLabs | Per Vapi config |
| STT | Deepgram nova-2 | Bundled via Vapi |

---

## Chunking strategy

- **Chunk size:** 512 characters
- **Overlap:** 50 characters
- **Splitter:** `RecursiveCharacterTextSplitter` (`\n\n → \n → . → " "`)
- **Resume:** split by section first (experience, education, etc.) plus a full-text chunk, then character-level within each segment
- **GitHub:** one document per repo (README + metadata) plus a portfolio summary doc, then character-level split (filters via `persona_config`)

---

## Similarity threshold and retrieval behavior

Retrieval uses cosine similarity scores from Pinecone. Chunks below `similarity_threshold` (default **0.70**) are filtered; if nothing passes, the pipeline can fall back to the strongest available matches so the model still receives context. GitHub “showcase” repos from `persona_config` are boosted for project queries, while excluded repos are dropped from context. For recency-focused questions, the system prefers a live GitHub API lookup and otherwise ranks by `pushed_at` metadata.

---

## Related docs

- [API Reference](API.md)
- [Setup](SETUP.md)
- Root [README](../README.md) for stack table and quick start
