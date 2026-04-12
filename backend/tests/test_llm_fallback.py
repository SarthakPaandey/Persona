"""Tests for chat-model fallback behavior."""

import pytest
from langchain_core.messages import AIMessage
from langchain_core.outputs import ChatGeneration, ChatResult

from app.core.llm import FallbackChatLLM


def _result(content):
    return ChatResult(generations=[ChatGeneration(message=AIMessage(content=content))])


class StubModel:
    def __init__(self, result=None, error=None):
        self.result = result
        self.error = error

    def _generate(self, messages, stop=None, run_manager=None, **kwargs):
        if self.error:
            raise self.error
        return self.result

    async def _agenerate(self, messages, stop=None, run_manager=None, **kwargs):
        if self.error:
            raise self.error
        return self.result


def test_fallback_uses_next_model_when_first_returns_empty_content():
    llm = FallbackChatLLM.construct(
        models=[
            StubModel(result=_result("")),
            StubModel(result=_result("fallback answer")),
        ]
    )

    result = llm._generate(messages=[])

    assert result.generations[0].message.content == "fallback answer"


@pytest.mark.asyncio
async def test_async_fallback_uses_next_model_when_first_returns_empty_content():
    llm = FallbackChatLLM.construct(
        models=[
            StubModel(result=_result("   ")),
            StubModel(result=_result("async fallback answer")),
        ]
    )

    result = await llm._agenerate(messages=[])

    assert result.generations[0].message.content == "async fallback answer"
