# 阅读顺序:
# 1. ExecuteRequest     — 请求体:用户一句话 + 要不要流式
# 2. execute_workflow   — 唯一 HTTP 入口,按 stream 分成两条返回路径
# 3. 下游               — run_recommendation(整图 JSON) / stream_recommendation(按节点 SSE)
#
# 本文件不包含业务:不挑货、不调 LLM,只负责协议(JSON vs SSE)。
# 全链路流程图: backend/app/core/README.md

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.core.workflow import run_recommendation, stream_recommendation
from app.utils.sse import format_sse

router = APIRouter(prefix="/api/v1/workflows", tags=["workflows"])


class ExecuteRequest(BaseModel):
    """POST /execute 的 JSON 体。query 太短/太长直接 422,避免空跑 LangGraph。"""

    query: str = Field(min_length=1, max_length=500)
    stream: bool = False  # false=等整张图跑完再返回;true=每个节点结束就推一条 SSE


@router.post("/execute")
def execute_workflow(body: ExecuteRequest):
    """统一入口: stream=false 返回完整 JSON; true 则按节点推 SSE。"""
    if not body.stream:
        # 同步路径:前端拿一份 {query, products, recommendation} 即可,适合 Postman /docs 试接口
        return run_recommendation(body.query)

    def event_gen():
        # 流式路径:每个节点交出自己改过的那一格状态,包成 SSE 推给前端
        for update in stream_recommendation(body.query):
            yield format_sse(update, event="node")
        # 显式 done,方便前端结束 EventSource / fetch reader;不能只靠连接断开
        yield format_sse({"done": True}, event="done")

    return StreamingResponse(event_gen(), media_type="text/event-stream")
