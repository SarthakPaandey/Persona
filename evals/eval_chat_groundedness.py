"""
Evaluate chat groundedness: hallucination rate, retrieval quality,
and keyword coverage.

Usage:
    cd evals
    python eval_chat_groundedness.py --url http://localhost:8000
"""

import argparse
import json
import os
import time
from datetime import datetime
from pathlib import Path

import httpx
import yaml
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).parent.parent / ".env")


def _judge_client_and_model():
    """Judge LLM: OpenAI and/or Groq (OpenAI-compatible).

    Set ``EVAL_JUDGE_PROVIDER`` to ``groq`` to use Groq even when ``OPENAI_API_KEY``
    is set (e.g. invalid local key while ``GROQ_API_KEY`` is valid).
    """
    prov = os.getenv("EVAL_JUDGE_PROVIDER", "auto").strip().lower()
    oa = os.getenv("OPENAI_API_KEY", "").strip()
    gq = os.getenv("GROQ_API_KEY", "").strip()

    if prov == "groq":
        if not gq:
            raise SystemExit("EVAL_JUDGE_PROVIDER=groq requires GROQ_API_KEY in .env")
        base = os.getenv("GROQ_API_BASE", "https://api.groq.com/openai/v1").rstrip("/")
        model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        return OpenAI(api_key=gq, base_url=base), model, False
    if prov == "openai":
        if not oa:
            raise SystemExit("EVAL_JUDGE_PROVIDER=openai requires OPENAI_API_KEY in .env")
        return OpenAI(api_key=oa), "gpt-4o", True

    if oa:
        return OpenAI(api_key=oa), "gpt-4o", True
    if gq:
        base = os.getenv("GROQ_API_BASE", "https://api.groq.com/openai/v1").rstrip("/")
        model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        return OpenAI(api_key=gq, base_url=base), model, False
    raise SystemExit(
        "Set OPENAI_API_KEY or GROQ_API_KEY for the eval judge LLM "
        "(or EVAL_JUDGE_PROVIDER=groq with GROQ_API_KEY)."
    )


_judge_cached = None


def _get_judge_cached():
    global _judge_cached
    if _judge_cached is None:
        _judge_cached = _judge_client_and_model()
    return _judge_cached


def load_test_cases() -> list:
    path = Path(__file__).parent / "test_cases.yaml"
    with open(path, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("chat_groundedness", [])


def ask_chat(base_url: str, question: str) -> dict:
    """Send a question to the chat endpoint and return the response."""
    with httpx.Client(timeout=60) as client:
        res = client.post(
            f"{base_url}/api/chat",
            json={"message": question, "conversation_history": []},
        )
        res.raise_for_status()
        return res.json()


def judge_hallucination(question: str, answer: str) -> dict:
    """Use OpenAI or Groq to judge whether the answer contains hallucinations."""
    client, model, use_json_mode = _get_judge_cached()
    prompt = f"""You are an evaluator judging whether an AI assistant hallucinated.

The AI is acting as a job candidate's representative. It should ONLY share information
that would appear in a real resume or GitHub profile. It should NOT invent jobs, degrees,
companies, or technical claims not grounded in the context.

QUESTION: {question}

AI ANSWER: {answer}

Does the AI answer contain hallucinated facts (invented jobs, degrees, companies,
technical skills, or specific claims not likely to be verifiable)?

Respond ONLY with valid JSON:
{{
  "hallucinated": true or false,
  "confidence": 0.0 to 1.0,
  "reasoning": "one sentence explanation"
}}"""

    kwargs = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0,
    }
    if use_json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    res = client.chat.completions.create(**kwargs)
    text = res.choices[0].message.content or ""
    text = text.strip()
    if use_json_mode:
        return json.loads(text)
    # Groq: parse JSON from response (no json_schema mode)
    start, end = text.find("{"), text.rfind("}")
    if start >= 0 and end > start:
        return json.loads(text[start : end + 1])
    raise ValueError(f"Judge did not return JSON: {text[:200]}")


def check_keywords(answer: str, expected: list, must_not: list) -> dict:
    answer_lower = answer.lower()
    found = [kw for kw in expected if kw.lower() in answer_lower]
    violated = [kw for kw in must_not if kw.lower() in answer_lower]
    if expected:
        coverage = len(found) / len(expected)
    else:
        coverage = 1.0
    missing_keywords = [kw for kw in expected if kw.lower() not in answer_lower]
    return {
        "found_keywords": found,
        "missing_keywords": missing_keywords,
        "violated_must_not": violated,
        "keyword_coverage": coverage,
    }


def run_eval(base_url: str) -> dict:
    test_cases = load_test_cases()
    results = []
    total = len(test_cases)
    hallucinations = 0
    total_latency = 0

    if not os.getenv("OPENAI_API_KEY", "").strip() and not os.getenv(
        "GROQ_API_KEY", ""
    ).strip():
        raise SystemExit("Set OPENAI_API_KEY or GROQ_API_KEY for the eval judge.")

    print(f"\n🧪 Running {total} chat groundedness tests against {base_url}\n")

    for case in test_cases:
        cid = case["id"]
        question = case["question"]
        print(f"  [{cid}] {question[:60]}...", end=" ", flush=True)

        t0 = time.monotonic()
        try:
            response = ask_chat(base_url, question)
            latency_ms = (time.monotonic() - t0) * 1000
            answer = response.get("message", "")
            sources = response.get("sources", [])

            kw_result = check_keywords(
                answer,
                case.get("expected_keywords", []),
                case.get("must_not_contain", []),
            )

            judge = judge_hallucination(question, answer)

            if judge["hallucinated"]:
                hallucinations += 1

            total_latency += latency_ms

            status = (
                "✅"
                if not judge["hallucinated"] and not kw_result["violated_must_not"]
                else "❌"
            )
            print(f"{status}  ({latency_ms:.0f}ms)")

            results.append(
                {
                    "id": cid,
                    "category": case.get("category"),
                    "question": question,
                    "answer": answer[:300],
                    "latency_ms": round(latency_ms),
                    "num_sources": len(sources),
                    "keyword_coverage": round(kw_result["keyword_coverage"], 2),
                    "missing_keywords": kw_result["missing_keywords"],
                    "violated_must_not": kw_result["violated_must_not"],
                    "hallucinated": judge["hallucinated"],
                    "hallucination_confidence": judge["confidence"],
                    "hallucination_reasoning": judge["reasoning"],
                    "pass": not judge["hallucinated"]
                    and not kw_result["violated_must_not"],
                }
            )

        except Exception as e:
            print(f"❌  ERROR: {e}")
            results.append(
                {
                    "id": cid,
                    "category": case.get("category"),
                    "question": question,
                    "error": str(e),
                    "pass": False,
                }
            )

    passed = sum(1 for r in results if r.get("pass"))
    avg_latency = total_latency / max(total, 1)
    hallucination_rate = hallucinations / max(total, 1)

    coverages = [
        r.get("keyword_coverage", 0.0)
        for r in results
        if r.get("keyword_coverage") is not None and "error" not in r
    ]
    avg_keyword_coverage = (
        round(sum(coverages) / max(len(coverages), 1), 2) if coverages else 0.0
    )

    summary = {
        "timestamp": datetime.utcnow().isoformat(),
        "base_url": base_url,
        "total_cases": total,
        "passed": passed,
        "failed": total - passed,
        "pass_rate": round(passed / max(total, 1), 2),
        "hallucination_rate": round(hallucination_rate, 2),
        "avg_keyword_coverage": avg_keyword_coverage,
        "avg_latency_ms": round(avg_latency),
        "results": results,
    }

    out_path = (
        Path(__file__).parent
        / "results"
        / f"chat_groundedness_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    )
    out_path.parent.mkdir(exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print(f"\n📊 SUMMARY")
    print(f"   Pass rate:         {summary['pass_rate'] * 100:.0f}%  ({passed}/{total})")
    print(f"   Hallucination rate:{hallucination_rate * 100:.0f}%")
    print(f"   Avg keyword cov.:  {avg_keyword_coverage * 100:.0f}%")
    print(f"   Avg latency:       {avg_latency:.0f}ms")
    print(f"   Results saved:     {out_path}")

    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://localhost:8000")
    args = parser.parse_args()
    run_eval(args.url)
