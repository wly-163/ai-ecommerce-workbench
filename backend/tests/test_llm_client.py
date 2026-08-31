from app.services.llm_client import get_llm_client


def test_mock_llm_returns_non_empty_text(monkeypatch) -> None:
    monkeypatch.setenv("LLM_MODE", "mock")
    client = get_llm_client()
    text = client.complete("推荐防晒衣")
    assert isinstance(text, str)
    assert len(text) > 0
