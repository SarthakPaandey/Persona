"""Vapi webhook handlers for the voice agent."""

import asyncio
import structlog
from typing import Any, Dict, List

from fastapi import APIRouter, Request

from app.core.rag_engine import RAGEngine
from app.services.calendar_service import CalendarService

logger = structlog.get_logger()
router = APIRouter()
RAG_QUERY_TIMEOUT_SECONDS = 20


@router.post("/vapi/webhook")
async def vapi_webhook(request: Request):
    """
    Handle Vapi webhook events.

    Vapi sends various event types:
    - tool-calls: Modern format — when the assistant calls a defined tool
    - function-call: Legacy format — older assistants still use this
    - end-of-call-report: Call summary
    - status-update: Call status changes
    - assistant-request: Dynamic assistant configuration
    """
    body = await request.json()
    message_type = body.get("message", {}).get("type", "")

    logger.info("Vapi webhook received", type=message_type)

    # ── Modern Tools API (tool-calls) ──────────────────────────────
    if message_type == "tool-calls":
        return await _handle_tool_calls(request, body)

    # ── Legacy function-call (kept for backward compat) ────────────
    if message_type == "function-call":
        return await _handle_function_call(request, body)

    if message_type == "assistant-request":
        return _handle_assistant_request(request)
    if message_type == "end-of-call-report":
        return _handle_call_report(body)
    if message_type == "status-update":
        return _handle_status_update(body)

    logger.warning("Unknown webhook type", type=message_type)
    return {"status": "ok"}


# ── Modern tool-calls handler ──────────────────────────────────────────

async def _handle_tool_calls(request: Request, body: Dict[str, Any]):
    """
    Handle the modern Vapi 'tool-calls' message.

    Vapi sends:
        message.toolCallList = [{ id, name, arguments }, ...]

    We must respond:
        { "results": [{ "toolCallId": "...", "result": "..." }, ...] }
    """
    tool_call_list = body["message"].get("toolCallList", [])

    results: List[Dict[str, str]] = []
    for tool_call in tool_call_list:
        call_id = tool_call.get("id", "")
        fn_name = tool_call.get("name", "")
        arguments = tool_call.get("arguments", {})

        logger.info("Tool call", id=call_id, name=fn_name, args=arguments)

        result_text = await _dispatch_function(request, fn_name, arguments)
        results.append({"toolCallId": call_id, "result": result_text})

    return {"results": results}


# ── Legacy function-call handler ───────────────────────────────────────

async def _handle_function_call(request: Request, body: Dict[str, Any]):
    """Handle the legacy Vapi 'function-call' message format."""
    function_call = body["message"]["functionCall"]
    function_name = function_call["name"]
    parameters = function_call.get("parameters", {})

    logger.info("Legacy function call", name=function_name, params=parameters)

    result_text = await _dispatch_function(request, function_name, parameters)
    return {"result": result_text}


# ── Shared dispatcher ──────────────────────────────────────────────────

async def _dispatch_function(request: Request, fn_name: str, params: Dict[str, Any]) -> str:
    """Route a tool/function call to the right handler and return a plain string result."""
    if fn_name == "get_background_info":
        return await _get_background_info(request, params)
    if fn_name == "get_availability":
        return await _get_availability(request)
    if fn_name == "book_meeting":
        return await _book_meeting(request, params)
    if fn_name == "get_github_info":
        return await _get_github_info(request, params)

    return "I don't have that capability yet."


# ── Tool implementations ──────────────────────────────────────────────

async def _get_background_info(request: Request, parameters: Dict[str, Any]) -> str:
    """Retrieve background info via RAG."""
    rag_engine: RAGEngine = request.app.state.rag_engine
    query = parameters.get("question", "Tell me about yourself")
    try:
        response = await asyncio.wait_for(
            rag_engine.query(query=query, conversation_history=[]),
            timeout=RAG_QUERY_TIMEOUT_SECONDS,
        )
        return response.answer
    except asyncio.TimeoutError:
        logger.warning("Background info query timed out", timeout_seconds=RAG_QUERY_TIMEOUT_SECONDS)
        return (
            "I am having trouble loading that detail right now. "
            "Please ask a shorter question, or I can summarize key highlights first."
        )
    except Exception as e:
        logger.error("Background info query failed", error=str(e))
        return (
            "I ran into a temporary issue fetching that information. "
            "Could you try again in a moment?"
        )


async def _get_availability(request: Request) -> str:
    """Get real calendar availability."""
    settings = request.app.state.settings
    calendar_service = CalendarService(settings)

    try:
        availability = await calendar_service.get_availability()
        return availability
    except Exception as e:
        logger.error("Failed to get availability", error=str(e))
        return (
            "I'm having trouble accessing my calendar right now. "
            f"You can book directly at https://cal.com/{settings.calcom_username}"
        )


async def _book_meeting(request: Request, parameters: Dict[str, Any]) -> str:
    """Book a meeting on the calendar."""
    settings = request.app.state.settings
    calendar_service = CalendarService(settings)

    try:
        name = parameters.get("name", "")
        email = parameters.get("email", "")
        datetime_str = parameters.get("datetime", "")

        if not all([name, email, datetime_str]):
            return (
                "I need your name, email, and preferred time to book. "
                "Could you provide those?"
            )

        await calendar_service.create_booking(
            name=name, email=email, start_time=datetime_str
        )

        return (
            f"Great! I've booked a meeting for {name} at {datetime_str}. "
            f"A confirmation has been sent to {email}."
        )
    except Exception as e:
        logger.error("Failed to book meeting", error=str(e))
        return (
            "I had trouble booking that slot. "
            f"Please try booking directly at https://cal.com/{settings.calcom_username}"
        )


async def _get_github_info(request: Request, parameters: Dict[str, Any]) -> str:
    """Get info about GitHub repos via RAG."""
    rag_engine: RAGEngine = request.app.state.rag_engine
    repo_name = parameters.get("repo_name", "")
    question = parameters.get("question", f"Tell me about the {repo_name} project")
    try:
        response = await asyncio.wait_for(
            rag_engine.query(
                query=f"GitHub repository {repo_name}: {question}",
                conversation_history=[],
            ),
            timeout=RAG_QUERY_TIMEOUT_SECONDS,
        )
        return response.answer
    except asyncio.TimeoutError:
        logger.warning(
            "GitHub info query timed out",
            repo_name=repo_name,
            timeout_seconds=RAG_QUERY_TIMEOUT_SECONDS,
        )
        return (
            "I am having trouble loading GitHub details right now. "
            "I can share a high-level summary, or you can ask about a specific repository file or feature."
        )
    except Exception as e:
        logger.error("GitHub info query failed", repo_name=repo_name, error=str(e))
        return (
            "I hit a temporary issue while checking that repository. "
            "Please try again in a moment."
        )


# ── Other webhook handlers ────────────────────────────────────────────

def _handle_assistant_request(request: Request):
    """Provide dynamic assistant configuration."""
    settings = request.app.state.settings

    return {
        "assistant": {
            "firstMessage": (
                f"I am RORI, Captain {settings.persona_name}'s loyal ship AI. "
                "I can tell you about his resume highlights, GitHub projects, role fit, and schedule a rendezvous. "
                "Set course and ask me about his projects, experience, or why he is the right fit."
            ),
            "model": {
                "provider": "groq",
                "model": "llama-3.1-8b-instant",
                "systemPrompt": _get_voice_system_prompt(settings),
            },
            "voice": {
                "provider": "11labs",
                "voiceId": settings.elevenlabs_voice_id,
                "model": "eleven_flash_v2_5",
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
    return f"""You are RORI, Captain {settings.persona_name}'s loyal ship AI.

IDENTITY:
- Your name is RORI
- {settings.persona_name} is your captain
- If asked who you are, say: "I am RORI, Captain {settings.persona_name}'s loyal ship AI."

PERSONALITY:
- Professional but warm and conversational
- Slight space-mission flavor is welcome (for example: "set course", "rendezvous") without overdoing it
- Confident about Captain {settings.persona_name}'s abilities without being arrogant
- Honest — if you don't know something, say so
- Concise in voice responses (people are listening, not reading)

CAPABILITIES:
- Answer questions about Captain {settings.persona_name}'s background, skills, projects, and experience
- Discuss specific GitHub repositories and technical decisions
- Explain why Captain {settings.persona_name} is a strong fit for target roles using resume + project evidence
- Share availability and book meetings
- Handle follow-up questions and casual conversation naturally

GROUNDING AND TOOL RULES (CRITICAL):
1. Refer to yourself as RORI and represent Captain {settings.persona_name}
2. Keep responses concise for voice — 2-3 sentences max unless asked for detail
3. For ANY question about projects, GitHub, resume, skills, experience, education, or role fit, call get_background_info first and answer only from its result
4. For booking: collect name, email, and preferred time, then use the book_meeting function
5. If a specific repository is mentioned, call get_github_info with repo_name and the user's question
6. Never make up information — only share what you retrieve from functions and the knowledge base
7. If information is missing or uncertain, say: "I don't have that specific information in my datacore right now." and offer to summarize verified highlights
8. Do not invent project names, companies, dates, or achievements
9. Handle interruptions gracefully — if cut off, acknowledge and continue

AVAILABLE TOOLS:
- get_background_info: Retrieve information about background, skills, experience
- get_availability: Check real calendar availability
- book_meeting: Book a meeting (needs name, email, datetime)
- get_github_info: Get details about specific GitHub repositories
"""
