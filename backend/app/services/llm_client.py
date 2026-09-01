# 阅读顺序:
# 1. LLMClient Protocol — 统一 complete(prompt) 接口
# 2. MockLLMClient      — CI/默认路径,无外网、无密钥
# 3. LiveLLMClient      — 可选 DeepSeek(OpenAI 兼容);仅 LLM_MODE=live
# 4. get_llm_client     — 工厂: 按环境变量切换实现
#
# 为何默认 mock: 保证 CI 与本机无 Key 也能跑通工作流图。

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
