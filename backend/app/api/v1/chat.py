# 阅读顺序:
# 1. ChatRequest          — 一句话 + 可选会话 ID
# 2. _history_for         — 写入当前 user 之前的近 20 条
# 3. post_chat            — SSE: session → 节点 → done
# 4. get_chat             — 刷新后续历史气泡
from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.exc import SQLAlchemyError
from sqlmodel import select

from app.core.workflow import stream_recommendation
from app.db import HISTORY_LIMIT, get_session
from app.models.chat import Conversation, Message
from app.utils.sse import format_sse

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=500)
    conversation_id: UUID | None = None


def _history_for(session, conv_id: UUID) -> list[dict]:
    rows = session.exec(
        select(Message)
        .where(Message.conversation_id == conv_id)
        .order_by(Message.created_at.desc())
        .limit(HISTORY_LIMIT)
    ).all()
    rows = list(reversed(rows))
    return [{"role": row.role, "content": row.content} for row in rows]


@router.post("")
def post_chat(body: ChatRequest):
    try:
        with get_session() as session:
            if body.conversation_id is None:
                conv = Conversation()
                session.add(conv)
                session.commit()
                session.refresh(conv)
            else:
                conv = session.get(Conversation, body.conversation_id)
                if conv is None:
                    raise HTTPException(status_code=404, detail="会话不存在")
            history = _history_for(session, conv.id)
            session.add(
                Message(
                    conversation_id=conv.id,
                    role="user",
                    content=body.message,
                    products=None,
                )
            )
            conv.updated_at = datetime.now(UTC)
            session.add(conv)
            session.commit()
            conv_id = conv.id
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail="暂时连不上，请稍后") from exc

    def event_gen():
        yield format_sse({"conversation_id": str(conv_id)}, event="session")
        products: list[dict] = []
        recommendation = ""
        try:
            for update in stream_recommendation(body.message, history):
                yield format_sse(update, event="node")
                if "retrieve_products" in update:
                    products = list(update["retrieve_products"].get("products") or [])
                if "generate_recommendation" in update:
                    recommendation = str(
                        update["generate_recommendation"].get("recommendation") or ""
                    )
            with get_session() as session:
                session.add(
                    Message(
                        conversation_id=conv_id,
                        role="assistant",
                        content=recommendation,
                        products=products,
                    )
                )
                conv_row = session.get(Conversation, conv_id)
                if conv_row is not None:
                    conv_row.updated_at = datetime.now(UTC)
                    session.add(conv_row)
                session.commit()
        except Exception as exc:
            yield format_sse({"message": str(exc)}, event="error")
        yield format_sse({"done": True}, event="done")

    return StreamingResponse(event_gen(), media_type="text/event-stream")


@router.get("/{conversation_id}")
def get_chat(conversation_id: UUID):
    try:
        with get_session() as session:
            conv = session.get(Conversation, conversation_id)
            if conv is None:
                raise HTTPException(status_code=404, detail="会话不存在")
            rows = session.exec(
                select(Message)
                .where(Message.conversation_id == conversation_id)
                .order_by(Message.created_at)
            ).all()
            return {
                "conversation_id": str(conv.id),
                "messages": [
                    {"role": row.role, "content": row.content, "products": row.products}
                    for row in rows
                ],
            }
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail="暂时连不上，请稍后") from exc
