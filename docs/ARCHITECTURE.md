# Architecture Deep-Dive

## Data Flow

### Chat query lifecycle

```
User types message
        │
        ▼
Next.js frontend (useChat hook)
        │  POST /api/chat
        ▼
FastAPI chat route
        │
        ├─ Detect booking intent? ──YES──► CalendarService → availability context
        │
        ▼ NO
RAGEngine.query()
        │
        ├─ 1. similarity_search_with_score (Pinecone, top-5)
        ├─ 2. Filter by similarity threshold (0.70)
        ├─ 3. Format context string from retrieved chunks
        ├─ 4. Build system prompt (grounding prompt + context + history)
        └─ 5. GPT-4o completion → answer
        │
        ▼
ChatResponse (message + sources + booking_link)
        │
        ▼
MessageBubble renders markdown + source citations
```

### Voice call lifecycle

```
Phone rings Vapi number
        │
        ▼
Vapi STT (Deepgram nova-2) → transcript
        │
        ▼
GPT-4o reasoning → decides to call a function
        │
        ▼
Vapi HTTP function-call → POST /api/voice/vapi/webhook
        │
        ├─ get_background_info → RAGEngine.query()
        ├─ get_availability   → CalendarService.get_availability()
        ├─ book_meeting        → CalendarService.create_booking()
        └─ get_github_info    → RAGEngine.query()
        │
        ▼
Result returned to Vapi as JSON
        │
        ▼
Vapi TTS (ElevenLabs) → audio played to caller
```

## Ingestion Pipeline

```
resume.pdf  ──► pypdf extract ──► section splitter ──► RecursiveCharacterTextSplitter
                                                               │
GitHub API  ──► PyGithub fetch ──► README + metadata ─────────┤
                                   format_repo_for_embedding   │
                                                               ▼
                                                    OpenAI text-embedding-3-small
                                                               │
                                                               ▼
                                                    Pinecone serverless index
                                                    (cosine similarity, 1536-dim)
```

## Infrastructure

| Component | Service | Notes |
|-----------|---------|-------|
| Backend API | Railway | Auto-deploys on `git push` |
| Frontend | Vercel | Edge network, instant CDN |
| Vector DB | Pinecone (serverless) | Pay-per-query, no always-on cost |
| Voice | Vapi | Manages SIP, STT, TTS orchestration |
| Calendar | Cal.com | Free tier supports API bookings |
| Embeddings | OpenAI text-embedding-3-small | 1536-dim |
| Generation | OpenAI GPT-4o | Temperature 0.3 for consistency |
| TTS | ElevenLabs | Per Vapi config |
| STT | Deepgram nova-2 | Bundled via Vapi |

## Chunking Strategy

- **Chunk size:** 512 characters
- **Overlap:** 50 characters
- **Splitter:** `RecursiveCharacterTextSplitter` (`\n\n → \n → . → " "`)
- **Resume:** split by section first (experience, education, etc.) then character-level within each section
- **GitHub:** one document per repo (README + metadata), then character-level split

## Similarity Threshold

Retrieval uses cosine similarity scores from Pinecone. Results below the configured threshold may still fall back to the top-3 matches with lower confidence.
