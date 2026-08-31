# US-3 基础 LangGraph 工作流 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 后端可调用最小 LangGraph 工作流（输入处理 → LLM 推荐输出），提供同步 JSON 与 SSE 流式接口，测试可 mock LLM，CI 不依赖真实 API Key。

**Architecture:** FastAPI 路由 `POST /api/v1/workflows/execute` 调用 LangGraph 图；State 含 `query` / `products` / `recommendation`；两节点 `retrieve_products`（模拟商品检索）与 `generate_recommendation`（LLM，默认 mock）；SSE 走 `StreamingResponse` 按节点推送事件。LLM 通过 `LLM_MODE=mock|live` 切换，CI 固定 mock。

**Tech Stack:** FastAPI, LangGraph, LangChain OpenAI-compatible 客户端（DeepSeek 可选）, pytest + httpx, SSE

## Global Constraints

- Python >= 3.11；后端依赖进 `requirements.txt` / `requirements-dev.txt`
- 密钥不进 Git；`.env.example` 只列变量名
- 单元测试 mock LLM，`pytest --cov=app --cov-fail-under=80` 必须过
- 不改 main；在 `feature/3-langgraph-workflow` 开发，一 PR
- 本 PR 不做前端聊天 UI（US-5）；不做真实 RAG（US-5）

---

### Task 1: 依赖与 LLM 客户端（含 mock）

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `backend/.env.example`
- Create: `backend/app/services/llm_client.py`
- Create: `backend/tests/test_llm_client.py`

**Interfaces:**
- Produces: `get_llm_client() -> LLMClient`；`LLMClient.complete(prompt: str) -> str`；`LLM_MODE` 环境变量 `mock`（默认）| `live`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_llm_client.py
import os

from app.services.llm_client import get_llm_client


def test_mock_llm_returns_non_empty_text(monkeypatch):
    monkeypatch.setenv("LLM_MODE", "mock")
    client = get_llm_client()
    text = client.complete("推荐防晒衣")
    assert isinstance(text, str)
    assert len(text) > 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend; pytest tests/test_llm_client.py -v`
Expected: FAIL（module not found）

- [ ] **Step 3: Write minimal implementation**

`requirements.txt` 追加：

```text
langgraph>=0.2.0
langchain-core>=0.3.0
langchain-openai>=0.2.0
```

`backend/app/services/__init__.py` 空文件。

`backend/app/services/llm_client.py`:

```python
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
```

`.env.example` 追加：

```text
LLM_MODE=mock
# DEEPSEEK_API_KEY=
# LLM_BASE_URL=https://api.deepseek.com/v1
# LLM_MODEL=deepseek-chat
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend; pip install -r requirements-dev.txt; pytest tests/test_llm_client.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/requirements.txt backend/.env.example backend/app/services backend/tests/test_llm_client.py
git commit -m "feat: add mockable LLM client for workflow"
```

---

### Task 2: LangGraph State + 两节点图

**Files:**
- Create: `backend/app/core/__init__.py`
- Create: `backend/app/core/workflow.py`
- Create: `backend/tests/test_workflow.py`

**Interfaces:**
- Consumes: `get_llm_client()`
- Produces: `WorkflowState` TypedDict；`build_recommendation_graph()`；`run_recommendation(query: str) -> dict`；`stream_recommendation(query: str) -> Iterator[dict]`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_workflow.py
from app.core.workflow import run_recommendation


def test_run_recommendation_returns_query_and_text(monkeypatch):
    monkeypatch.setenv("LLM_MODE", "mock")
    result = run_recommendation("推荐防晒衣")
    assert result["query"] == "推荐防晒衣"
    assert "recommendation" in result
    assert len(result["recommendation"]) > 0
    assert isinstance(result["products"], list)
    assert len(result["products"]) >= 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend; pytest tests/test_workflow.py -v`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/core/workflow.py
from __future__ import annotations

from collections.abc import Iterator
from typing import TypedDict

from langgraph.graph import END, START, StateGraph

from app.services.llm_client import get_llm_client

MOCK_CATALOG = [
    {"id": "p1", "name": "轻薄防晒衣", "price": 199, "category": "外套"},
    {"id": "p2", "name": "宽檐遮阳帽", "price": 89, "category": "配饰"},
    {"id": "p3", "name": "速干沙滩裤", "price": 129, "category": "下装"},
]


class WorkflowState(TypedDict):
    query: str
    products: list[dict]
    recommendation: str


def retrieve_products(state: WorkflowState) -> dict:
    q = state["query"].lower()
    hits = [p for p in MOCK_CATALOG if any(c in q for c in ("防晒", "海边", "度假", "推荐"))]
    if not hits:
        hits = MOCK_CATALOG[:2]
    return {"products": hits}


def generate_recommendation(state: WorkflowState) -> dict:
    client = get_llm_client()
    catalog = "、".join(f"{p['name']}(¥{p['price']})" for p in state["products"])
    prompt = f"用户需求：{state['query']}\n候选商品：{catalog}\n请用一两句中文给出推荐理由。"
    return {"recommendation": client.complete(prompt)}


def build_recommendation_graph():
    graph = StateGraph(WorkflowState)
    graph.add_node("retrieve_products", retrieve_products)
    graph.add_node("generate_recommendation", generate_recommendation)
    graph.add_edge(START, "retrieve_products")
    graph.add_edge("retrieve_products", "generate_recommendation")
    graph.add_edge("generate_recommendation", END)
    return graph.compile()


def run_recommendation(query: str) -> dict:
    app = build_recommendation_graph()
    return app.invoke({"query": query, "products": [], "recommendation": ""})


def stream_recommendation(query: str) -> Iterator[dict]:
    app = build_recommendation_graph()
    for event in app.stream(
        {"query": query, "products": [], "recommendation": ""},
        stream_mode="updates",
    ):
        yield event
```

- [ ] **Step 4: Run tests**

Run: `cd backend; pytest tests/test_workflow.py tests/test_llm_client.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/core backend/tests/test_workflow.py
git commit -m "feat: add LangGraph recommendation workflow with two nodes"
```

---

### Task 3: FastAPI 路由（JSON + SSE）

**Files:**
- Create: `backend/app/api/__init__.py`
- Create: `backend/app/api/v1/__init__.py`
- Create: `backend/app/api/v1/workflows.py`
- Create: `backend/app/utils/__init__.py`
- Create: `backend/app/utils/sse.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_workflows_api.py`

**Interfaces:**
- Consumes: `run_recommendation`, `stream_recommendation`
- Produces: `POST /api/v1/workflows/execute` body `{ "query": str, "stream": bool }`；非流式返回 JSON；`stream=true` 返回 `text/event-stream`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_workflows_api.py
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_execute_returns_recommendation(monkeypatch):
    monkeypatch.setenv("LLM_MODE", "mock")
    resp = client.post("/api/v1/workflows/execute", json={"query": "推荐防晒衣"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["query"] == "推荐防晒衣"
    assert data["recommendation"]
    assert len(data["products"]) >= 1


def test_execute_sse_stream(monkeypatch):
    monkeypatch.setenv("LLM_MODE", "mock")
    with client.stream(
        "POST",
        "/api/v1/workflows/execute",
        json={"query": "推荐防晒衣", "stream": True},
    ) as resp:
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers["content-type"]
        body = "".join(resp.iter_text())
        assert "data:" in body
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend; pytest tests/test_workflows_api.py -v`
Expected: FAIL（404）

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/utils/sse.py
from __future__ import annotations

import json
from collections.abc import Iterator
from typing import Any


def format_sse(data: Any, event: str | None = None) -> str:
    payload = json.dumps(data, ensure_ascii=False)
    lines = []
    if event:
        lines.append(f"event: {event}")
    lines.append(f"data: {payload}")
    lines.append("")
    return "\n".join(lines) + "\n"


def iter_sse(events: Iterator[tuple[str, Any]]) -> Iterator[str]:
    for event, data in events:
        yield format_sse(data, event=event)
```

```python
# backend/app/api/v1/workflows.py
from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.workflow import run_recommendation, stream_recommendation
from app.utils.sse import format_sse

router = APIRouter(prefix="/api/v1/workflows", tags=["workflows"])


class ExecuteRequest(BaseModel):
    query: str = Field(min_length=1, max_length=500)
    stream: bool = False


@router.post("/execute")
def execute_workflow(body: ExecuteRequest):
    if not body.stream:
        return run_recommendation(body.query)

    def event_gen():
        for update in stream_recommendation(body.query):
            yield format_sse(update, event="node")
        yield format_sse({"done": True}, event="done")

    return StreamingResponse(event_gen(), media_type="text/event-stream")
```

`main.py` 增加：

```python
from app.api.v1.workflows import router as workflows_router

app.include_router(workflows_router)
```

- [ ] **Step 4: Run full backend suite**

Run: `cd backend; ruff format .; ruff check .; pytest --cov=app --cov-fail-under=80 -v`
Expected: PASS，覆盖率 ≥ 80%

- [ ] **Step 5: Commit**

```bash
git add backend/app backend/tests
git commit -m "feat: add workflow execute API with JSON and SSE"
```

---

### Task 4: 文档与活记忆 + PR

**Files:**
- Modify: `standards/01-requirements.md`（US-3 状态 → Done / In Review）
- Modify: `standards/PROGRESS.md`
- Modify: `README.md`（补充 API 示例一行）
- Modify: `backend/.env.example`（若 Task1 已改则跳过）

- [ ] **Step 1: Update docs**

README 增加：

```bash
# 同步执行（mock LLM）
curl -X POST http://localhost:8000/api/v1/workflows/execute \
  -H "Content-Type: application/json" \
  -d '{"query":"推荐防晒衣"}'
```

PROGRESS：阶段改为开发中 US-3；勾选 US-3；下一步 US-4。

- [ ] **Step 2: Local CI + push + PR**

```bash
cd backend && ruff format --check . && ruff check . && pytest --cov=app --cov-fail-under=80
git push -u origin feature/3-langgraph-workflow
gh pr create --base main --title "feat: LangGraph recommendation workflow API (US-3)" --body "..."
```

- [ ] **Step 3: Stop at confirmation gate** — 汇报 PR 链接与 CI；**不自行 Merge**

---

## Spec coverage check

| AC | Task |
|---|---|
| AC1 State + ≥2 nodes | Task 2 |
| AC2 POST execute | Task 3 |
| AC3 SSE | Task 3 |
| AC4 unit tests mock LLM | Task 1–3 |

## Placeholder scan

无 TBD / 空实现步骤。
