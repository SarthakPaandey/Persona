"""
End-to-end booking flow test.
Simulates the complete sequence: get availability → pick a slot → book it → verify.

Usage:
    cd evals
    python eval_booking_flow.py --url http://localhost:8000
"""

import argparse
import json
from datetime import datetime
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

TEST_ATTENDEE = {
    "name": "Eval Test User",
    "email": "eval-test@example.com",
    "notes": "Automated eval test — please ignore or cancel.",
}


def run_booking_flow(base_url: str) -> dict:
    steps = []

    print("\n🗓️  Running end-to-end booking flow test\n")

    with httpx.Client(timeout=30, base_url=base_url) as client:

        print("  Step 1: Health check...")
        try:
            res = client.get("/health")
            res.raise_for_status()
            steps.append({"step": "health_check", "status": "PASS", "data": res.json()})
            print("    ✅ Backend is healthy")
        except Exception as e:
            steps.append({"step": "health_check", "status": "FAIL", "error": str(e)})
            print(f"    ❌ Health check failed: {e}")
            return {"steps": steps, "overall": "FAIL"}

        print("  Step 2: Fetching calendar availability...")
        try:
            res = client.get("/api/calendar/availability")
            res.raise_for_status()
            availability = res.json()
            slots = availability.get("slots", [])
            booking_link = availability.get("booking_link", "")

            if not slots:
                steps.append(
                    {
                        "step": "get_availability",
                        "status": "WARN",
                        "warning": "No slots available in next 7 days",
                        "booking_link": booking_link,
                    }
                )
                print(f"    ⚠️  No slots found (booking link: {booking_link})")
                return {"steps": steps, "overall": "WARN — no slots"}
            steps.append(
                {
                    "step": "get_availability",
                    "status": "PASS",
                    "slots_found": len(slots),
                    "booking_link": booking_link,
                    "first_slot": slots[0],
                }
            )
            print(
                f"    ✅ {len(slots)} slots found — first: {slots[0].get('formatted', slots[0]['start'])}"
            )
        except Exception as e:
            steps.append({"step": "get_availability", "status": "FAIL", "error": str(e)})
            print(f"    ❌ Failed: {e}")
            return {"steps": steps, "overall": "FAIL"}

        first_slot = slots[0]
        start = first_slot["start"]
        if isinstance(start, dict):
            start = start.get("start", "")
        print(f"  Step 3: Booking slot at {start}...")
        try:
            payload = {
                **TEST_ATTENDEE,
                "start_time": start,
            }
            res = client.post("/api/calendar/book", json=payload)
            res.raise_for_status()
            booking = res.json()
            steps.append(
                {
                    "step": "book_meeting",
                    "status": "PASS",
                    "booking_id": booking.get("booking_id"),
                    "message": booking.get("message"),
                }
            )
            print(f"    ✅ Booking confirmed — ID: {booking.get('booking_id')}")
        except Exception as e:
            steps.append({"step": "book_meeting", "status": "FAIL", "error": str(e)})
            print(f"    ❌ Booking failed: {e}")
            return {"steps": steps, "overall": "FAIL"}

        print("  Step 4: Verifying via chat endpoint...")
        try:
            res = client.post(
                "/api/chat",
                json={
                    "message": "Can I book a meeting?",
                    "conversation_history": [],
                },
            )
            res.raise_for_status()
            chat = res.json()
            has_booking_link = bool(chat.get("booking_link"))
            steps.append(
                {
                    "step": "chat_booking_intent",
                    "status": "PASS" if has_booking_link else "WARN",
                    "booking_link_in_response": has_booking_link,
                    "answer_preview": chat.get("message", "")[:200],
                }
            )
            icon = "✅" if has_booking_link else "⚠️"
            print(f"    {icon} Chat returns booking link: {has_booking_link}")
        except Exception as e:
            steps.append({"step": "chat_booking_intent", "status": "FAIL", "error": str(e)})
            print(f"    ❌ Chat test failed: {e}")

    failures = [s for s in steps if s["status"] == "FAIL"]
    overall = "PASS" if not failures else "FAIL"

    result = {
        "timestamp": datetime.utcnow().isoformat(),
        "base_url": base_url,
        "overall": overall,
        "steps": steps,
    }

    out_path = (
        Path(__file__).parent
        / "results"
        / f"booking_flow_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    )
    out_path.parent.mkdir(exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    icon = "✅" if overall == "PASS" else "❌"
    print(f"\n{icon} Overall: {overall}")
    print(f"   Results saved: {out_path}")

    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://localhost:8000")
    args = parser.parse_args()
    run_booking_flow(args.url)
