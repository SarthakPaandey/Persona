"""Regression tests for Vapi voice webhook idempotency."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.api.routes import voice as voice_route


@pytest.fixture(autouse=True)
def clear_voice_tool_state():
    voice_route._reset_tool_execution_state()
    yield
    voice_route._reset_tool_execution_state()


@pytest.fixture
def voice_client():
    mock_store = MagicMock()

    with (
        patch("app.main.VectorStoreManager") as MockVSM,
        patch("app.main.RAGEngine") as MockRAG,
    ):
        MockVSM.return_value.get_store.return_value = mock_store
        MockRAG.return_value = MagicMock()

        app = create_app()
        with TestClient(app) as client:
            yield client


def _book_meeting_payload(call_id: str, tool_call_id: str) -> dict:
    return {
        "call": {"id": call_id},
        "message": {
            "type": "tool-calls",
            "toolCallList": [
                {
                    "id": tool_call_id,
                    "name": "book_meeting",
                    "arguments": {"datetime": "2026-04-14T18:30:00+05:30"},
                }
            ],
        },
    }


def test_voice_webhook_dedupes_retried_booking_requests(voice_client):
    with patch("app.api.routes.voice.CalendarService") as MockCal:
        instance = MockCal.return_value
        instance.get_available_slots = AsyncMock(
            return_value=[
                {
                    "start": "2026-04-14T18:30:00+05:30",
                    "end": "2026-04-14T19:00:00+05:30",
                    "formatted": "Tue Apr 14 · 06:30 PM",
                }
            ]
        )
        instance.create_booking = AsyncMock(return_value={"data": {"id": "booking-1"}})

        payload = _book_meeting_payload(call_id="call-123", tool_call_id="tool-abc")
        first = voice_client.post("/api/voice/vapi/webhook", json=payload)
        second = voice_client.post("/api/voice/vapi/webhook", json=payload)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json() == second.json()
    instance.get_available_slots.assert_awaited_once()
    instance.create_booking.assert_awaited_once()


def test_voice_webhook_allows_same_slot_for_different_calls(voice_client):
    with patch("app.api.routes.voice.CalendarService") as MockCal:
        instance = MockCal.return_value
        instance.get_available_slots = AsyncMock(
            return_value=[
                {
                    "start": "2026-04-14T18:30:00+05:30",
                    "end": "2026-04-14T19:00:00+05:30",
                    "formatted": "Tue Apr 14 · 06:30 PM",
                }
            ]
        )
        instance.create_booking = AsyncMock(return_value={"data": {"id": "booking-1"}})

        first = voice_client.post(
            "/api/voice/vapi/webhook",
            json=_book_meeting_payload(call_id="call-123", tool_call_id="tool-abc"),
        )
        second = voice_client.post(
            "/api/voice/vapi/webhook",
            json=_book_meeting_payload(call_id="call-456", tool_call_id="tool-def"),
        )

    assert first.status_code == 200
    assert second.status_code == 200
    assert instance.get_available_slots.await_count == 2
    assert instance.create_booking.await_count == 2
