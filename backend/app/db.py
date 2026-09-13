from __future__ import annotations

import os
from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.models import chat as _chat_models  # noqa: F401  注册表

HISTORY_LIMIT = 20

_engine = None


def get_database_url() -> str:
    return os.getenv("DATABASE_URL", "sqlite://")


def get_engine():
    global _engine
    if _engine is None:
        url = get_database_url()
        kwargs: dict = {}
        if url.startswith("sqlite"):
            kwargs["connect_args"] = {"check_same_thread": False}
            if url in {"sqlite://", "sqlite:///:memory:"}:
                kwargs["poolclass"] = StaticPool
        _engine = create_engine(url, **kwargs)
    return _engine


def reset_engine() -> None:
    global _engine
    _engine = None


def init_db() -> None:
    SQLModel.metadata.create_all(get_engine())


@contextmanager
def get_session() -> Iterator[Session]:
    session = Session(get_engine())
    try:
        yield session
    finally:
        session.close()
