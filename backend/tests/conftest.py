import pytest

from app.db import init_db, reset_engine


@pytest.fixture(autouse=True)
def _default_mock_llm(monkeypatch) -> None:
    """每个用例默认 LLM_MODE=mock。

    本地 .env 已是 live,若单测不强制 mock,pytest 会真的打 DeepSeek、烧额度还不稳定。
    需要测 live 构造的用例再自己 monkeypatch 覆盖。
    """
    monkeypatch.setenv("LLM_MODE", "mock")


@pytest.fixture(autouse=True)
def _sqlite_db(monkeypatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "sqlite://")
    reset_engine()
    init_db()
