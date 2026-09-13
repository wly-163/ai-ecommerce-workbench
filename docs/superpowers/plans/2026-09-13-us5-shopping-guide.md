# US-5 智能导购（聊天切片）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 首页右侧可多轮导购聊天（Postgres 会话 + 按节点 SSE），商品到达后左侧 3D 立方体按品类点亮；本切片不做 RAG。

**Architecture:** 新建 `/api/v1/chat` 与 SQLModel 表；LangGraph 只增加只读 `history`。前端用纯函数解析 SSE，`ChatPanel` 管气泡与发送，`App` 只管高亮集合。测试用 SQLite 内存库 + mock LLM；Playwright 拦截聊天 SSE。

**Tech Stack:** FastAPI、SQLModel、SQLite（测）/ PostgreSQL（跑）、LangGraph、React 19、Tailwind CSS 3、shadcn 风格 Button/Input/ScrollArea、Vitest、Playwright。

## Global Constraints

- 分支 `feature/5-ai-shopping-guide`，不直接改 `main`
- 不改 `POST /api/v1/workflows/execute` 的请求/响应契约；`history` 仅内部默认 `[]`
- 不引入 Alembic、RAG、向量库、打字机 token 流
- `conversation_id` 的 localStorage 键名：`workbench.conversation_id`
- 历史最多 10 轮 = 20 条 `messages`（按 `created_at` 倒序再正序）
- SSE 顺序：`session` → `node`(retrieve_products) → `node`(generate_recommendation) 或 `error` → `done`
- LLM 失败不写 assistant 行；retrieve 已发出则前端仍可点亮
- commit 说明中文 Conventional Commits；不要 `Co-authored-by: Cursor`
- pytest 强制 `LLM_MODE=mock`（已有 autouse fixture）+ `sqlite://` + `StaticPool`
- 复杂模块写阅读顺序注释；流程图用中文 Mermaid
- 后端覆盖率门槛仍 `--cov-fail-under=80`

## File map

| 路径 | 职责 |
|---|---|
| `backend/app/models/chat.py` | Conversation / Message 表 |
| `backend/app/db.py` | 引擎、Session、`init_db` |
| `backend/app/core/workflow.py` | `history` 入状态与 prompt |
| `backend/app/api/v1/chat.py` | POST SSE / GET 历史 |
| `backend/app/main.py` | lifespan `init_db`、挂 chat 路由 |
| `backend/tests/conftest.py` | SQLite 内存库 |
| `backend/tests/test_chat_api.py` | 聊天 API 契约 |
| `backend/tests/test_workflow.py` | history 进入 prompt |
| `frontend/src/api/chatSse.ts` | SSE 块解析 |
| `frontend/src/api/chat.ts` | `streamChat` / `loadChat` |
| `frontend/src/lib/utils.ts` | `cn()` |
| `frontend/src/components/ui/button.tsx` | shadcn Button |
| `frontend/src/components/ui/input.tsx` | shadcn Input |
| `frontend/src/components/ui/scroll-area.tsx` | shadcn ScrollArea |
| `frontend/src/components/chat/ChatPanel.tsx` | 右侧聊天 |
| `frontend/src/App.tsx` | 标题 + 场景 + ChatPanel |
| `frontend/e2e/scene.spec.ts` | 改为打聊天接口 |

---

### Task 1: SQLModel 表与测试库

**Files:**
- Create: `backend/app/models/__init__.py`
- Create: `backend/app/models/chat.py`
- Create: `backend/app/db.py`
- Create: `backend/tests/test_chat_models.py`
- Modify: `backend/requirements.txt`（追加 `sqlmodel>=0.0.22`、`psycopg[binary]>=3.2.0`）
- Modify: `backend/tests/conftest.py`
- Modify: `backend/app/main.py`（lifespan 调 `init_db`，失败不阻止 `/health`）

**Interfaces:**
- Produces: `Conversation`、`Message`、`get_engine()`、`get_session()`、`init_db()`、`HISTORY_LIMIT = 20`、`STORAGE_KEY` 不在后端

- [ ] **Step 1: Write the failing test**

`backend/tests/test_chat_models.py`:

```python
from sqlmodel import select

from app.db import get_session, init_db
from app.models.chat import Conversation, Message


def test_can_persist_conversation_and_message() -> None:
    init_db()
    with get_session() as session:
        conv = Conversation()
        session.add(conv)
        session.commit()
        session.refresh(conv)
        session.add(
            Message(
                conversation_id=conv.id,
                role="user",
                content="推荐防晒衣",
                products=None,
            )
        )
        session.commit()
        rows = session.exec(select(Message).where(Message.conversation_id == conv.id)).all()
        assert len(rows) == 1
        assert rows[0].content == "推荐防晒衣"
        assert conv.id is not None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_chat_models.py -v`

Expected: FAIL（`app.db` / `sqlmodel` 不存在）

- [ ] **Step 3: Write minimal implementation**

`backend/app/models/__init__.py` 可空。

`backend/app/models/chat.py`:

```python
# 阅读顺序:
# 1. Conversation — 一次导购会话
# 2. Message      — 一句话;助手消息可带当时的 products JSON
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Conversation(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)


class Message(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    conversation_id: uuid.UUID = Field(foreign_key="conversation.id", index=True)
    role: str
    content: str
    products: Optional[list[dict[str, Any]]] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=_utcnow)
```

`backend/app/db.py`:

```python
from __future__ import annotations

import os
from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.models import chat as _chat_models  # noqa: F401  注册表

HISTORY_LIMIT = 20

_engine = None


def get_database_url() -> str:
    return os.getenv("DATABASE_URL", "sqlite://")


def get_engine():
    global _engine
    if _engine is None:
        url = get_database_url()
        kwargs: dict = {}
        if url.startswith("sqlite"):
            kwargs["connect_args"] = {"check_same_thread": False}
            if url in {"sqlite://", "sqlite:///:memory:"}:
                kwargs["poolclass"] = StaticPool
        _engine = create_engine(url, **kwargs)
    return _engine


def reset_engine() -> None:
    global _engine
    _engine = None


def init_db() -> None:
    SQLModel.metadata.create_all(get_engine())


@contextmanager
def get_session() -> Iterator[Session]:
    session = Session(get_engine())
    try:
        yield session
    finally:
        session.close()
```

`backend/tests/conftest.py` 追加（保留原 LLM mock fixture）:

```python
import pytest

from app.db import init_db, reset_engine


@pytest.fixture(autouse=True)
def _sqlite_db(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "sqlite://")
    reset_engine()
    init_db()
```

`backend/app/main.py` 增加 lifespan：`startup` 调用 `init_db()`，包在 `try/except Exception` 里记日志但不让进程起不来（`/health` 仍 200）。需要 `logging.getLogger(__name__).exception`。

`requirements.txt` 追加两行依赖。

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_chat_models.py tests/test_health.py -v`

Expected: PASS；`/health` 仍 200

- [ ] **Step 5: Commit**

```bash
git add backend/app/models backend/app/db.py backend/app/main.py backend/tests/conftest.py backend/tests/test_chat_models.py backend/requirements.txt
git commit -m "feat: 添加导购会话 SQLModel 表与测试库"
```

---

### Task 2: 工作流 prompt 带上对话历史

**Files:**
- Modify: `backend/app/core/workflow.py`
- Modify: `backend/tests/test_workflow.py`

**Interfaces:**
- Consumes: 无 DB
- Produces: `HistoryTurn = TypedDict` 含 `role: str`、`content: str`；`run_recommendation(query: str, history: list[dict] | None = None)`；`stream_recommendation` 同样签名；`WorkflowState["history"]` 为 `list[dict]`

- [ ] **Step 1: Write the failing test**

在 `backend/tests/test_workflow.py` 追加：

```python
from app.core.workflow import generate_recommendation
from app.services import llm_client


class _Capture:
    def complete(self, prompt: str) -> str:
        self.prompt = prompt
        return "[mock] ok"


def test_generate_recommendation_includes_history(monkeypatch) -> None:
    cap = _Capture()
    monkeypatch.setattr(llm_client, "get_llm_client", lambda: cap)
    generate_recommendation(
        {
            "query": "再便宜点",
            "products": [{"name": "宽檐遮阳帽", "price": 89}],
            "recommendation": "",
            "history": [
                {"role": "user", "content": "推荐防晒衣"},
                {"role": "assistant", "content": "推荐轻薄防晒衣"},
            ],
        }
    )
    assert "推荐防晒衣" in cap.prompt
    assert "再便宜点" in cap.prompt
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest tests/test_workflow.py::test_generate_recommendation_includes_history -v`

Expected: FAIL（`history` KeyError 或 prompt 无历史）

- [ ] **Step 3: Write minimal implementation**

`WorkflowState` 增加 `history: list[dict]`。

`generate_recommendation` 拼 prompt：

```python
def _history_block(history: list[dict]) -> str:
    if not history:
        return ""
    lines = []
    for item in history:
        label = "用户" if item.get("role") == "user" else "导购"
        lines.append(f"{label}：{item.get('content', '')}")
    return "对话历史：\n" + "\n".join(lines) + "\n"


def generate_recommendation(state: WorkflowState) -> dict:
    client = get_llm_client()
    catalog = "、".join(f"{p['name']}(¥{p['price']})" for p in state["products"])
    prompt = (
        f"{_history_block(list(state.get('history') or []))}"
        f"用户需求：{state['query']}\n"
        f"候选商品：{catalog}\n"
        "请用一两句中文给出推荐理由。"
    )
    return {"recommendation": client.complete(prompt)}
```

`run_recommendation` / `stream_recommendation`：`invoke`/`stream` 的初始 state 含 `"history": history or []`。旧测试不传第二参，行为不变。

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_workflow.py tests/test_workflows_api.py -v`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/workflow.py backend/tests/test_workflow.py
git commit -m "feat: 推荐节点 prompt 纳入多轮对话历史"
```

---

### Task 3: 聊天 API（SSE + GET）

**Files:**
- Create: `backend/app/api/v1/chat.py`
- Create: `backend/tests/test_chat_api.py`
- Modify: `backend/app/main.py`（`include_router`）
- Modify: `backend/app/core/README.md`（补中文流程图：聊天入口）

**Interfaces:**
- Consumes: `init_db`、`get_session`、`HISTORY_LIMIT`、`Conversation`、`Message`、`stream_recommendation(query, history)`、`format_sse`
- Produces: `POST /api/v1/chat` body `{ message: str, conversation_id: UUID | null }`；SSE events 如上；`GET /api/v1/chat/{conversation_id}` 返回 `{ conversation_id, messages: [{role, content, products}] }`

- [ ] **Step 1: Write the failing tests**

`backend/tests/test_chat_api.py`（用 `TestClient`；解析 SSE 用按 `\n\n` 切块）：

```python
import json
import uuid

from fastapi.testclient import TestClient
from sqlmodel import select

from app.db import get_session
from app.main import app
from app.models.chat import Message
from app.services import llm_client

client = TestClient(app)


def _events(body: str) -> list[tuple[str, dict]]:
    out: list[tuple[str, dict]] = []
    event = "message"
    for block in body.split("\n\n"):
        if not block.strip():
            continue
        data = None
        name = event
        for line in block.splitlines():
            if line.startswith("event:"):
                name = line[len("event:") :].strip()
            elif line.startswith("data:"):
                data = json.loads(line[len("data:") :].strip())
        if data is not None:
            out.append((name, data))
    return out


def test_first_turn_sse_and_persists() -> None:
    with client.stream("POST", "/api/v1/chat", json={"message": "推荐防晒衣"}) as resp:
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers["content-type"]
        events = _events("".join(resp.iter_text()))
    names = [n for n, _ in events]
    assert names[:2] == ["session", "node"]
    assert names[-1] == "done"
    session_id = events[0][1]["conversation_id"]
    assert events[1][1]["retrieve_products"]["products"]
    rec_event = next(d for n, d in events if n == "node" and "generate_recommendation" in d)
    assert rec_event["generate_recommendation"]["recommendation"]
    with get_session() as s:
        rows = s.exec(select(Message).where(Message.conversation_id == uuid.UUID(session_id))).all()
        assert len(rows) == 2
        assert {r.role for r in rows} == {"user", "assistant"}


def test_follow_up_appends_messages() -> None:
    first = client.post("/api/v1/chat", json={"message": "推荐防晒衣"})
    cid = _events(first.text)[0][1]["conversation_id"]
    second = client.post("/api/v1/chat", json={"message": "再便宜点", "conversation_id": cid})
    assert second.status_code == 200
    with get_session() as s:
        rows = s.exec(select(Message).where(Message.conversation_id == uuid.UUID(cid))).all()
        assert len(rows) == 4


def test_unknown_conversation_404() -> None:
    resp = client.post(
        "/api/v1/chat",
        json={"message": "推荐防晒衣", "conversation_id": str(uuid.uuid4())},
    )
    assert resp.status_code == 404


def test_empty_message_422() -> None:
    resp = client.post("/api/v1/chat", json={"message": ""})
    assert resp.status_code == 422


def test_get_history() -> None:
    stream = client.post("/api/v1/chat", json={"message": "推荐防晒衣"})
    cid = _events(stream.text)[0][1]["conversation_id"]
    resp = client.get(f"/api/v1/chat/{cid}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["conversation_id"] == cid
    assert body["messages"][0]["role"] == "user"
    assert body["messages"][-1]["products"]


def test_llm_error_emits_error_no_assistant(monkeypatch) -> None:
    class Boom:
        def complete(self, prompt: str) -> str:
            raise RuntimeError("Insufficient Balance")

    monkeypatch.setattr(llm_client, "get_llm_client", lambda: Boom())
    with client.stream("POST", "/api/v1/chat", json={"message": "推荐防晒衣"}) as resp:
        events = _events("".join(resp.iter_text()))
    names = [n for n, _ in events]
    assert "error" in names
    assert names[-1] == "done"
    cid = events[0][1]["conversation_id"]
    with get_session() as s:
        rows = s.exec(select(Message).where(Message.conversation_id == uuid.UUID(cid))).all()
        assert [r.role for r in rows] == ["user"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_chat_api.py -v`

Expected: FAIL 404 on `/api/v1/chat`

- [ ] **Step 3: Write minimal implementation**

`backend/app/api/v1/chat.py` 要点：

- `ChatRequest`: `message: str = Field(min_length=1, max_length=500)`，`conversation_id: UUID | None = None`
- POST：`try` 开 session；找不到会话 → `HTTPException(404)`；DB 异常 → `HTTPException(503, detail="暂时连不上，请稍后")`
- 新建或加载 `Conversation`，写入 user `Message`，`updated_at` 刷新
- 查最近 `HISTORY_LIMIT` 条 **已有** 消息（不含刚写入的当前 user？应含当前 user 之前的轮次）。实现：写入当前 user 之后，查询该会话全部 messages 按时间排序，history = 除最后一条 user 外的最近 20 条（即上一轮及更早）。更简单：history = 写入前查出的最后 20 条。
- `StreamingResponse`：先 `yield format_sse({"conversation_id": str(conv.id)}, event="session")`；再 `for update in stream_recommendation(message, history)` yield `event=node`；成功则写 assistant（content=recommendation，products=retrieve 列表）；`except Exception` yield `event=error` `{message: str(exc)}` 不写 assistant；最后 `event=done`
- GET：无会话 404；返回按 `created_at` 升序的 messages

`main.py`: `from app.api.v1.chat import router as chat_router` 然后 `app.include_router(chat_router)`。

更新 `backend/app/core/README.md` 阅读路径第 6 条 `chat.py`，并加一张中文 Mermaid（用户发话 → 落库 → SSE session → 挑货 → 写推荐 → done）。

注意：`TestClient` 非 stream 的 `client.post` 会缓冲完整 SSE 文本到 `.text`，测试里 `test_follow_up` / `test_get_history` 可以这样用。

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest --cov=app --cov-fail-under=80 -q`

Expected: 全绿，覆盖率 ≥ 80%

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/v1/chat.py backend/app/main.py backend/tests/test_chat_api.py backend/app/core/README.md
git commit -m "feat: 添加导购聊天 API（Postgres 会话与按节点 SSE）"
```

---

### Task 4: 前端 SSE 解析纯函数

**Files:**
- Create: `frontend/src/api/chatSse.ts`
- Create: `frontend/src/api/chatSse.test.ts`

**Interfaces:**
- Produces:

```ts
export type ChatProduct = { id: string; name: string; price: number; category: string };
export type ChatSseEvent =
  | { event: "session"; data: { conversation_id: string } }
  | { event: "node"; data: Record<string, unknown> }
  | { event: "error"; data: { message: string } }
  | { event: "done"; data: { done: boolean } };

export function parseSseBlock(block: string): ChatSseEvent | null;
export function splitSseBlocks(buffer: string): { events: ChatSseEvent[]; rest: string };
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";

import { parseSseBlock, splitSseBlocks } from "./chatSse";

describe("parseSseBlock", () => {
  it("parses session event", () => {
    const ev = parseSseBlock('event: session\ndata: {"conversation_id":"abc"}');
    expect(ev).toEqual({ event: "session", data: { conversation_id: "abc" } });
  });
});

describe("splitSseBlocks", () => {
  it("yields complete blocks and keeps tail", () => {
    const { events, rest } = splitSseBlocks(
      'event: session\ndata: {"conversation_id":"abc"}\n\nevent: node\ndata: {',
    );
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe("session");
    expect(rest.startsWith("event: node")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/api/chatSse.test.ts`

Expected: FAIL 模块不存在

- [ ] **Step 3: Write minimal implementation**

`parseSseBlock`：逐行读 `event:` / `data:`，`JSON.parse` data；缺 data 返回 `null`。  
`splitSseBlocks`：按 `\n\n` split，最后一段若原 buffer 不以 `\n\n` 结尾则留在 `rest`。

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/api/chatSse.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/chatSse.ts frontend/src/api/chatSse.test.ts
git commit -m "feat: 解析导购聊天 SSE 事件块"
```

---

### Task 5: Tailwind 与 shadcn 基础组件

**Files:**
- Create: `frontend/postcss.config.js`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/src/components/ui/button.tsx`
- Create: `frontend/src/components/ui/input.tsx`
- Create: `frontend/src/components/ui/scroll-area.tsx`
- Create: `frontend/src/lib/utils.test.ts`（只测 `cn` 合并 class）
- Modify: `frontend/src/index.css`（文件顶部加 `@tailwind` 三行，保留现有布局 CSS）
- Modify: `frontend/package.json`（依赖见 Step 3）
- Modify: `frontend/tsconfig.app.json`（`compilerOptions.baseUrl`: `"."`，`paths`: `{ "@/*": ["./src/*"] }`）
- Modify: `frontend/tsconfig.json` 同样增加 `paths`（给 tsc -b 用）
- Modify: `frontend/vite.config.ts`（`resolve.alias`: `"@"` → `./src`）

**Interfaces:**
- Produces: `cn(...inputs: ClassValue[]): string`；`Button`、`Input`、`ScrollArea` 可被 ChatPanel import

- [ ] **Step 1: Write the failing test**

`frontend/src/lib/utils.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("merges tailwind classes", () => {
    expect(cn("p-2", "p-4")).toContain("p-4");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/lib/utils.test.ts`

Expected: FAIL

- [ ] **Step 3: Install deps and implement**

```bash
cd frontend
npm install clsx tailwind-merge class-variance-authority @radix-ui/react-slot @radix-ui/react-scroll-area
npm install -D tailwindcss@3 postcss autoprefixer
```

`utils.ts`：

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

`button.tsx`：

```tsx
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-blue-500 text-white hover:bg-blue-600",
      },
      size: {
        default: "h-9 px-4 py-2",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> &
    VariantProps<typeof buttonVariants> & { asChild?: boolean }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";
```

`input.tsx`：

```tsx
import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => (
    <input
      className={cn(
        "flex h-9 w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-1 text-sm text-slate-100",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";
```

`scroll-area.tsx`：

```tsx
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import * as React from "react";

import { cn } from "@/lib/utils";

export const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root ref={ref} className={cn("relative overflow-hidden", className)} {...props}>
    <ScrollAreaPrimitive.Viewport className="h-full w-full">{children}</ScrollAreaPrimitive.Viewport>
    <ScrollAreaPrimitive.Scrollbar
      orientation="vertical"
      className="flex w-2.5 touch-none select-none p-px"
    >
      <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-slate-500" />
    </ScrollAreaPrimitive.Scrollbar>
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = "ScrollArea";
```

`vite.config.ts` 的 `defineConfig` 增加：

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": path.resolve(rootDir, "src") } },
  // ...existing plugins/server/test
});
```

`index.css` 第一行起：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`tailwind.config.js`：

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
```

- [ ] **Step 4: Run test and existing frontend tests**

Run: `cd frontend && npx vitest run`

Expected: PASS（含旧 App 测试；本任务不要改 App）

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/postcss.config.js frontend/tailwind.config.js frontend/src/lib frontend/src/components/ui frontend/src/index.css frontend/vite.config.ts frontend/tsconfig.json frontend/tsconfig.app.json
git commit -m "feat: 引入 Tailwind 与 shadcn 基础控件"
```

---

### Task 6: ChatPanel 与首页布局

**Files:**
- Create: `frontend/src/api/chat.ts`
- Create: `frontend/src/api/chat.test.ts`
- Create: `frontend/src/components/chat/ChatPanel.tsx`
- Create: `frontend/src/components/chat/ChatPanel.test.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/App.test.tsx`
- Modify: `frontend/src/index.css`（`.app-body` 横排：左侧 `.scene-canvas` flex 1，右侧 `.chat-dock` 宽 22rem）

**Interfaces:**
- Consumes: `parseSseBlock` / `splitSseBlocks`；`Button` `Input` `ScrollArea`；`highlightCategories`
- Produces:

```ts
export const CONVERSATION_STORAGE_KEY = "workbench.conversation_id";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  products: ChatProduct[] | null;
};

export async function loadChat(conversationId: string): Promise<{
  conversation_id: string;
  messages: ChatMessage[];
}>;

export async function streamChat(
  message: string,
  conversationId: string | null,
  onEvent: (ev: ChatSseEvent) => void,
): Promise<void>;
```

`ChatPanel` props：

```ts
type ChatPanelProps = {
  onProducts: (products: { category: string }[]) => void;
  onStatus: (text: string) => void;
};
```

- [ ] **Step 1: Write the failing tests**

`chat.test.ts`：mock `fetch`；`streamChat` 喂一段完整 SSE，断言 `onEvent` 依次收到 session/node/done，并把 id 写入 `localStorage`。

`ChatPanel.test.tsx`：mock `./api/chat` 的 `streamChat` 在调用时触发 `onEvent`：session、retrieve_products（外套）、generate_recommendation（含「轻薄防晒衣」）、done；render ChatPanel；`getByPlaceholderText` 填「推荐防晒衣」；点「发送」；`findByText(/轻薄防晒衣/)`；`onProducts` 被调用。

`App.test.tsx` 改为：不再点「查询」；mock `ChatPanel` 为按钮，点击时调用 `onProducts`/`onStatus`；或直接测标题存在 + `ChatPanel` mock 后 `role=status`。删除对 `executeWorkflow` 和「查询」按钮的用例。保留标题用例。新增：ChatPanel 的 `onProducts` 会让 status 含「外套」（通过 mock ChatPanel 暴露 test id 按钮）。

更干净的做法：`App.test.tsx` mock `ChatPanel`：

```tsx
vi.mock("./components/chat/ChatPanel", () => ({
  ChatPanel: ({ onProducts, onStatus }: { onProducts: (p: { category: string }[]) => void; onStatus: (t: string) => void }) => (
    <button
      type="button"
      onClick={() => {
        onProducts([{ category: "外套" }]);
        onStatus("已高亮: 外套");
      }}
    >
      模拟点亮
    </button>
  ),
}));
```

断言点击后 `getByRole("status")` 含「外套」。无「查询」按钮。

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/App.test.tsx src/api/chat.test.ts src/components/chat/ChatPanel.test.tsx`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`chat.ts`：`API_URL` 与 `workflows.ts` 相同（`import.meta.env.VITE_API_URL ?? ""` 去尾斜杠）。  
`loadChat`: `GET ${API_URL}/api/v1/chat/${id}`，404 throw 带 status。  
`streamChat`: `POST ${API_URL}/api/v1/chat` JSON `{ message, conversation_id }`，`reader` 循环 `splitSseBlocks`，session 时 `localStorage.setItem(CONVERSATION_STORAGE_KEY, id)`。

`ChatPanel.tsx`：

- state: `messages`、`draft`、`loading`、`hint`（正在挑货/正在写推荐）
- mount: 读 localStorage，`loadChat`；404 则 `removeItem` 并 `onStatus("会话不存在，已开新对话")`
- 提交：trim 空则 return；乐观追加 user 气泡；`streamChat`；node retrieve → `onProducts` + `onStatus("已高亮: …")`；node recommendation → 追加 assistant 气泡；error → 气泡或 hint 显示 message；503/网络 → `onStatus("暂时连不上，请稍后")`
- 顶部 `role="status"` 由 App 渲染，ChatPanel 只回调 `onStatus`
- 输入 placeholder：`例如：推荐防晒衣`；按钮名：`发送`
- ScrollArea 包气泡列表

`App.tsx`：去掉 form；`<header>` 只留 `h1` + `<p role="status">`；`<div className="app-body">` 内 `ProductScene` + `ChatPanel`。

空消息不发（ChatPanel 内 trim）。

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run && npm run lint`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/api/chat.ts frontend/src/api/chat.test.ts frontend/src/components/chat frontend/src/App.tsx frontend/src/App.test.tsx frontend/src/index.css
git commit -m "feat: 首页右侧导购聊天并点亮 3D 品类"
```

---

### Task 7: Playwright 与文档

**Files:**
- Modify: `frontend/e2e/scene.spec.ts`
- Modify: `README.md`（聊天 API 示例、本地需 Postgres/`DATABASE_URL`）
- Modify: `docs/deployment.md`（Railway 需挂 Postgres，人类操作）
- Modify: `standards/01-requirements.md`（US-5 状态 `In Progress`，注明 AC2 下一 PR）
- Modify: `standards/PROGRESS.md`（当前步骤、GOTCHA：测试用 SQLite StaticPool）
- Modify: `standards/00-project-context.md` 若目录地图缺 `models/chat.py` / `api/v1/chat.py` 则补上

**Interfaces:**
- Consumes: 页面按钮「发送」、placeholder、`role=status`、SSE 契约

- [ ] **Step 1: Write the failing e2e**

替换 `scene.spec.ts`：

```ts
import { expect, test } from "@playwright/test";

test("chat recommends and highlights categories", async ({ page }) => {
  await page.route("**/api/v1/chat", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    const body = [
      'event: session',
      'data: {"conversation_id":"00000000-0000-0000-0000-000000000001"}',
      "",
      "event: node",
      'data: {"retrieve_products":{"products":[{"id":"p1","name":"轻薄防晒衣","price":199,"category":"外套"}]}}',
      "",
      "event: node",
      'data: {"generate_recommendation":{"recommendation":"推荐轻薄防晒衣"}}',
      "",
      "event: done",
      'data: {"done":true}',
      "",
    ].join("\n");
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body,
    });
  });

  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.getByText("外套", { exact: true })).toBeVisible();
  await page.getByPlaceholder("例如：推荐防晒衣").fill("推荐防晒衣");
  await page.getByRole("button", { name: "发送" }).click();
  await expect(page.getByText("推荐轻薄防晒衣")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("外套");
});
```

- [ ] **Step 2: Run e2e to verify it fails**（若 Task 6 已接线则会过；若先红再改 route 文本）

Run: `cd frontend && npx playwright test e2e/scene.spec.ts`

Expected: 在 Task 6 完成后应为 PASS；若旧 spec 仍点「查询」会 FAIL——本任务就是换成发送。

- [ ] **Step 3: Update docs as listed in Files**

README 增加：

```bash
curl -N -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"推荐防晒衣\"}"
```

（端口按当前 README 后端端口写，不要发明第二套端口。）写明本地聊天需要 `DATABASE_URL` 指向 Postgres；pytest 不需要。Railway 控制台需自行加 Postgres 插件。

- [ ] **Step 4: Run full local gates**

```bash
cd backend && ruff format --check . && ruff check . && python -m pytest --cov=app --cov-fail-under=80
cd frontend && npm run lint && npm run format:check && npm test && npx playwright test
```

Expected: 全绿

- [ ] **Step 5: Commit**

```bash
git add frontend/e2e/scene.spec.ts README.md docs/deployment.md standards/01-requirements.md standards/PROGRESS.md standards/00-project-context.md
git commit -m "test: 用聊天 SSE 冒烟 3D 点亮并更新 US-5 文档"
```

---

## 实现后自检（对照 spec）

| Spec 节 | 任务 |
|---|---|
| 右侧聊天 + 去查询条 | Task 6 |
| 回复即点亮 | Task 6 `onProducts` |
| Postgres 会话 + SQLite 测 | Task 1、3 |
| SSE 顺序 / error / GET | Task 3、4 |
| history 10 轮 | Task 2、3 `HISTORY_LIMIT` |
| shadcn Button/Input/ScrollArea | Task 5 |
| Playwright mock chat | Task 7 |
| 不做 RAG / 不改 execute 契约 | 全局约束 |
