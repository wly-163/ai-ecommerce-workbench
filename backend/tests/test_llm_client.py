import pytest

from app.services.llm_client import get_llm_client


def test_mock_llm_returns_non_empty_text() -> None:
    """conftest 已强制 mock,这里确认假写手能吐出非空中文。"""
    client = get_llm_client()
    text = client.complete("推荐防晒衣")
    assert isinstance(text, str)
    assert len(text) > 0
    assert type(client).__name__ == "MockLLMClient"


def test_live_mode_builds_live_client(monkeypatch) -> None:
    """只验证能构造 LiveLLMClient,不调用 complete,避免单测出网。"""
    monkeypatch.setenv("LLM_MODE", "live")
    monkeypatch.setenv("DEEPSEEK_API_KEY", "sk-test")
    client = get_llm_client()
    assert type(client).__name__ == "LiveLLMClient"


def test_live_mode_without_key_raises(monkeypatch) -> None:
    """live 却没 Key 必须立刻失败,不能默默退回 mock 让人误以为接上了模型。"""
    monkeypatch.setenv("LLM_MODE", "live")
    monkeypatch.delenv("DEEPSEEK_API_KEY", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    with pytest.raises(RuntimeError, match="DEEPSEEK_API_KEY"):
        get_llm_client()


def test_unset_mode_uses_live_when_key_present(monkeypatch) -> None:
    """未写 LLM_MODE 但有 Key 时走 live,避免配了密钥仍默认 mock。"""
    monkeypatch.delenv("LLM_MODE", raising=False)
    monkeypatch.setenv("DEEPSEEK_API_KEY", "sk-test")
    client = get_llm_client()
    assert type(client).__name__ == "LiveLLMClient"
