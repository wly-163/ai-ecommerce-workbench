# 阅读顺序:
# 1. LLMClient Protocol — 工作流只依赖 complete(prompt)->str,不关心背后是谁
# 2. MockLLMClient      — 不联网、不花额度;CI 和没 Key 时保底
# 3. _api_key           — 读 DeepSeek/OpenAI Key,并去掉 .env 里等号后的空格
# 4. LiveLLMClient      — OpenAI 兼容协议打 DeepSeek(或其它 LLM_BASE_URL)
# 5. get_llm_client     — 工厂:LLM_MODE 可强制;未设置时有 Key 则 live
#
# 本地:仓库根目录 .env 里 LLM_MODE=live + DEEPSEEK_API_KEY。
# CI:无 .env,pytest 还在 conftest 里强制 mock,避免误打真模型。

from __future__ import annotations

import os
from typing import Protocol


class LLMClient(Protocol):
    """结构化鸭子类型:只要有 complete 就能当写手,工作流节点不用 if mock/live。"""

    def complete(self, prompt: str) -> str: ...


class MockLLMClient:
    def complete(self, prompt: str) -> str:
        # 固定句式并带 [mock] 前缀,方便肉眼区分「假写手」和真模型
        return f"[mock] 根据「{prompt}」为您推荐：轻薄防晒衣 · 价格 ¥199 · 适合海边度假。"


def _api_key() -> str:
    # 兼容两种变量名:本项目用 DeepSeek;有人只配了 OPENAI_API_KEY 也能跑
    # strip: .env 写成 `KEY= sk-xxx` 时,带空格的密钥会 401,很难查
    return (os.getenv("DEEPSEEK_API_KEY") or os.getenv("OPENAI_API_KEY") or "").strip()


class LiveLLMClient:
    def __init__(self) -> None:
        # 延迟 import:走 mock 时不必立刻构造 ChatOpenAI(会读 Key、建客户端)
        from langchain_openai import ChatOpenAI

        key = _api_key()
        if not key:
            raise RuntimeError("LLM_MODE=live 但未设置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY")

        self._model = ChatOpenAI(
            model=os.getenv("LLM_MODEL", "deepseek-chat"),
            api_key=key,
            base_url=os.getenv("LLM_BASE_URL", "https://api.deepseek.com/v1"),
            temperature=0.3,  # 推荐理由要稳,不要太随机
            timeout=30,
            max_retries=2,
        )

    def complete(self, prompt: str) -> str:
        msg = self._model.invoke(prompt)
        return str(msg.content)


def get_llm_client() -> LLMClient:
    """LLM_MODE=live/mock 可强制;未设置时有 API Key 则 live,否则 mock。"""
    raw = os.getenv("LLM_MODE")
    if raw is None or raw.strip() == "":
        # 未写 LLM_MODE:有钥匙就开门,避免配了 Key 却仍默默走 mock
        mode = "live" if _api_key() else "mock"
    else:
        mode = raw.strip().lower()
    if mode == "live":
        return LiveLLMClient()
    return MockLLMClient()
