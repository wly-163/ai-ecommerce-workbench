# 阅读顺序:
# 1. format_sse — 把任意 JSON 变成一条 SSE 文本(event + data + 空行)
# 2. iter_sse   — 给「事件名+数据」序列做同样的包装(当前路由没用到,留给复用)
#
# SSE 约定:每条消息以空行结束。少一个换行,浏览器 EventSource 会一直等下一条。

from __future__ import annotations

import json
from collections.abc import Iterator
from typing import Any


def format_sse(data: Any, event: str | None = None) -> str:
    """编码一条 SSE。ensure_ascii=False 是为了推荐中文不要被转成 \\uXXXX。"""
    payload = json.dumps(data, ensure_ascii=False)
    lines: list[str] = []
    if event:
        lines.append(f"event: {event}")
    lines.append(f"data: {payload}")
    lines.append("")  # 协议要求的消息分隔空行
    return "\n".join(lines) + "\n"


def iter_sse(events: Iterator[tuple[str, Any]]) -> Iterator[str]:
    for event, data in events:
        yield format_sse(data, event=event)
