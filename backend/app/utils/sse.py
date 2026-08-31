from __future__ import annotations

import json
from collections.abc import Iterator
from typing import Any


def format_sse(data: Any, event: str | None = None) -> str:
    payload = json.dumps(data, ensure_ascii=False)
    lines: list[str] = []
    if event:
        lines.append(f"event: {event}")
    lines.append(f"data: {payload}")
    lines.append("")
    return "\n".join(lines) + "\n"


def iter_sse(events: Iterator[tuple[str, Any]]) -> Iterator[str]:
    for event, data in events:
        yield format_sse(data, event=event)
