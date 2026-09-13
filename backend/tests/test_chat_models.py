from sqlmodel import select

from app.db import get_session, init_db
from app.models.chat import Conversation, Message


def test_can_persist_conversation_and_message() -> None:
    init_db()
    with get_session() as session:
        conv = Conversation()
        session.add(conv)
        session.commit()
        session.refresh(conv)
        session.add(
            Message(
                conversation_id=conv.id,
                role="user",
                content="推荐防晒衣",
                products=None,
            )
        )
        session.commit()
        rows = session.exec(select(Message).where(Message.conversation_id == conv.id)).all()
        assert len(rows) == 1
        assert rows[0].content == "推荐防晒衣"
        assert conv.id is not None
