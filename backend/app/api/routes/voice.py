"""Vapi webhook handlers for the voice agent."""

import asyncio
import json
import structlog
from typing import Any, Dict, List

from fastapi import APIRouter, Request
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

from app.services.calendar_service import CalendarService

logger = structlog.get_logger()
router = APIRouter()

# Well under Vapi's hard 20-second webhook timeout
VOICE_LLM_TIMEOUT_SECONDS = 12

# ---------------------------------------------------------------------------
# Profile facts baked in — the LLM can answer *any* common voice question
# from this block alone, without doing a slow Pinecone retrieval.
# ---------------------------------------------------------------------------
SARTHAK_PROFILE = """
CAPTAIN SARTHAK PANDEY — PROFILE BRIEF (use this to answer any question)

Role target: AI/ML Engineer at Scaler (or similar AI-first company)
Current student: Bachelor of Science in  CS, Scaler School Of Technology, enrolled 2023 (Scaler AI/ML track)

TECHNICAL SKILLS:
- Languages: Python (production-quality, async, typed), TypeScript, JavaScript
- AI/ML: RAG pipelines, LLM integration (OpenAI, Groq, NVIDIA NIM), LangChain, LangGraph, LlamaIndex
- Voice AI: Vapi, ElevenLabs, Deepgram — built this voice assistant you are running on right now
- Vector DBs: Pinecone, Chroma, Weaviate
- Full-stack: FastAPI, Next.js, React, Node.js, PostgreSQL, MongoDB
- Cloud/Infra: Railway, Vercel, Docker, GitHub Actions
- Agentic Systems: Multi-step reasoning pipelines, function calling, autonomous agents

KEY PROJECTS:
1. FinTracker — Production personal finance AI app with autonomous categorization using LLMs
2. FlowEx — Algorithmic trading platform with backtesting engine and real-time signals
3. portfolio — AI-powered portfolio site with this voice agent and RAG chatbot (the one you are running on)
4. VectorAI — AI SaaS platform with embeddings and vector search
5. StoryTeller — AI story generation app with multi-modal capabilities
6. MrBully — AI-powered social platform feature
7. ScalerQuestLinker — Scaler ecosystem tool for students
8. AnonymChat — Real-time anonymous chat application with modern stack

WHY SARTHAK IS A STRONG FIT:
- He has SHIPPED production AI agents to real users — not just notebooks or demos
- He built a complete RAG pipeline from scratch (Pinecone, LangChain, streaming responses)
- He built voice AI from scratch using Vapi + ElevenLabs + Deepgram (you are the proof)
- He works in Python production-quality async code — exactly what Scaler needs
- He has hands-on experience with LLM APIs (OpenAI, Groq, NVIDIA), function calling, and context management
- He understands agentic systems: the portfolio site runs autonomous tool-calling agents
- He cares about user experience — the voice agent, the chat UI, the booking flow are all polished
- He ships fast under real constraints — this entire AI persona system was built and deployed to production
- He is a Scaler AI/ML student — he knows the platform, the learner journey, and the culture from the inside
- He is available immediately and is passionate about building AI that actually helps people learn

EDUCATION:
- Bachelor of Science in  CS, Scaler School Of Technology, enrolled 2023 (Scaler AI/ML track)
- Scaler structured curriculum: ML fundamentals, deep learning, NLP, applied AI systems

CONTACT / BOOKING:
- Book via the AI system this assistant is connected to
- The assistant can check real calendar availability and book meetings end-to-end
"""


def _build_voice_llm(settings) -> ChatOpenAI:
    """Build the fastest available LLM for voice responses (Groq preferred for low latency)."""
    if settings.groq_api_key and settings.groq_api_key.strip():
        return ChatOpenAI(
            model="llama-3.1-8b-instant",
            openai_api_key=settings.groq_api_key,
            openai_api_base=settings.groq_api_base.rstrip("/"),
            temperature=0.3,
            max_tokens=300,  # Keep voice responses short
            request_timeout=VOICE_LLM_TIMEOUT_SECONDS - 2,
        )
    # Fallback to OpenAI gpt-4o-mini (fast and cheap)
    return ChatOpenAI(
        model="gpt-4o-mini",
        openai_api_key=settings.openai_api_key,
        temperature=0.3,
        max_tokens=300,
        request_timeout=VOICE_LLM_TIMEOUT_SECONDS - 2,
    )


async def _fast_voice_answer(settings, question: str) -> str:
    """
    Answer a voice question in <10 seconds using a direct LLM call
    with Sarthak's profile embedded — no slow Pinecone retrieval.
    """
    persona_name = settings.persona_name
    system = f"""You are RORI, Captain {persona_name}'s loyal ship AI.

You represent Captain {persona_name} to recruiters and hiring managers on voice calls.

{SARTHAK_PROFILE}

RULES:
- Keep answers to 2-3 sentences max (this is a voice call, people are listening)
- Be warm, specific, and confident
- Use "his" / "he" when referring to Captain {persona_name}, NEVER "they" / "their"
- Only state facts from the profile above — never invent anything
- If asked something not in the profile, say it concisely and don't apologize excessively
"""
    llm = _build_voice_llm(settings)
    messages = [SystemMessage(content=system), HumanMessage(content=question)]
    try:
        response = await asyncio.wait_for(
            llm.ainvoke(messages),
            timeout=VOICE_LLM_TIMEOUT_SECONDS,
        )
        content = getattr(response, "content", "") or ""
        if isinstance(content, list):
            content = "".join(
                str(b.get("text", "") if isinstance(b, dict) else b) for b in content
            )
        return content.strip()
    except asyncio.TimeoutError:
        logger.error("voice_llm_timeout", question=question[:100])
        return (
            f"Captain {persona_name} is a skilled AI Engineer specializing in "
            "production RAG systems, voice AI, and full-stack Python applications. "
            "He has shipped real AI agents to production and is an ideal fit for "
            "AI Engineer roles at companies like Scaler."
        )
    except Exception as e:
        logger.error("voice_llm_error", error=str(e), question=question[:100])
        return (
            f"Captain {persona_name} is a highly skilled AI/ML Engineer "
            "with hands-on production experience in RAG, voice AI, and agentic systems."
        )


# ---------------------------------------------------------------------------
# Tool-call parsing
# ---------------------------------------------------------------------------

def _extract_tool_call_info(tool_call: Dict[str, Any]):
    """
    Extract (call_id, fn_name, arguments) from a Vapi tool call.

    Vapi/OpenAI can send two layouts:
      Flat:   {"id": "...", "name": "fn", "arguments": {...}}
      Nested: {"id": "...", "type": "function",
               "function": {"name": "fn", "arguments": "{...}"}}
    """
    call_id = tool_call.get("id", "")

    # Flat format
    fn_name = tool_call.get("name", "")
    arguments = tool_call.get("arguments", {})

    # Nested OpenAI format
    if not fn_name:
        fn_obj = tool_call.get("function", {})
        if isinstance(fn_obj, dict):
            fn_name = fn_obj.get("name", "")
            raw_args = fn_obj.get("arguments", fn_obj.get("parameters", {}))
            if isinstance(raw_args, str):
                try:
                    arguments = json.loads(raw_args)
                except (json.JSONDecodeError, TypeError):
                    arguments = {}
            elif isinstance(raw_args, dict):
                arguments = raw_args

    # JSON-string arguments in flat format
    if isinstance(arguments, str):
        try:
            arguments = json.loads(arguments)
        except (json.JSONDecodeError, TypeError):
            arguments = {}

    logger.info(
        "vapi_tool_call_parsed",
        call_id=call_id,
        fn_name=fn_name,
        arguments=arguments,
        raw_keys=list(tool_call.keys()),
    )
    return call_id, fn_name, arguments


# ---------------------------------------------------------------------------
# Main webhook
# ---------------------------------------------------------------------------

@router.post("/vapi/webhook")
async def vapi_webhook(request: Request):
    body = await request.json()
    message = body.get("message", {})
    message_type = message.get("type", "")

    logger.info("vapi_webhook", type=message_type)

    if message_type == "tool-calls":
        return await _handle_tool_calls(request, body)
    if message_type == "function-call":
        return await _handle_function_call(request, body)
    if message_type == "assistant-request":
        return _handle_assistant_request(request)
    if message_type == "end-of-call-report":
        return _handle_call_report(body)
    if message_type == "status-update":
        return _handle_status_update(body)

    logger.warning("vapi_unknown_type", type=message_type)
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Tool-calls handler (modern Vapi format)
# ---------------------------------------------------------------------------

async def _handle_tool_calls(request: Request, body: Dict[str, Any]):
    message = body.get("message", {})
    tool_call_list = message.get("toolCallList", [])

    # Also check toolWithToolCallList (some Vapi versions send it here)
    if not tool_call_list:
        for item in message.get("toolWithToolCallList", []):
            tc = item.get("toolCall", {})
            if tc:
                tool_call_list.append(tc)

    logger.info("vapi_tool_calls", count=len(tool_call_list))

    results = []
    for tc in tool_call_list:
        call_id, fn_name, arguments = _extract_tool_call_info(tc)
        result_text = await _dispatch(request, fn_name, arguments)
        results.append({"toolCallId": call_id, "result": result_text})

    return {"results": results}


# ---------------------------------------------------------------------------
# Legacy function-call handler
# ---------------------------------------------------------------------------

async def _handle_function_call(request: Request, body: Dict[str, Any]):
    fc = body["message"].get("functionCall", {})
    fn_name = fc.get("name", "")
    parameters = fc.get("parameters", {})
    logger.info("vapi_legacy_function_call", name=fn_name)
    result = await _dispatch(request, fn_name, parameters)
    return {"result": result}


# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------

async def _dispatch(request: Request, fn_name: str, params: Dict[str, Any]) -> str:
    logger.info("vapi_dispatch", fn_name=fn_name)
    if fn_name == "get_background_info":
        return await _get_background_info(request, params)
    if fn_name == "get_github_info":
        return await _get_github_info(request, params)
    if fn_name == "get_availability":
        return await _get_availability(request)
    if fn_name == "book_meeting":
        return await _book_meeting(request, params)
    logger.error("vapi_unknown_fn", fn_name=fn_name)
    return f"I don't have a handler for '{fn_name}'."


# ---------------------------------------------------------------------------
# Tool implementations — all use _fast_voice_answer, not slow RAG
# ---------------------------------------------------------------------------

async def _get_background_info(request: Request, parameters: Dict[str, Any]) -> str:
    """Answer background/role-fit questions fast — no Pinecone, direct LLM call."""
    settings = request.app.state.settings
    question = parameters.get("question", "Tell me about Captain Sarthak Pandey")
    return await _fast_voice_answer(settings, question)


async def _get_github_info(request: Request, parameters: Dict[str, Any]) -> str:
    """Answer project/repo questions fast — no Pinecone, direct LLM call."""
    settings = request.app.state.settings
    repo_name = parameters.get("repo_name", "")
    question = parameters.get("question", f"Tell me about the {repo_name} project")
    full_q = f"Tell me about the GitHub repository '{repo_name}': {question}" if repo_name else question
    return await _fast_voice_answer(settings, full_q)


async def _get_availability(request: Request) -> str:
    settings = request.app.state.settings
    calendar_service = CalendarService(settings)
    try:
        return await asyncio.wait_for(
            calendar_service.get_availability(),
            timeout=10,
        )
    except Exception as e:
        logger.error("availability_error", error=str(e))
        return (
            f"I'm having trouble accessing the calendar. "
            f"You can book directly at https://cal.com/{settings.calcom_username}"
        )


async def _book_meeting(request: Request, parameters: Dict[str, Any]) -> str:
    settings = request.app.state.settings
    calendar_service = CalendarService(settings)
    datetime_str = parameters.get("datetime", "")
    if not datetime_str:
        return "I need a preferred time to book. Could you tell me when you are free?"
    try:
        await asyncio.wait_for(
            calendar_service.create_booking(
                name="Voice Caller",
                email="anonymous-voice-caller@example.com",
                start_time=datetime_str,
            ),
            timeout=10,
        )
        return f"Locked in! I've booked a meeting for you at {datetime_str}."
    except Exception as e:
        logger.error("book_meeting_error", error=str(e))
        return (
            f"I had trouble booking that slot. "
            f"Please try at https://cal.com/{settings.calcom_username}"
        )


# ---------------------------------------------------------------------------
# Non-tool webhook handlers
# ---------------------------------------------------------------------------

def _handle_assistant_request(request: Request):
    settings = request.app.state.settings
    return {
        "assistant": {
            "firstMessage": (
                f"I am RORI, Captain {settings.persona_name}'s loyal ship AI. "
                "Ask me about his skills, projects, why he is the right fit, "
                "or schedule a meeting."
            ),
        }
    }


def _handle_call_report(body: Dict[str, Any]):
    report = body.get("message", {})
    logger.info(
        "vapi_call_ended",
        duration=report.get("duration"),
        summary=report.get("summary"),
        cost=report.get("cost"),
    )
    return {"status": "ok"}


def _handle_status_update(body: Dict[str, Any]):
    status = body.get("message", {}).get("status", "")
    logger.info("vapi_status", status=status)
    return {"status": "ok"}
