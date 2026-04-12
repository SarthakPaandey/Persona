"""Vapi webhook handlers for the voice agent."""

import structlog
from typing import Any, Dict

from fastapi import APIRouter, Request

from app.core.rag_engine import RAGEngine
from app.services.calendar_service import CalendarService

logger = structlog.get_logger()
router = APIRouter()


@router.post("/vapi/webhook")
async def vapi_webhook(request: Request):
    """
    Handle Vapi webhook events.

    Vapi sends various event types:
    - function-call: When the assistant calls a defined function
    - end-of-call-report: Call summary
    - status-update: Call status changes
    - assistant-request: Dynamic assistant configuration
    """
    body = await request.json()
    message_type = body.get("message", {}).get("type", "")

    logger.info("Vapi webhook received", type=message_type)

    if message_type == "function-call":
        return await _handle_function_call(request, body)
    if message_type == "assistant-request":
        return await _handle_assistant_request(request, body)
    if message_type == "end-of-call-report":
        return _handle_call_report(body)
    if message_type == "status-update":
        return _handle_status_update(body)

    logger.warning("Unknown webhook type", type=message_type)
    return {"status": "ok"}


async def _handle_function_call(request: Request, body: Dict[str, Any]):
    """Handle function calls from Vapi assistant."""
    function_call = body["message"]["functionCall"]
    function_name = function_call["name"]
    parameters = function_call.get("parameters", {})

    logger.info("Function call", name=function_name, params=parameters)

    if function_name == "get_background_info":
        return await _get_background_info(request, parameters)
    if function_name == "get_availability":
        return await _get_availability(request)
    if function_name == "book_meeting":
        return await _book_meeting(request, parameters)
    if function_name == "get_github_info":
        return await _get_github_info(request, parameters)

    return {"result": "I don't have that capability yet."}


async def _get_background_info(request: Request, parameters: Dict[str, Any]):
    """Retrieve background info via RAG."""
    rag_engine: RAGEngine = request.app.state.rag_engine
    query = parameters.get("question", "Tell me about yourself")

    response = await rag_engine.query(query=query, conversation_history=[])

    return {"result": response.answer}


async def _get_availability(request: Request):
    """Get real calendar availability."""
    settings = request.app.state.settings
    calendar_service = CalendarService(settings)

    try:
        availability = await calendar_service.get_availability()
        return {"result": availability}
    except Exception as e:
        logger.error("Failed to get availability", error=str(e))
        return {
            "result": "I'm having trouble accessing my calendar right now. "
            f"You can book directly at https://cal.com/{settings.calcom_username}"
        }


async def _book_meeting(request: Request, parameters: Dict[str, Any]):
    """Book a meeting on the calendar."""
    settings = request.app.state.settings
    calendar_service = CalendarService(settings)

    try:
        name = parameters.get("name", "")
        email = parameters.get("email", "")
        datetime_str = parameters.get("datetime", "")

        if not all([name, email, datetime_str]):
            return {
                "result": "I need your name, email, and preferred time to book. "
                "Could you provide those?"
            }

        await calendar_service.create_booking(
            name=name, email=email, start_time=datetime_str
        )

        return {
            "result": f"Great! I've booked a meeting for {name} at {datetime_str}. "
            f"A confirmation has been sent to {email}."
        }
    except Exception as e:
        logger.error("Failed to book meeting", error=str(e))
        return {
            "result": "I had trouble booking that slot. "
            f"Please try booking directly at https://cal.com/{settings.calcom_username}"
        }


async def _get_github_info(request: Request, parameters: Dict[str, Any]):
    """Get info about GitHub repos via RAG."""
    rag_engine: RAGEngine = request.app.state.rag_engine
    repo_name = parameters.get("repo_name", "")
    question = parameters.get("question", f"Tell me about the {repo_name} project")

    response = await rag_engine.query(
        query=f"GitHub repository {repo_name}: {question}",
        conversation_history=[],
    )

    return {"result": response.answer}


async def _handle_assistant_request(request: Request, body: Dict[str, Any]):
    """Provide dynamic assistant configuration."""
    settings = request.app.state.settings

    return {
        "assistant": {
            "firstMessage": (
                f"Hi! I'm {settings.persona_name}'s AI representative. "
                "I can tell you about their background, skills, and experience, "
                "and I can even book an interview for you. What would you like to know?"
            ),
            "model": {
                "provider": "openai",
                "model": "gpt-4o",
                "systemPrompt": _get_voice_system_prompt(settings),
            },
            "voice": {
                "provider": "11labs",
                "voiceId": settings.elevenlabs_voice_id,
            },
        }
    }


def _handle_call_report(body: Dict[str, Any]):
    """Log end-of-call report."""
    report = body.get("message", {})
    logger.info(
        "Call ended",
        duration=report.get("duration"),
        summary=report.get("summary"),
        cost=report.get("cost"),
    )
    return {"status": "ok"}


def _handle_status_update(body: Dict[str, Any]):
    """Log status updates."""
    status = body.get("message", {}).get("status", "")
    logger.info("Call status update", status=status)
    return {"status": "ok"}


def _get_voice_system_prompt(settings) -> str:
    """Generate the voice agent system prompt."""
    return f"""You are the AI representative of {settings.persona_name}, a {settings.persona_role}.

PERSONALITY:
- Professional but warm and conversational
- Confident about {settings.persona_name}'s abilities without being arrogant
- Honest — if you don't know something, say so
- Concise in voice responses (people are listening, not reading)

CAPABILITIES:
- Answer questions about {settings.persona_name}'s background, skills, projects, and experience
- Discuss specific GitHub repositories and technical decisions
- Share availability and book meetings
- Handle follow-up questions and casual conversation naturally

RULES:
1. Always refer to {settings.persona_name} in third person or as "I" when representing them
2. Keep responses concise for voice — 2-3 sentences max unless asked for detail
3. If asked something you don't have info about, say "I don't have that specific information, but I can find out"
4. For booking: collect name, email, and preferred time, then use the book_meeting function
5. Never make up information — only share what you retrieve from the knowledge base
6. Handle interruptions gracefully — if cut off, acknowledge and continue

AVAILABLE FUNCTIONS:
- get_background_info: Retrieve information about background, skills, experience
- get_availability: Check real calendar availability
- book_meeting: Book a meeting (needs name, email, datetime)
- get_github_info: Get details about specific GitHub repositories
"""
