"""
Master eval runner — runs all three eval suites and prints a consolidated report.

Usage:
    cd evals
    python run_evals.py --url http://localhost:8000
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

# Ensure evals dir is on path when run as script
sys.path.insert(0, str(Path(__file__).parent))

from eval_booking_flow import run_booking_flow
from eval_chat_groundedness import run_eval as run_chat_eval
from eval_voice_quality import run_eval as run_voice_eval


def print_section(title: str):
    bar = "=" * 60
    print(f"\n{bar}")
    print(f"  {title}")
    print(f"{bar}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://localhost:8000", help="Backend base URL")
    parser.add_argument(
        "--skip-voice",
        action="store_true",
        help="Skip voice eval (requires Vapi API key and calls)",
    )
    parser.add_argument(
        "--skip-chat-judge",
        action="store_true",
        help="Skip chat groundedness (requires OPENAI_API_KEY or GROQ_API_KEY for judge)",
    )
    args = parser.parse_args()

    all_results = {"timestamp": datetime.utcnow().isoformat(), "backend_url": args.url}

    if not args.skip_chat_judge and (
        os.getenv("OPENAI_API_KEY", "").strip()
        or os.getenv("GROQ_API_KEY", "").strip()
    ):
        print_section("1 / 3 · Chat Groundedness Eval")
        chat_results = run_chat_eval(args.url)
        all_results["chat"] = {
            "pass_rate": chat_results["pass_rate"],
            "hallucination_rate": chat_results["hallucination_rate"],
            "avg_keyword_coverage": chat_results.get("avg_keyword_coverage", 0),
            "avg_latency_ms": chat_results["avg_latency_ms"],
        }
    else:
        print_section("1 / 3 · Chat Groundedness Eval  [SKIPPED]")
        all_results["chat"] = {"skipped": True}

    print_section("2 / 3 · Booking Flow Eval")
    booking_results = run_booking_flow(args.url)
    all_results["booking"] = {"overall": booking_results["overall"]}

    if not args.skip_voice:
        print_section("3 / 3 · Voice Quality Eval")
        try:
            voice_results = run_voice_eval()
        except Exception as e:
            voice_results = {"error": str(e)}
            print(f"   Voice eval crashed: {e}")
        all_results["voice"] = voice_results
    else:
        print_section("3 / 3 · Voice Quality Eval  [SKIPPED]")
        all_results["voice"] = {"skipped": True}

    print_section("CONSOLIDATED RESULTS")
    if not all_results["chat"].get("skipped"):
        print(
            f"\n  Chat pass rate:          {all_results['chat']['pass_rate'] * 100:.0f}%"
        )
        print(
            f"  Chat hallucination rate: {all_results['chat']['hallucination_rate'] * 100:.0f}%"
        )
        print(
            f"  Chat avg latency:        {all_results['chat']['avg_latency_ms']}ms"
        )
        print(
            f"  Chat avg keyword cov.:   {all_results['chat'].get('avg_keyword_coverage', 0) * 100:.0f}%"
        )
    print(f"  Booking flow:            {all_results['booking']['overall']}")
    if not args.skip_voice and not all_results["voice"].get("skipped"):
        print(
            f"  Voice avg latency:       {all_results['voice'].get('avg_first_response_latency_ms', 'N/A')}ms"
        )
        print(
            f"  Voice task completion:   {all_results['voice'].get('task_completion_rate', 0) * 100:.0f}%"
        )

    out_path = (
        Path(__file__).parent
        / "results"
        / f"full_eval_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    )
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2)

    print(f"\n  Full results: {out_path}\n")


if __name__ == "__main__":
    main()
