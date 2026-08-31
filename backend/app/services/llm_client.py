from __future__ import annotations

import os
from typing import Protocol


class LLMClient(Protocol):
    def complete(self, prompt: str) -> str: ...


class MockLLMClient:
    def complete(self, prompt: str) -> str:
        return f"[mock] 根据「{prompt}」为您推荐：轻薄防晒衣 · 价格 ¥199 · 适合海边度假。"


class LiveLLMClient:
    def __init__(self) -> None:
        from langchain_openai import ChatOpenAI

        self._model = ChatOpenAI(
            model=os.getenv("LLM_MODEL", "deepseek-chat"),
            api_key=os.getenv("DEEPSEEK_API_KEY") or os.getenv("OPENAI_API_KEY"),
            base_url=os.getenv("LLM_BASE_URL", "https://api.deepseek.com/v1"),
            temperature=0.3,
            timeout=30,
            max_retries=2,
        )

    def complete(self, prompt: str) -> str:
        msg = self._model.invoke(prompt)
        return str(msg.content)


def get_llm_client() -> LLMClient:
    mode = os.getenv("LLM_MODE", "mock").lower()
    if mode == "live":
        return LiveLLMClient()
    return MockLLMClient()
