"""
Evaluate voice agent quality: latency, task completion, and accuracy.
Uses Vapi's call analytics API rather than placing live calls.

Usage:
    cd evals
    python eval_voice_quality.py
"""

import json
import os
from datetime import datetime
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

VAPI_API_KEY = os.getenv("VAPI_API_KEY")
VAPI_API_BASE = "https://api.vapi.ai"


def fetch_recent_calls(limit: int = 50) -> list:
    """Fetch recent call records from Vapi."""
    if not VAPI_API_KEY:
        return []
    headers = {"Authorization": f"Bearer {VAPI_API_KEY}"}
    with httpx.Client() as client:
        # Vapi list-calls accepts limit, assistantId, etc. — not sortOrder (returns 400).
        res = client.get(
            f"{VAPI_API_BASE}/call",
            headers=headers,
            params={"limit": limit},
        )
        res.raise_for_status()
        data = res.json()
        if isinstance(data, list):
            return data
        return data.get("data", data.get("calls", []))


def analyze_calls(calls: list) -> dict:
    """Compute quality metrics from Vapi call records."""
    if not calls:
        return {"error": "No calls found"}

    latencies = []
    task_completions = []
    booking_made = []

    for call in calls:
        analysis = call.get("analysis", {})
        structured = analysis.get("structuredData", {})

        if structured.get("booking_made") is not None:
            booking_made.append(structured["booking_made"])

        messages = call.get("messages", [])
        first_bot_msg = next((m for m in messages if m.get("role") == "bot"), None)
        if first_bot_msg:
            latency = first_bot_msg.get("secondsFromStart", 0) * 1000
            latencies.append(latency)

        success = analysis.get("successEvaluation")
        if success:
            task_completions.append(str(success).lower() == "success")

    total = len(calls)
    avg_latency = sum(latencies) / max(len(latencies), 1)
    p95_latency = sorted(latencies)[int(len(latencies) * 0.95)] if latencies else 0
    task_completion_rate = sum(task_completions) / max(len(task_completions), 1)
    booking_rate = sum(booking_made) / max(len(booking_made), 1)

    return {
        "total_calls": total,
        "avg_first_response_latency_ms": round(avg_latency),
        "p95_first_response_latency_ms": round(p95_latency),
        "pct_under_2s": round(
            sum(1 for l in latencies if l < 2000) / max(len(latencies), 1), 2
        ),
        "task_completion_rate": round(task_completion_rate, 2),
        "booking_conversion_rate": round(booking_rate, 2),
    }


def run_eval() -> dict:
    print("📞 Fetching Vapi call analytics...")

    if not VAPI_API_KEY:
        metrics = {"error": "VAPI_API_KEY not set in .env"}
        print("   Skipping: no VAPI_API_KEY")
        return metrics

    try:
        calls = fetch_recent_calls(limit=50)
    except httpx.HTTPStatusError as e:
        err = f"Vapi API HTTP {e.response.status_code}: {e.response.text[:300]}"
        print(f"   Error: {err}")
        return {"error": err}
    except httpx.RequestError as e:
        err = f"Vapi request failed: {e}"
        print(f"   Error: {err}")
        return {"error": err}
    metrics = analyze_calls(calls)

    print("\n📊 VOICE QUALITY METRICS")
    print(f"   Total calls analyzed:       {metrics.get('total_calls', 0)}")
    print(
        f"   Avg first-response latency: {metrics.get('avg_first_response_latency_ms')}ms"
    )
    print(f"   P95 latency:                {metrics.get('p95_first_response_latency_ms')}ms")
    print(
        f"   % calls under 2s latency:   {metrics.get('pct_under_2s', 0)*100:.0f}%"
    )
    print(
        f"   Task completion rate:        {metrics.get('task_completion_rate', 0)*100:.0f}%"
    )
    print(
        f"   Booking conversion rate:     {metrics.get('booking_conversion_rate', 0)*100:.0f}%"
    )

    out_path = (
        Path(__file__).parent
        / "results"
        / f"voice_quality_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    )
    out_path.parent.mkdir(exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(
            {"timestamp": datetime.utcnow().isoformat(), **metrics},
            f,
            indent=2,
        )
    print(f"\n   Results saved: {out_path}")

    return metrics


if __name__ == "__main__":
    run_eval()
