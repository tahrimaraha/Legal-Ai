"""In-app notifications. Other services call `notify` inside their own
transaction; the row commits together with the event that caused it."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.moderation import Notification
from app.models.user import User
from app.schemas.notifications import NotificationOut
from app.services.mappers import iso


def notify(
    db: AsyncSession, user_id: uuid.UUID, type_: str, *,
    title_bn: str, title_en: str, body_bn: str, body_en: str, link: str,
) -> None:
    db.add(Notification(
        user_id=user_id, type=type_, title_bn=title_bn, title_en=title_en,
        body_bn=body_bn, body_en=body_en, deep_link=link,
    ))


async def list_notifications(db: AsyncSession, user: User) -> list[NotificationOut]:
    rows = await db.scalars(
        select(Notification).where(Notification.user_id == user.id).order_by(Notification.created_at.desc())
    )
    return [
        NotificationOut(
            id=str(n.id), user_id=str(n.user_id), type=n.type,
            title_bn=n.title_bn, title_en=n.title_en, body_bn=n.body_bn, body_en=n.body_en,
            link=n.deep_link or "", is_read=n.is_read, created_at=iso(n.created_at),
        )
        for n in rows
    ]


async def mark_all_read(db: AsyncSession, user: User) -> None:
    await db.execute(
        update(Notification)
        .where(Notification.user_id == user.id, Notification.is_read.is_(False))
        .values(is_read=True, read_at=datetime.now(timezone.utc))
    )
    await db.commit()
