#!/usr/bin/env python3
"""
Creates or updates the Vapi assistant using the Vapi REST API.
Run once to register the assistant and phone number.

Usage:
    cd voice
    python setup_vapi.py
"""

import json
import os
import sys
import httpx
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

VAPI_API_BASE = "https://api.vapi.ai"
VAPI_API_KEY = os.getenv("VAPI_API_KEY")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
CHAT_URL = os.getenv("CHAT_URL", os.getenv("FRONTEND_URL", "http://localhost:3000"))
PHONE_NUMBER_ID = os.getenv("VAPI_PHONE_NUMBER_ID")
EXISTING_ASSISTANT_ID = os.getenv("VAPI_ASSISTANT_ID", "")
PERSONA_NAME = os.getenv("PERSONA_NAME", "AI Candidate")
PERSONA_ROLE = os.getenv("PERSONA_ROLE", "AI Engineer")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "")


def load_config() -> dict:
    config_path = Path(__file__).parent / "vapi_config.json"
    with open(config_path) as f:
        config = json.load(f)

    replacements = {
        "YOUR_BACKEND_URL": BACKEND_URL,
        "{{PERSONA_NAME}}": PERSONA_NAME,
        "{{PERSONA_ROLE}}": PERSONA_ROLE,
        "{{CHAT_URL}}": CHAT_URL,
        "{{ELEVENLABS_VOICE_ID}}": ELEVENLABS_VOICE_ID,
    }

    config_text = json.dumps(config)
    for old, new in replacements.items():
        config_text = config_text.replace(old, new)
    config = json.loads(config_text)

    for fn in config.get("functions", []):
        fn["serverUrl"] = fn["serverUrl"].replace(
            "YOUR_BACKEND_URL", BACKEND_URL
        )

    return config


def create_or_update_assistant(config: dict) -> str:
    headers = {
        "Authorization": f"Bearer {VAPI_API_KEY}",
        "Content-Type": "application/json",
    }

    with httpx.Client() as client:
        if EXISTING_ASSISTANT_ID:
            print(f"Updating existing assistant: {EXISTING_ASSISTANT_ID}")
            res = client.patch(
                f"{VAPI_API_BASE}/assistant/{EXISTING_ASSISTANT_ID}",
                headers=headers,
                json=config,
                timeout=20,
            )
        else:
            print("Creating new assistant...")
            res = client.post(
                f"{VAPI_API_BASE}/assistant",
                headers=headers,
                json=config,
                timeout=20,
            )

        res.raise_for_status()
        assistant = res.json()
        assistant_id = assistant["id"]
        print(f"Assistant ID: {assistant_id}")
        return assistant_id


def assign_phone_number(assistant_id: str):
    if not PHONE_NUMBER_ID:
        print("No VAPI_PHONE_NUMBER_ID set - skipping phone assignment.")
        return

    headers = {
        "Authorization": f"Bearer {VAPI_API_KEY}",
        "Content-Type": "application/json",
    }

    with httpx.Client() as client:
        res = client.patch(
            f"{VAPI_API_BASE}/phone-number/{PHONE_NUMBER_ID}",
            headers=headers,
            json={"assistantId": assistant_id},
            timeout=20,
        )
        res.raise_for_status()
        data = res.json()
        print(f"Phone number assigned: {data.get('number', 'unknown')}")


def list_phone_numbers():
    """Helper to see which phone numbers are available."""
    headers = {"Authorization": f"Bearer {VAPI_API_KEY}"}
    with httpx.Client() as client:
        res = client.get(f"{VAPI_API_BASE}/phone-number", headers=headers)
        res.raise_for_status()
        numbers = res.json()
        print("\nAvailable phone numbers:")
        for n in numbers:
            print(f"  ID: {n['id']}  Number: {n.get('number', 'N/A')}  "
                  f"Assistant: {n.get('assistantId', 'unassigned')}")


if __name__ == "__main__":
    if not VAPI_API_KEY:
        print("ERROR: VAPI_API_KEY not set in .env")
        sys.exit(1)

    config = load_config()
    assistant_id = create_or_update_assistant(config)
    assign_phone_number(assistant_id)
    list_phone_numbers()

    print("\n✅ Vapi setup complete!")
    print(f"   Add to your .env:  VAPI_ASSISTANT_ID={assistant_id}")