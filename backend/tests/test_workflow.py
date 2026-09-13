from app.core import workflow as workflow_mod
from app.core.workflow import generate_recommendation, run_recommendation


def test_run_recommendation_returns_query_and_text() -> None:
    """整图跑通后必须带回查询词、至少一件货、非空推荐语。"""
    result = run_recommendation("推荐防晒衣")
    assert result["query"] == "推荐防晒衣"
    assert "recommendation" in result
    assert len(result["recommendation"]) > 0
    assert isinstance(result["products"], list)
    assert len(result["products"]) >= 1


class _Capture:
    def complete(self, prompt: str) -> str:
        self.prompt = prompt
        return "[mock] ok"


def test_generate_recommendation_includes_history(monkeypatch) -> None:
    cap = _Capture()
    monkeypatch.setattr(workflow_mod, "get_llm_client", lambda: cap)
    generate_recommendation(
        {
            "query": "再便宜点",
            "products": [{"name": "宽檐遮阳帽", "price": 89}],
            "recommendation": "",
            "history": [
                {"role": "user", "content": "推荐防晒衣"},
                {"role": "assistant", "content": "推荐轻薄防晒衣"},
            ],
        }
    )
    assert "推荐防晒衣" in cap.prompt
    assert "再便宜点" in cap.prompt
