"""LLM: NVIDIA NIM → ModelScope → Groq → OpenAI (fallback chain, OpenAI-compatible APIs)."""

from __future__ import annotations

from typing import Any, List, Sequence, Union

import structlog
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage
from langchain_core.outputs import ChatGeneration, ChatResult
from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI

from app.config import Settings

logger = structlog.get_logger()


def _nvidia_chat_api_key(settings: Settings) -> str:
    return (settings.nvidia_chat_api_key or settings.nvidia_embedding_api_key or "").strip()


def _modelscope_chat_key(settings: Settings) -> str:
    return (settings.modelscope_chat_api_key or settings.embedding_api_key or "").strip()


def _modelscope_chat_base(settings: Settings) -> str:
    return (settings.modelscope_chat_base or settings.embedding_api_base or "").strip()


def _openai_key_usable(settings: Settings) -> bool:
    k = settings.openai_api_key.strip()
    if not k:
        return False
    if k.startswith("sk-...") or k in ("sk-test", "sk-test-openai"):
        return False
    return len(k) > 20


def _chat_result_text(result: ChatResult) -> str:
    """Extract a plain-text payload from a chat result."""
    if not result.generations:
        return ""

    generation = result.generations[0]
    message = getattr(generation, "message", None)
    content = getattr(message, "content", "")

    if isinstance(content, str):
        return content

    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict):
                parts.append(str(block.get("text") or block.get("content") or ""))
            else:
                parts.append(str(block))
        return "".join(parts)

    return str(content or "")


class FallbackChatLLM(BaseChatModel):
    """Try chat models in order until one succeeds (rate limits, outages, etc.)."""

    models: List[ChatOpenAI]

    @property
    def _llm_type(self) -> str:
        return "fallback-chat-openai"

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Union[List[str], None] = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> ChatResult:
        last: Exception | None = None
        for i, m in enumerate(self.models):
            try:
                result = m._generate(messages, stop=stop, run_manager=run_manager, **kwargs)
                if _chat_result_text(result).strip():
                    return result
                raise ValueError("LLM returned empty content")
            except Exception as e:
                logger.warning("llm_fallback_invoke", attempt=i + 1, error=str(e)[:300])
                last = e
        assert last is not None
        raise last

    async def _agenerate(
        self,
        messages: List[BaseMessage],
        stop: Union[List[str], None] = None,
        run_manager: Any = None,
        **kwargs: Any,
    ) -> ChatResult:
        last: Exception | None = None
        for i, m in enumerate(self.models):
            try:
                result = await m._agenerate(messages, stop=stop, run_manager=run_manager, **kwargs)
                if _chat_result_text(result).strip():
                    return result
                raise ValueError("LLM returned empty content")
            except Exception as e:
                logger.warning("llm_fallback_ainvoke", attempt=i + 1, error=str(e)[:300])
                last = e
        assert last is not None
        raise last

    def bind(self, **kwargs: Any) -> Any:
        """Delegate bind to the first underlying model (best-effort)."""
        return self.models[0].bind(**kwargs) if self.models else self


def get_llm(settings: Settings, temperature: float = 0.35) -> BaseChatModel:
    """Build primary LLM with fallbacks: NVIDIA → ModelScope → Groq → OpenAI."""
    models: List[ChatOpenAI] = []
    common = dict(
        temperature=temperature,
        max_tokens=int(settings.llm_max_tokens),
        request_timeout=90,
    )

    nk = _nvidia_chat_api_key(settings)
    if nk:
        models.append(
            ChatOpenAI(
                model=settings.nvidia_chat_model,
                openai_api_key=nk,
                openai_api_base=settings.nvidia_chat_base.rstrip("/"),
                **common,
            )
        )

    ms_key = _modelscope_chat_key(settings)
    ms_base = _modelscope_chat_base(settings)
    if ms_key and ms_base:
        models.append(
            ChatOpenAI(
                model=settings.modelscope_chat_model,
                openai_api_key=ms_key,
                openai_api_base=ms_base.rstrip("/"),
                **common,
            )
        )

    if settings.groq_api_key.strip():
        models.append(
            ChatOpenAI(
                model=settings.groq_model,
                openai_api_key=settings.groq_api_key,
                openai_api_base=settings.groq_api_base.rstrip("/"),
                **common,
            )
        )

    if _openai_key_usable(settings):
        models.append(
            ChatOpenAI(
                model=settings.openai_model,
                openai_api_key=settings.openai_api_key,
                **common,
            )
        )

    if not models:
        raise ValueError(
            "No LLM configured. Set NVIDIA (chat or embedding nvapi key), MODELSCOPE + EMBEDDING_API_KEY, "
            "GROQ_API_KEY, or a real OPENAI_API_KEY."
        )

    if len(models) == 1:
        return models[0]

    return FallbackChatLLM(models=models)
