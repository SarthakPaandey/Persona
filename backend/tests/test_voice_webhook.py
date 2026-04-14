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


def _get_availability_payload(call_id: str, tool_call_id: str, request_text: str) -> dict:
    return {
        "call": {"id": call_id},
        "message": {
            "type": "tool-calls",
            "toolCallList": [
                {
                    "id": tool_call_id,
                    "name": "get_availability",
                    "arguments": {"request": request_text},
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


def test_voice_availability_filters_slots_from_request(voice_client):
    with patch("app.api.routes.voice.CalendarService") as MockCal:
        instance = MockCal.return_value
        instance.default_timezone = "Asia/Kolkata"
        instance.get_available_slots = AsyncMock(
            return_value=[
                {
                    "start": "2026-04-15T16:30:00+05:30",
                    "end": "2026-04-15T17:00:00+05:30",
                    "formatted": "Wed Apr 15 · 04:30 PM",
                },
                {
                    "start": "2026-04-15T17:00:00+05:30",
                    "end": "2026-04-15T17:30:00+05:30",
                    "formatted": "Wed Apr 15 · 05:00 PM",
                },
                {
                    "start": "2026-04-15T17:30:00+05:30",
                    "end": "2026-04-15T18:00:00+05:30",
                    "formatted": "Wed Apr 15 · 05:30 PM",
                },
                {
                    "start": "2026-04-16T17:00:00+05:30",
                    "end": "2026-04-16T17:30:00+05:30",
                    "formatted": "Thu Apr 16 · 05:00 PM",
                },
            ]
        )

        res = voice_client.post(
            "/api/voice/vapi/webhook",
            json=_get_availability_payload(
                call_id="call-filter",
                tool_call_id="tool-filter",
                request_text="after 5 PM on April fifteenth",
            ),
        )

    assert res.status_code == 200
    result = res.json()["results"][0]["result"]
    assert "April 15, 2026" in result
    assert "05:00 PM - 05:30 PM" in result
    assert "05:30 PM - 06:00 PM" in result
    assert "April 16, 2026" not in result


def test_voice_booking_uses_recent_filtered_slots_for_time_only_confirmation(voice_client):
    with patch("app.api.routes.voice.CalendarService") as MockCal:
        instance = MockCal.return_value
        instance.default_timezone = "Asia/Kolkata"
        instance.get_available_slots = AsyncMock(
            return_value=[
                {
                    "start": "2026-04-15T17:00:00+05:30",
                    "end": "2026-04-15T17:30:00+05:30",
                    "formatted": "Wed Apr 15 · 05:00 PM",
                },
                {
                    "start": "2026-04-15T17:30:00+05:30",
                    "end": "2026-04-15T18:00:00+05:30",
                    "formatted": "Wed Apr 15 · 05:30 PM",
                },
                {
                    "start": "2026-04-16T17:00:00+05:30",
                    "end": "2026-04-16T17:30:00+05:30",
                    "formatted": "Thu Apr 16 · 05:00 PM",
                },
            ]
        )
        instance.create_booking = AsyncMock(return_value={"data": {"id": "booking-2"}})

        availability = voice_client.post(
            "/api/voice/vapi/webhook",
            json=_get_availability_payload(
                call_id="call-context",
                tool_call_id="tool-avail",
                request_text="after 5 PM on April fifteenth",
            ),
        )
        assert availability.status_code == 200

        booking = voice_client.post(
            "/api/voice/vapi/webhook",
            json={
                "call": {"id": "call-context"},
                "message": {
                    "type": "tool-calls",
                    "toolCallList": [
                        {
                            "id": "tool-book",
                            "name": "book_meeting",
                            "arguments": {
                                "datetime": "2026-04-16T17:00:00+05:30",
                                "selection": "Book it from 5 30 PM to 6 PM.",
                            },
                        }
                    ],
                },
            },
        )

    assert booking.status_code == 200
    result = booking.json()["results"][0]["result"]
    assert "Wed Apr 15" in result
    create_call = instance.create_booking.await_args
    assert create_call.kwargs["start_time"] == "2026-04-15T17:30:00+05:30"


def test_voice_booking_rejects_broad_confirmation_when_multiple_slots_exist(voice_client):
    with patch("app.api.routes.voice.CalendarService") as MockCal:
        instance = MockCal.return_value
        instance.default_timezone = "Asia/Kolkata"
        instance.get_available_slots = AsyncMock(
            return_value=[
                {
                    "start": "2026-04-14T17:00:00+05:30",
                    "end": "2026-04-14T17:30:00+05:30",
                    "formatted": "Tue Apr 14 · 05:00 PM",
                },
                {
                    "start": "2026-04-14T18:00:00+05:30",
                    "end": "2026-04-14T18:30:00+05:30",
                    "formatted": "Tue Apr 14 · 06:00 PM",
                },
                {
                    "start": "2026-04-14T18:30:00+05:30",
                    "end": "2026-04-14T19:00:00+05:30",
                    "formatted": "Tue Apr 14 · 06:30 PM",
                },
            ]
        )
        instance.create_booking = AsyncMock(return_value={"data": {"id": "booking-3"}})

        availability = voice_client.post(
            "/api/voice/vapi/webhook",
            json=_get_availability_payload(
                call_id="call-ambiguous",
                tool_call_id="tool-ambiguous-avail",
                request_text="today after 5 PM",
            ),
        )
        assert availability.status_code == 200

        booking = voice_client.post(
            "/api/voice/vapi/webhook",
            json={
                "call": {"id": "call-ambiguous"},
                "message": {
                    "type": "tool-calls",
                    "toolCallList": [
                        {
                            "id": "tool-ambiguous-book",
                            "name": "book_meeting",
                            "arguments": {
                                "datetime": "2026-04-14T18:00:00+05:30",
                                "selection": "Yeah, that's fine for me.",
                            },
                        }
                    ],
                },
            },
        )

    assert booking.status_code == 200
    result = booking.json()["results"][0]["result"]
    assert "I still need one exact slot before I book it." in result
    instance.create_booking.assert_not_awaited()


def test_voice_booking_accepts_ordinal_slot_reference(voice_client):
    with patch("app.api.routes.voice.CalendarService") as MockCal:
        instance = MockCal.return_value
        instance.default_timezone = "Asia/Kolkata"
        instance.get_available_slots = AsyncMock(
            return_value=[
                {
                    "start": "2026-04-14T17:00:00+05:30",
                    "end": "2026-04-14T17:30:00+05:30",
                    "formatted": "Tue Apr 14 · 05:00 PM",
                },
                {
                    "start": "2026-04-14T18:00:00+05:30",
                    "end": "2026-04-14T18:30:00+05:30",
                    "formatted": "Tue Apr 14 · 06:00 PM",
                },
            ]
        )
        instance.create_booking = AsyncMock(return_value={"data": {"id": "booking-4"}})

        availability = voice_client.post(
            "/api/voice/vapi/webhook",
            json=_get_availability_payload(
                call_id="call-ordinal",
                tool_call_id="tool-ordinal-avail",
                request_text="today after 5 PM",
            ),
        )
        assert availability.status_code == 200

        booking = voice_client.post(
            "/api/voice/vapi/webhook",
            json={
                "call": {"id": "call-ordinal"},
                "message": {
                    "type": "tool-calls",
                    "toolCallList": [
                        {
                            "id": "tool-ordinal-book",
                            "name": "book_meeting",
                            "arguments": {
                                "selection": "Book the second one.",
                            },
                        }
                    ],
                },
            },
        )

    assert booking.status_code == 200
    result = booking.json()["results"][0]["result"]
    assert "Tue Apr 14 · 06:00 PM" in result
    create_call = instance.create_booking.await_args
    assert create_call.kwargs["start_time"] == "2026-04-14T18:00:00+05:30"


def test_voice_assistant_request_includes_tool_functions(voice_client):
    response = voice_client.post(
        "/api/voice/vapi/webhook",
        json={"message": {"type": "assistant-request"}},
    )

    assert response.status_code == 200
    payload = response.json()
    assistant = payload.get("assistant", {})
    model = assistant.get("model", {})
    functions = assistant.get("functions", [])

    assert model.get("provider") == "groq"
    assert model.get("model") == "llama-3.1-8b-instant"
    assert "The ONLY tools you may use are get_availability and book_meeting." in model.get("systemPrompt", "")
    assert "TOOL RESULTS ARE YOUR ANSWER" in model.get("systemPrompt", "")
    assert "get_availability" in model.get("systemPrompt", "")
    assert assistant.get("firstMessage", "").startswith("I am RORI")

    fn_names = {item.get("name") for item in functions}
    assert fn_names == {"get_availability", "book_meeting"}
    assert all(item.get("serverUrl", "").endswith("/api/voice/vapi/webhook") for item in functions)


def test_voice_background_info_uses_fast_llm_path(voice_client):
    with patch(
        "app.api.routes.voice._fast_voice_answer",
        new=AsyncMock(return_value="Fast response"),
    ) as mock_fast:
        response = voice_client.post(
            "/api/voice/vapi/webhook",
            json={
                "call": {"id": "call-live"},
                "message": {
                    "type": "tool-calls",
                    "toolCallList": [
                        {
                            "id": "tool-live",
                            "name": "get_background_info",
                            "arguments": {"question": "Show latest github projects"},
                        }
                    ],
                },
            },
        )

    assert response.status_code == 200
    result = response.json()["results"][0]["result"]
    assert result == "Fast response"
    mock_fast.assert_awaited_once()
