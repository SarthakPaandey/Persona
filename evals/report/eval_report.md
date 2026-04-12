# AI Persona — Eval Report

**Candidate:** <fill with candidate name>  
**Submission Date:** <fill with date>  
**Chat URL:** <fill with deployed frontend URL>  
**Phone:** <fill with Vapi/Twilio number>  
**Eval Suite:** `evals/`

---

## 1 · Voice Quality Metrics

Fill these values from the latest file in `evals/results/voice_quality_*.json`.

| Metric | Target | Measured |
|--------|--------|----------|
| Avg first-response latency | < 2 000 ms | **<fill>** |
| P95 first-response latency | < 3 000 ms | **<fill>** |
| Calls under 2 s latency | > 90 % | **<fill>** |
| Task completion rate | > 80 % | **<fill>** |
| Booking conversion rate | — | **<fill>** |

**Method:** Measured from Vapi call analytics using the first bot message latency and success evaluation fields returned by Vapi.

---

## 2 · Chat Groundedness Metrics

Fill these values from the latest file in `evals/results/chat_groundedness_*.json`.

| Metric | Target | Measured |
|--------|--------|----------|
| Overall pass rate | > 85 % | **<fill>** |
| Hallucination rate | < 10 % | **<fill>** |
| Keyword coverage | > 70 % | **<fill>** |
| Avg response latency | < 3 000 ms | **<fill>** |

**Method:** `eval_chat_groundedness.py` sends test prompts across background, GitHub, resume, calendar, and edge-case categories, then scores hallucination and keyword coverage.

---

## 3 · Failure Modes Found & Fixed

List only issues you actually observed in your runs.

### Failure 1 — <title>

**Symptom:** <what broke>  
**Fix:** <what changed>

### Failure 2 — <title>

**Symptom:** <what broke>  
**Fix:** <what changed>

### Failure 3 — <title>

**Symptom:** <what broke>  
**Fix:** <what changed>

---

## 4 · What I'd Improve with 2 More Weeks

- Stream chat responses to reduce perceived latency.
- Add retrieval re-ranking for ambiguous project and resume questions.
- Improve multi-turn retrieval for follow-up questions.
- Add deeper voice QA around interruption handling and booking retries.
