from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_execute_returns_recommendation() -> None:
    """非流式:HTTP 200 + JSON 含 query/products/recommendation。"""
    resp = client.post("/api/v1/workflows/execute", json={"query": "推荐防晒衣"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["query"] == "推荐防晒衣"
    assert data["recommendation"]
    assert len(data["products"]) >= 1


def test_execute_sse_stream() -> None:
    """stream=true 时 Content-Type 必须是 SSE,响应体含 data: 行。"""
    with client.stream(
        "POST",
        "/api/v1/workflows/execute",
        json={"query": "推荐防晒衣", "stream": True},
    ) as resp:
        assert resp.status_code == 200
        assert "text/event-stream" in resp.headers["content-type"]
        body = "".join(resp.iter_text())
        assert "data:" in body
