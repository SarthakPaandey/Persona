# AI Persona — Eval Report

**Candidate:** Sarthak Pandey  
**Generated:** 2026-04-13 UTC  
**Chat URL:** https://persona-beta-roan.vercel.app  
**Backend URL:** https://persona-production-f24d.up.railway.app  
**Phone:** — (Vapi dashboard / Twilio)  
**Eval Suite:** `evals/` · Voice source: `voice_quality_20260413_183121.json` · Chat source: `chat_groundedness_20260413_183105.json`

---

## 1 · Voice Quality Metrics

| Metric | Target | Measured |
|--------|--------|----------|
| Avg first-response latency | < 2 000 ms | **1,078 ms** |
| P95 first-response latency | < 3 000 ms | **1,840 ms** |
| Calls under 2 s latency | > 90 % | **100%** |
| Task completion rate | > 80 % | **0%** |
| Booking conversion rate | — | **33%** |

**Method:** `eval_voice_quality.py` pulls recent Vapi calls, uses the first bot message `secondsFromStart` as first-response latency, and `analysis.successEvaluation` for task completion. Booking rate uses structured `booking_made` when present.

---

## 2 · Chat Groundedness Metrics

| Metric | Target | Measured |
|--------|--------|----------|
| Overall pass rate | > 85 % | **73%** |
| Hallucination rate | < 10 % | **27%** |
| Keyword coverage (avg) | > 70 % | **74%** |
| Avg response latency | < 3 000 ms | **4,043 ms** |

**Method:** `eval_chat_groundedness.py` posts each case in `test_cases.yaml` to `POST /api/chat`, checks `must_not_contain` / `expected_keywords`, and uses a judge LLM (here **Groq** via `EVAL_JUDGE_PROVIDER=groq`) to flag hallucinated facts. Average latency is above the 3 s target mostly due to **production LLM + network round-trips** on longer answers.

---

## 3 · Failure Modes Found & Fixed

Observed on **2026-04-13** run (`chat_groundedness_20260413_183105.json`). Four cases failed (`bg_003`, `gh_003`, `cal_001`, `edge_003`).

### Failure 1 — Persona framing (“Captain”, “orbit”, “ship AI”) confuses judges and users

**Symptom:** Answers used a fictional voice (e.g. “Captain Sarthak”, “in orbit”) on edge and calendar prompts; the judge flagged these as hallucinations even when resume facts were partially right.  
**Fix:** Tighten the chat system prompt so the assistant speaks as a professional representative only—no sci-fi roleplay—and ground availability in real Cal.com data or explicit “I don’t know” without invented setting.

### Failure 2 — Calendar intent without concrete slots or booking link in the reply

**Symptom:** `cal_001` produced bracket placeholders (`[insert available time slots]`) instead of real slots or a Cal.com link; keywords like `cal.com` were missing.  
**Fix:** Ensure the booking/calendar branch always merges API-backed slots or the public `cal.com` link into the message; never emit placeholder text.

### Failure 3 — Experience / RAG answers sometimes over-interpret or get judge false positives

**Symptom:** `bg_003` failed when the model summarized tenure; `gh_003` failed when the judge treated grounded RAG content as hallucination partly due to “Captain” framing.  
**Fix:** Keep answers strictly tied to retrieved chunks; shorten and factualize numerics; remove quirky persona labels from production prompts so judges and users see consistent, verifiable text.

### Voice note

**Symptom:** Vapi **task completion** shows **0%** while latency is good—`successEvaluation` is rarely set to “success” on stored calls.  
**Fix:** Align Vapi assistant success criteria or post-call analysis with your expected “task done” outcomes; treat latency metrics as primary until evaluation metadata is reliable.

---

## 4 · What I'd Improve with 2 More Weeks

- Stream chat responses end-to-end to cut perceived latency.
- Add cross-encoder or LLM re-ranking on Pinecone hits for ambiguous queries.
- Multi-turn retrieval: rewrite follow-up questions using conversation history before embedding search.
- Voice: scripted regression calls for interruption, booking retry, and error utterances; tune Vapi assistant prompts and tool schemas.

---

## Regenerate this file

```bash
cd evals
EVAL_JUDGE_PROVIDER=groq python run_evals.py --url https://persona-production-f24d.up.railway.app
python generate_report.py
```

`generate_report.py` reads `PERSONA_NAME`, `CHAT_URL`, `FRONTEND_URL`, and `BACKEND_URL` from the repo `.env` for the header. Set `EVAL_PHONE` if you want a literal number in the PDF.

Export to PDF from your editor or `pandoc evals/report/eval_report.md -o eval_report.pdf` if you use pandoc.
