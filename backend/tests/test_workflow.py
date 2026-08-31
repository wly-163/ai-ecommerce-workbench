from app.core.workflow import run_recommendation


def test_run_recommendation_returns_query_and_text(monkeypatch) -> None:
    monkeypatch.setenv("LLM_MODE", "mock")
    result = run_recommendation("推荐防晒衣")
    assert result["query"] == "推荐防晒衣"
    assert "recommendation" in result
    assert len(result["recommendation"]) > 0
    assert isinstance(result["products"], list)
    assert len(result["products"]) >= 1
