#!/usr/bin/env python3
"""
Fill evals/report/eval_report.md from the latest JSON under evals/results/.

Usage:
    cd evals
    python generate_report.py

Optional env (or defaults from repo ``.env``):
    EVAL_CANDIDATE_NAME / PERSONA_NAME, EVAL_CHAT_URL / CHAT_URL / FRONTEND_URL,
    EVAL_BACKEND_URL / BACKEND_URL, EVAL_PHONE.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def _latest_matching(results_dir: Path, pattern: str) -> Path | None:
    files = sorted(results_dir.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    return files[0] if files else None


def _pct(x: float | int | None, digits: int = 0) -> str:
    if x is None:
        return "—"
    try:
        v = float(x)
        if v <= 1.0 and v >= 0:
            v *= 100
        return f"{v:.{digits}f}%".replace(".0%", "%")
    except (TypeError, ValueError):
        return "—"


def _ms(x: object) -> str:
    if x is None:
        return "—"
    try:
        return f"{int(round(float(x))):,} ms"
    except (TypeError, ValueError):
        return "—"


def load_voice(path: Path | None) -> dict:
    if not path or not path.is_file():
        return {}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_chat(path: Path | None) -> dict:
    if not path or not path.is_file():
        return {}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main() -> None:
    evals_dir = Path(__file__).resolve().parent
    results_dir = evals_dir / "results"
    results_dir.mkdir(parents=True, exist_ok=True)

    voice_path = _latest_matching(results_dir, "voice_quality_*.json")
    chat_path = _latest_matching(results_dir, "chat_groundedness_*.json")

    voice = load_voice(voice_path)
    chat = load_chat(chat_path)

    # Voice metrics
    v_err = voice.get("error")
    v_has_metrics = voice.get("avg_first_response_latency_ms") is not None
    if v_err or not v_has_metrics:
        hint = "— (run eval_voice_quality.py with VAPI_API_KEY and recent Vapi calls)"
        v_avg = v_p95 = v_p2 = v_task = v_book = hint
    else:
        v_avg = _ms(voice.get("avg_first_response_latency_ms"))
        v_p95 = _ms(voice.get("p95_first_response_latency_ms"))
        v_p2 = _pct(voice.get("pct_under_2s"), 0)
        v_task = _pct(voice.get("task_completion_rate"), 0)
        v_book = _pct(voice.get("booking_conversion_rate"), 0)

    # Chat metrics
    if not chat.get("total_cases"):
        c_pass = c_hall = c_kw = c_lat = "— (run eval_chat_groundedness.py with backend + judge key)"
    else:
        c_pass = _pct(chat.get("pass_rate"), 0)
        c_hall = _pct(chat.get("hallucination_rate"), 0)
        kw = chat.get("avg_keyword_coverage")
        if kw is None and chat.get("results"):
            covs = [
                float(r["keyword_coverage"])
                for r in chat["results"]
                if r.get("keyword_coverage") is not None and "error" not in r
            ]
            kw = sum(covs) / max(len(covs), 1) if covs else 0.0
        c_kw = _pct(kw, 0) if kw is not None else "—"
        c_lat = _ms(chat.get("avg_latency_ms"))

    chat_warning = ""
    rs = chat.get("results") or []
    if rs and all("error" in r for r in rs):
        chat_warning = (
            "\n\n**Note:** Every case failed before scoring (e.g. judge LLM `401` or network). "
            "Fix `OPENAI_API_KEY` in `.env`, or set `GROQ_API_KEY` and run with "
            "`EVAL_JUDGE_PROVIDER=groq`. Then rerun `run_evals.py` and `generate_report.py`."
        )

    candidate = (
        os.getenv("EVAL_CANDIDATE_NAME", "").strip()
        or os.getenv("PERSONA_NAME", "").strip()
        or "<your name>"
    )
    chat_url = (
        os.getenv("EVAL_CHAT_URL", "").strip()
        or os.getenv("CHAT_URL", "").strip()
        or os.getenv("FRONTEND_URL", "").strip()
        or "<deployed frontend URL>"
    )
    backend_url = (
        os.getenv("EVAL_BACKEND_URL", "").strip()
        or os.getenv("BACKEND_URL", "").strip()
        or ""
    )
    phone = os.getenv("EVAL_PHONE", "").strip() or "— (Vapi dashboard / Twilio)"
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d UTC")

    voice_note = f"`{voice_path.name}`" if voice_path else "*no `voice_quality_*.json` yet*"
    chat_note = f"`{chat_path.name}`" if chat_path else "*no `chat_groundedness_*.json` yet*"

    md = f"""# AI Persona — Eval Report

**Candidate:** {candidate}  
**Generated:** {date_str}  
**Chat URL:** {chat_url}  
**Backend URL:** {backend_url or "—"}  
**Phone:** {phone}  
**Eval Suite:** `evals/` · Voice source: {voice_note} · Chat source: {chat_note}

---

## 1 · Voice Quality Metrics

| Metric | Target | Measured |
|--------|--------|----------|
| Avg first-response latency | < 2 000 ms | **{v_avg}** |
| P95 first-response latency | < 3 000 ms | **{v_p95}** |
| Calls under 2 s latency | > 90 % | **{v_p2}** |
| Task completion rate | > 80 % | **{v_task}** |
| Booking conversion rate | — | **{v_book}** |

**Method:** `eval_voice_quality.py` pulls recent Vapi calls, uses the first bot message `secondsFromStart` as first-response latency, and `analysis.successEvaluation` for task completion. Booking rate uses structured `booking_made` when present.

---

## 2 · Chat Groundedness Metrics

| Metric | Target | Measured |
|--------|--------|----------|
| Overall pass rate | > 85 % | **{c_pass}** |
| Hallucination rate | < 10 % | **{c_hall}** |
| Keyword coverage (avg) | > 70 % | **{c_kw}** |
| Avg response latency | < 3 000 ms | **{c_lat}** |

**Method:** `eval_chat_groundedness.py` posts each case in `test_cases.yaml` to `POST /api/chat`, checks `must_not_contain` / `expected_keywords`, and uses a judge LLM (OpenAI or Groq) to flag hallucinated facts.{chat_warning}

---

## 3 · Failure Modes Found & Fixed

Replace this section with **your** observed failures and fixes after each eval run. The patterns below match mechanisms in this repo (use as a checklist, not fake results).

### Failure 1 — Weak or empty retrieval on paraphrased questions

**Symptom:** Model answers with thin context or generic text when the user’s wording does not match chunk text.  
**Fix:** Tune `similarity_threshold` / `rag_max_context_docs` in settings; rely on fallback retrieval when no chunk clears the threshold; improve ingestion chunking for resume sections.

### Failure 2 — Calendar or booking path flaky under load or empty slots

**Symptom:** Availability empty or booking step fails; chat falls back to link-only behavior.  
**Fix:** Verify Cal.com API keys and event type; ensure timezone helpers in `calendar_service` / routes return valid IANA zones; surface booking link when automation cannot complete.

### Failure 3 — Voice tool latency or provider errors

**Symptom:** Slow first response on calls, or webhook errors during tool execution.  
**Fix:** Keep RAG and calendar handlers fast (timeouts, minimal payloads back to Vapi); confirm `BACKEND_URL` in Vapi config matches deployed API; use Vapi analytics to confirm first-bot latency trends.

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
python run_evals.py --url https://your-backend.example.com   # or --skip-voice / --skip-chat-judge as needed
python generate_report.py
```

Export to PDF from your editor or `pandoc evals/report/eval_report.md -o eval_report.pdf` if you use pandoc.
"""

    out = evals_dir / "report" / "eval_report.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(md, encoding="utf-8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
