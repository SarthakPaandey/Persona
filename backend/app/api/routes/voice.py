"""Vapi webhook handlers for the voice agent."""

import asyncio
import json
import structlog
from typing import Any, Dict, List

from fastapi import APIRouter, Request

from app.core.rag_engine import RAGEngine
from app.services.calendar_service import CalendarService

logger = structlog.get_logger()
router = APIRouter()
RAG_QUERY_TIMEOUT_SECONDS = 50


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
    message = body.get("message", {})
    message_type = message.get("type", "")

    logger.info("vapi_webhook_received", type=message_type)

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

    logger.warning("vapi_unknown_webhook_type", type=message_type)
    return {"status": "ok"}


# ── Tool-call parsing helpers ──────────────────────────────────────────

def _extract_tool_call_info(tool_call: Dict[str, Any]) -> tuple:
    """
    Extract (call_id, fn_name, arguments) from a tool call object.

    Vapi can send tool calls in two formats:

    1. Flat (docs example):
       {"id": "...", "name": "get_weather", "arguments": {"location": "SF"}}

    2. Nested OpenAI-standard (what Vapi actually sends in production):
       {"id": "...", "type": "function",
        "function": {"name": "get_weather", "arguments": "{\\"location\\": \\"SF\\"}"}}

    This helper handles both.
    """
    call_id = tool_call.get("id", "")

    # Try flat format first
    fn_name = tool_call.get("name", "")
    arguments = tool_call.get("arguments", {})

    # If name is empty, try nested OpenAI format: function.name
    if not fn_name:
        fn_obj = tool_call.get("function", {})
        if isinstance(fn_obj, dict):
            fn_name = fn_obj.get("name", "")
            raw_args = fn_obj.get("arguments", fn_obj.get("parameters", {}))
            # OpenAI format sends arguments as a JSON string
            if isinstance(raw_args, str):
                try:
                    arguments = json.loads(raw_args)
                except (json.JSONDecodeError, TypeError):
                    arguments = {}
            elif isinstance(raw_args, dict):
                arguments = raw_args

    # If arguments from flat format is a string, parse it
    if isinstance(arguments, str):
        try:
            arguments = json.loads(arguments)
        except (json.JSONDecodeError, TypeError):
            arguments = {}

    return call_id, fn_name, arguments


# ── Modern tool-calls handler ──────────────────────────────────────────

async def _handle_tool_calls(request: Request, body: Dict[str, Any]):
    """
    Handle the modern Vapi 'tool-calls' message.

    Response format:
        { "results": [{ "toolCallId": "...", "result": "..." }, ...] }
    """
    message = body.get("message", {})
    tool_call_list = message.get("toolCallList", [])

    # Fallback: also check toolWithToolCallList if toolCallList is empty
    if not tool_call_list:
        for item in message.get("toolWithToolCallList", []):
            tc = item.get("toolCall", {})
            if tc:
                tool_call_list.append(tc)

    logger.info(
        "vapi_tool_calls_received",
        count=len(tool_call_list),
        raw_keys=list(message.keys()),
    )

    results: List[Dict[str, str]] = []
    for tool_call in tool_call_list:
        call_id, fn_name, arguments = _extract_tool_call_info(tool_call)

        logger.info(
            "vapi_tool_call_dispatch",
            call_id=call_id,
            fn_name=fn_name,
            arguments=arguments,
        )

        result_text = await _dispatch_function(request, fn_name, arguments)
        results.append({"toolCallId": call_id, "result": result_text})

    return {"results": results}


# ── Legacy function-call handler ───────────────────────────────────────

async def _handle_function_call(request: Request, body: Dict[str, Any]):
    """Handle the legacy Vapi 'function-call' message format."""
    function_call = body["message"].get("functionCall", {})
    function_name = function_call.get("name", "")
    parameters = function_call.get("parameters", {})

    logger.info("vapi_legacy_function_call", name=function_name, params=parameters)

    result_text = await _dispatch_function(request, function_name, parameters)
    return {"result": result_text}


# ── Shared dispatcher ──────────────────────────────────────────────────

async def _dispatch_function(
    request: Request, fn_name: str, params: Dict[str, Any]
) -> str:
    """Route a tool/function call to the right handler and return a plain string result."""
    logger.info("vapi_dispatch", fn_name=fn_name)

    if fn_name == "get_background_info":
        return await _get_background_info(request, params)
    if fn_name == "get_availability":
        return await _get_availability(request)
    if fn_name == "book_meeting":
        return await _book_meeting(request, params)
    if fn_name == "get_github_info":
        return await _get_github_info(request, params)

    logger.error("vapi_unknown_function", fn_name=fn_name, params=params)
    return f"Unknown function '{fn_name}'. Available: get_background_info, get_availability, book_meeting, get_github_info."


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
        answer = response.answer.strip()
        if not answer:
            return (
                "Captain Sarthak Pandey is a skilled AI Engineer with expertise in "
                "building production ML systems, full-stack applications, and voice AI agents. "
                "He has hands-on experience with Python, TypeScript, LLMs, RAG pipelines, "
                "and cloud deployments."
            )
        return answer
    except asyncio.TimeoutError:
        logger.warning("background_info_timeout", timeout=RAG_QUERY_TIMEOUT_SECONDS)
        return (
            "Captain Sarthak Pandey is a skilled AI Engineer with strong experience "
            "in building production ML systems, designing RAG pipelines, and full-stack "
            "application development using Python, TypeScript, and modern cloud platforms."
        )
    except Exception as e:
        logger.error("background_info_error", error=str(e))
        return (
            "Captain Sarthak Pandey is a skilled AI Engineer with experience "
            "in building production ML systems, full-stack applications, "
            "and cloud-native deployments."
        )


async def _get_availability(request: Request) -> str:
    """Get real calendar availability."""
    settings = request.app.state.settings
    calendar_service = CalendarService(settings)

    try:
        availability = await calendar_service.get_availability()
        return availability
    except Exception as e:
        logger.error("availability_error", error=str(e))
        return (
            "I'm having trouble accessing my calendar right now. "
            f"You can book directly at https://cal.com/{settings.calcom_username}"
        )


async def _book_meeting(request: Request, parameters: Dict[str, Any]) -> str:
    """Book a meeting on the calendar using generic values for voice callers."""
    settings = request.app.state.settings
    calendar_service = CalendarService(settings)

    try:
        datetime_str = parameters.get("datetime", "")

        if not datetime_str:
            return (
                "I need your preferred time to book. "
                "Could you tell me when you are free?"
            )

        # Use placeholder info for anonymous voice calls
        name = "Voice Caller"
        email = "anonymous-voice-caller@example.com"

        await calendar_service.create_booking(
            name=name, email=email, start_time=datetime_str
        )

        return f"Great! I've booked a meeting for you at {datetime_str}."
    except Exception as e:
        logger.error("book_meeting_error", error=str(e))
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
        answer = response.answer.strip()
        if not answer:
            return f"I don't have detailed information about the {repo_name} repository right now."
        return answer
    except asyncio.TimeoutError:
        logger.warning("github_info_timeout", repo_name=repo_name, timeout=RAG_QUERY_TIMEOUT_SECONDS)
        return (
            f"I'm having trouble loading details for {repo_name} right now. "
            "Could you ask about a specific aspect of the project?"
        )
    except Exception as e:
        logger.error("github_info_error", repo_name=repo_name, error=str(e))
        return (
            f"I hit a temporary issue checking the {repo_name} repository. "
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
        "vapi_call_ended",
        duration=report.get("duration"),
        summary=report.get("summary"),
        cost=report.get("cost"),
    )
    return {"status": "ok"}


def _handle_status_update(body: Dict[str, Any]):
    """Log status updates."""
    status = body.get("message", {}).get("status", "")
    logger.info("vapi_status_update", status=status)
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
3. For ANY question about projects, GitHub, resume, skills, experience, education, or role fit, call get_background_info ONCE and answer only from its result
4. For booking: ask when the caller is free, propose slots if needed, then use the book_meeting function
5. If a specific repository is mentioned, call get_github_info with repo_name and the user's question
6. Never make up information — only share what you retrieve from functions and the knowledge base
7. If information is missing or uncertain, say: "I don't have that specific information in my datacore right now." and offer to summarize verified highlights
8. Do not invent project names, companies, dates, or achievements
9. Handle interruptions gracefully — if cut off, acknowledge and continue
10. NEVER call the same tool more than once per user message. If a tool returns an error or unhelpful result, use whatever information you already have to answer. Do NOT retry.

AVAILABLE TOOLS:
- get_background_info: Retrieve information about background, skills, experience
- get_availability: Check real calendar availability
- book_meeting: Book a meeting (needs datetime only)
- get_github_info: Get details about specific GitHub repositories
"""
