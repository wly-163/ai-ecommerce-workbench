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
