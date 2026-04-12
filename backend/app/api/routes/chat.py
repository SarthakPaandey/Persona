"""Chat endpoint for the web interface."""

from datetime import datetime
import re
from typing import Optional
from zoneinfo import ZoneInfo

import structlog
from fastapi import APIRouter, HTTPException, Request

from app.core.rag_engine import RAGEngine
from app.models.schemas import ChatRequest, ChatResponse, SourceDocument
from app.services.calendar_service import CalendarService

logger = structlog.get_logger()
router = APIRouter()

DEFAULT_BOOKING_TIMEZONE = "Asia/Kolkata"
EMAIL_PATTERN = re.compile(r"\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[A-Za-z]{2,}\b")


@router.post("/chat", response_model=ChatResponse)
async def chat(request: Request, chat_request: ChatRequest):
    """
    Process a chat message through the RAG pipeline.

    Handles:
    - General questions about background, skills, experience
    - GitHub repo questions
    - Resume questions
    - Calendar/booking requests
    - Edge cases with honest "I don't know" responses
    """
    rag_engine: RAGEngine = request.app.state.rag_engine
    settings = request.app.state.settings

    try:
        conversation_history = chat_request.conversation_history or []
        is_booking_intent = _detect_booking_intent(chat_request.message)
        is_booking_flow = is_booking_intent or _is_booking_context(conversation_history)
        rejected_slots = _is_slot_rejection(chat_request.message)
        available_slots = []
        timezone = None
        booking_link = None
        booking_context = ""

        if is_booking_flow:
            calendar_service = CalendarService(settings)
            timezone = _resolve_timezone(
                chat_request.timezone,
                getattr(settings, "calcom_timezone", DEFAULT_BOOKING_TIMEZONE),
            )
            booking_link = f"https://cal.com/{settings.calcom_username}"

            if _assistant_requested_email(conversation_history) and not _extract_first_email(
                chat_request.message
            ):
                return ChatResponse(
                    message=_build_invalid_email_message(
                        timezone=timezone,
                        booking_link=booking_link,
                    ),
                    sources=[],
                    conversation_id=chat_request.conversation_id,
                    booking_link=booking_link,
                    available_slots=[],
                    timezone=timezone,
                )

            if rejected_slots:
                availability = (
                    "The user said the currently shown slots do not work for them. "
                    "Do not repeat those slots as available. Ask for their preferred time window "
                    "(for example evening IST) and then guide them to the booking link."
                )
            else:
                try:
                    available_slots = await calendar_service.get_available_slots(
                        timezone=timezone
                    )
                    availability = _summarize_available_slots(
                        available_slots,
                        timezone=timezone,
                    )
                except Exception as exc:
                    logger.warning("Calendar context unavailable", error=str(exc))
                    availability = (
                        "Calendar availability could not be loaded right now. "
                        "Offer the direct booking link as a fallback."
                    )

            booking_context = f"""
The user wants to book a meeting. Here are bookable windows currently returned by Cal.com:
{availability}

Booking link: {booking_link}
User timezone for showing slots and booking: {timezone}

Important wording rule: describe these as "bookable slots configured in Cal.com".
Do NOT insist the candidate is absolutely free unless explicitly confirmed elsewhere.
Do NOT enumerate all slots in prose. Mention at most 3 example options and ask the user to use the booking widget for the full list.
If the user says a shown slot is not actually possible, apologize and suggest updating Cal.com availability or using the direct booking link.

Guide them to pick a time. If slots are available, invite them to choose one in chat.
Before confirming any booking, ask for the user's full name and email address explicitly.
If the chat widget is visible, ask them to fill the name and email fields and click "Confirm Interview Slot".
If calendar data is unavailable, share the direct booking link.
"""
            response = await rag_engine.query(
                query=chat_request.message,
                conversation_history=conversation_history,
                additional_context=booking_context,
            )
        else:
            response = await rag_engine.query(
                query=chat_request.message,
                conversation_history=conversation_history,
            )

        message = _sanitize_github_project_answer(
            query=chat_request.message,
            answer=response.answer,
            source_documents=response.source_documents,
        )

        if is_booking_flow and (rejected_slots or _is_verbose_slot_dump(message)):
            message = _build_compact_booking_message(
                available_slots=available_slots,
                timezone=timezone or DEFAULT_BOOKING_TIMEZONE,
                booking_link=booking_link or f"https://cal.com/{settings.calcom_username}",
                rejected_slots=rejected_slots,
            )

        return ChatResponse(
            message=message,
            sources=[
                SourceDocument(
                    content=doc.page_content[:200],
                    source=doc.metadata.get("source", "unknown"),
                    relevance_score=doc.metadata.get("score", 0.0),
                )
                for doc in response.source_documents
            ],
            conversation_id=chat_request.conversation_id,
            booking_link=booking_link,
            available_slots=available_slots,
            timezone=timezone,
        )

    except Exception as e:
        logger.exception("Chat endpoint error")
        detail = "Failed to process message"
        if settings.environment == "development":
            detail = f"{type(e).__name__}: {e}"[:1000]
        raise HTTPException(status_code=500, detail=detail) from e


def _detect_booking_intent(message: str) -> bool:
    """Detect if the user wants to book a meeting/call."""
    booking_keywords = [
        "book",
        "schedule",
        "meeting",
        "call",
        "interview",
        "availability",
        "available",
        "calendar",
        "slot",
        "time",
        "free",
        "meet",
        "set up",
        "arrange",
    ]
    message_lower = message.lower()
    return any(keyword in message_lower for keyword in booking_keywords)


def _is_slot_rejection(message: str) -> bool:
    """Detect when user says shown slots do not work for them."""
    m = message.lower()
    rejection_markers = [
        "not free",
        "not available",
        "doesn't work",
        "does not work",
        "working hours",
        "outside working hours",
        "after work",
        "can't do",
        "cannot do",
        "not possible",
    ]
    return any(marker in m for marker in rejection_markers)


def _is_booking_context(conversation_history: list) -> bool:
    """Detect whether recent conversation indicates an ongoing booking flow."""
    if not conversation_history:
        return False

    markers = [
        "book",
        "booking",
        "interview",
        "calendar",
        "slot",
        "cal.com",
        "confirm interview slot",
        "name and email",
    ]

    for item in conversation_history[-6:]:
        content = str(getattr(item, "content", "")).lower()
        if any(marker in content for marker in markers):
            return True
    return False


def _assistant_requested_email(conversation_history: list) -> bool:
    """Check if the most recent assistant message asks the user for email."""
    if not conversation_history:
        return False

    markers = [
        "email",
        "email address",
        "full name and email",
        "name and email",
    ]

    for item in reversed(conversation_history):
        role = str(getattr(item, "role", "")).lower()
        if role != "assistant":
            continue
        content = str(getattr(item, "content", "")).lower()
        return any(marker in content for marker in markers)

    return False


def _extract_first_email(message: str) -> Optional[str]:
    """Extract first valid-looking email from message."""
    match = EMAIL_PATTERN.search(message or "")
    if not match:
        return None
    return match.group(0)


def _build_invalid_email_message(timezone: str, booking_link: str) -> str:
    """Deterministic correction prompt when user provides invalid email."""
    return (
        "That does not look like a valid email address yet. "
        "Please share a valid email in the format name@example.com so I can proceed with booking. "
        "You can also send both details together like: Your Name, name@example.com. "
        f"Timezone: {timezone}. Direct booking link: {booking_link}"
    )


def _is_github_project_query(message: str) -> bool:
    """Detect GitHub/project-oriented questions."""
    q = message.lower()
    return any(
        token in q
        for token in (
            "github",
            "repo",
            "repository",
            "project",
            "portfolio",
            "open source",
        )
    )


def _has_github_sources(source_documents: list) -> bool:
    for doc in source_documents:
        source = str(getattr(doc, "metadata", {}).get("source", ""))
        if source.startswith("github:"):
            return True
    return False


def _sanitize_github_project_answer(query: str, answer: str, source_documents: list) -> str:
    """Remove contradictory no-knowledge disclaimers when GitHub sources are present."""
    if not _is_github_project_query(query):
        return answer
    if not _has_github_sources(source_documents):
        return answer

    patterns = [
        r"I don['’]t have specific information[^.]*\.\s*",
        r"I don't have specific information about that in my knowledge base\.\s*",
        r"You could ask .*? directly in an interview\.\s*",
    ]

    cleaned = answer
    for pattern in patterns:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)

    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    return cleaned or answer


def _resolve_timezone(timezone: Optional[str], fallback: str) -> str:
    """Validate requested timezone, else fallback."""
    candidate = (timezone or "").strip() or (fallback or DEFAULT_BOOKING_TIMEZONE)
    try:
        ZoneInfo(candidate)
        return candidate
    except Exception:
        return fallback or DEFAULT_BOOKING_TIMEZONE


def _parse_local_datetime(iso_value: str, timezone: str) -> Optional[datetime]:
    """Parse an ISO datetime and convert it to requested timezone."""
    if not iso_value:
        return None
    try:
        dt = datetime.fromisoformat(iso_value.replace("Z", "+00:00"))
        return dt.astimezone(ZoneInfo(timezone))
    except Exception:
        return None


def _slot_example_labels(slots: list, timezone: str, limit: int = 3) -> list[str]:
    labels: list[str] = []
    for slot in slots:
        formatted = str(slot.get("formatted", "")).strip()
        if formatted:
            labels.append(formatted)
            if len(labels) >= limit:
                return labels

    for slot in slots:
        local_start = _parse_local_datetime(str(slot.get("start", "")), timezone)
        if not local_start:
            continue
        labels.append(local_start.strftime("%a %b %d · %I:%M %p"))
        if len(labels) >= limit:
            break
    return labels


def _summarize_available_slots(slots: list, timezone: str) -> str:
    """Build compact slot summary for LLM context without dumping every slot."""
    if not slots:
        return (
            "No future bookable slots found in the next 7 days. "
            "Offer the direct booking link and ask for a preferred time window."
        )

    day_counts: dict[str, int] = {}
    for slot in slots:
        local_start = _parse_local_datetime(str(slot.get("start", "")), timezone)
        if not local_start:
            continue
        day_key = local_start.strftime("%A, %b %d")
        day_counts[day_key] = day_counts.get(day_key, 0) + 1

    lines = [f"Found {len(slots)} future bookable slots in the next 7 days."]
    if day_counts:
        lines.append("Daily slot counts:")
        items = list(day_counts.items())
        for day_label, count in items[:4]:
            lines.append(f"- {day_label}: {count} slot(s)")
        if len(items) > 4:
            lines.append(f"- +{len(items) - 4} more day(s)")

    examples = _slot_example_labels(slots, timezone=timezone, limit=3)
    if examples:
        lines.append(f"Example options (max 3): {' | '.join(examples)}")

    lines.append(
        "Never enumerate all slots. Mention at most 3 examples and point to the booking widget for the full list."
    )
    return "\n".join(lines)


def _is_verbose_slot_dump(message: str) -> bool:
    """Heuristic for overly long booking replies that enumerate many slot times."""
    lowered = message.lower()
    time_mentions = len(re.findall(r"\b\d{1,2}:\d{2}\s?(?:am|pm)\b", lowered))
    slot_markers = (
        "bookable slots" in lowered
        or "slots configured" in lowered
        or "available slots" in lowered
    )
    return time_mentions >= 8 or (slot_markers and len(message) >= 900)


def _build_compact_booking_message(
    available_slots: list,
    timezone: str,
    booking_link: str,
    rejected_slots: bool,
) -> str:
    """Return deterministic concise booking copy for chat."""
    if rejected_slots:
        return (
            "Understood. I will not repeat those slots. "
            f"Please share your preferred date/time window in {timezone}, and include your full name and email address. "
            f"You can also book directly here: {booking_link}"
        )

    if not available_slots:
        return (
            "I can help schedule the interview, but I could not fetch live slots right now. "
            "Please share your preferred date/time window along with your full name and email address, "
            f"or book directly here: {booking_link}"
        )

    examples = _slot_example_labels(available_slots, timezone=timezone, limit=3)
    examples_text = " | ".join(examples) if examples else "Use the selector below for options."

    return (
        "I can help you book an interview with Sarthak. "
        f"I found {len(available_slots)} future bookable slots in the next 7 days ({timezone}). "
        f"A few options: {examples_text}. "
        "Use the Book an Interview widget below to view all slots and pick one. "
        "To confirm, please provide your full name and email address. "
        f"Direct booking link: {booking_link}"
    )
