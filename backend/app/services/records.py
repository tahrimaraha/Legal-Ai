"""Storage helpers for `AppRecord` plus access checks and notifications."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.core.exceptions import NotFoundError
from app.models.app_record import AppRecord
from app.models.enums import UserRole
from app.models.user import User


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def parse_uuid(value: Any) -> Optional[uuid.UUID]:
    try:
        return uuid.UUID(str(value))
    except (TypeError, ValueError):
        return None


def out(rec: AppRecord) -> dict:
    data = dict(rec.data)
    data["id"] = str(rec.id)
    return data


async def create(
    db: AsyncSession,
    kind: str,
    data: dict,
    owner_id: Optional[uuid.UUID] = None,
    lawyer_id: Optional[uuid.UUID] = None,
) -> AppRecord:
    rec = AppRecord(id=uuid.uuid4(), kind=kind, owner_id=owner_id, lawyer_id=lawyer_id)
    rec.data = {**data, "id": str(rec.id)}
    db.add(rec)
    await db.flush()
    return rec


def save(rec: AppRecord, data: dict) -> None:
    rec.data = dict(data)
    flag_modified(rec, "data")


def not_found(what: str = "Item") -> NotFoundError:
    return NotFoundError(f"{what} not found.", "তথ্যটি পাওয়া যায়নি।")


async def get(db: AsyncSession, kind: str, record_id: Any) -> AppRecord:
    rid = parse_uuid(record_id)
    rec = await db.get(AppRecord, rid) if rid else None
    if rec is None or rec.kind != kind:
        raise not_found()
    return rec


def can_access(rec: AppRecord, user: User) -> bool:
    return user.role == UserRole.ADMIN or user.id in (rec.owner_id, rec.lawyer_id)


async def get_for(db: AsyncSession, kind: str, record_id: Any, user: User) -> AppRecord:
    """Fetch a record the user may see; anything else is reported as not found (no existence leak)."""
    rec = await get(db, kind, record_id)
    if not can_access(rec, user):
        raise not_found()
    return rec


async def list_for(db: AsyncSession, kind: str, user: User) -> list[AppRecord]:
    """Admins see everything, lawyers what is shared with them, everyone else what they own."""
    stmt = select(AppRecord).where(AppRecord.kind == kind)
    if user.role == UserRole.LAWYER:
        stmt = stmt.where(AppRecord.lawyer_id == user.id)
    elif user.role != UserRole.ADMIN:
        stmt = stmt.where(AppRecord.owner_id == user.id)
    stmt = stmt.order_by(AppRecord.created_at.desc())
    return list((await db.scalars(stmt)).all())


async def list_kind(db: AsyncSession, kind: str) -> list[AppRecord]:
    stmt = select(AppRecord).where(AppRecord.kind == kind).order_by(AppRecord.created_at.desc())
    return list((await db.scalars(stmt)).all())


async def notify(
    db: AsyncSession,
    user_id: Optional[uuid.UUID],
    ntype: str,
    title_en: str,
    title_bn: str,
    body_en: str,
    body_bn: str,
    link: str,
) -> Optional[AppRecord]:
    if user_id is None:
        return None
    return await create(
        db,
        "notification",
        {
            "userId": str(user_id),
            "type": ntype,
            "titleEn": title_en,
            "titleBn": title_bn,
            "bodyEn": body_en,
            "bodyBn": body_bn,
            "link": link,
            "isRead": False,
            "createdAt": now_iso(),
        },
        owner_id=user_id,
    )


async def notify_admins(db: AsyncSession, *args: str) -> None:
    admin_ids = (await db.scalars(select(User.id).where(User.role == UserRole.ADMIN, User.deleted_at.is_(None)))).all()
    for admin_id in admin_ids:
        await notify(db, admin_id, *args)
