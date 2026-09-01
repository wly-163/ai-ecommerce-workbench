# 阅读顺序:
# 1. ExecuteRequest     — 请求体(query + 是否流式)
# 2. execute_workflow   — 路由入口: 非流式 JSON / 流式 SSE
# 3. (下游) app.core.workflow.run_recommendation / stream_recommendation
#
# 全链路流程图: backend/app/core/README.md

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
    """统一入口: stream=false 返回完整 JSON; true 则按节点推 SSE。"""
    if not body.stream:
        return run_recommendation(body.query)

    def event_gen():
        for update in stream_recommendation(body.query):
            yield format_sse(update, event="node")
        # 显式 done,方便前端结束 EventSource / fetch reader
        yield format_sse({"done": True}, event="done")

    return StreamingResponse(event_gen(), media_type="text/event-stream")
