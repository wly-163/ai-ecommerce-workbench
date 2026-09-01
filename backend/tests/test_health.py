from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_returns_ok() -> None:
    """探活只保证进程起来,不依赖数据库或 LLM。"""
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
