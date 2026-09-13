import json
import uuid

from fastapi.testclient import TestClient
from sqlmodel import select

from app.core import workflow as workflow_mod
from app.db import get_session
from app.main import app
from app.models.chat import Message

client = TestClient(app)


def _events(body: str) -> list[tuple[str, dict]]:
    out: list[tuple[str, dict]] = []
    for block in body.split("\n\n"):
        if not block.strip():
            continue
        data = None
        name = "message"
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

    monkeypatch.setattr(workflow_mod, "get_llm_client", lambda: Boom())
    with client.stream("POST", "/api/v1/chat", json={"message": "推荐防晒衣"}) as resp:
        events = _events("".join(resp.iter_text()))
    names = [n for n, _ in events]
    assert "error" in names
    assert names[-1] == "done"
    cid = events[0][1]["conversation_id"]
    with get_session() as s:
        rows = s.exec(select(Message).where(Message.conversation_id == uuid.UUID(cid))).all()
        assert [r.role for r in rows] == ["user"]
