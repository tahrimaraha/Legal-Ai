"""`/documents/*` and `/notifications/*` — data private to the signed-in user."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.database import get_db
from app.models.app_record import AppRecord
from app.models.user import User
from app.services import records

router = APIRouter()


class DocumentIn(BaseModel):
    templateId: str = Field(max_length=100)
    templateTitleBn: str = Field(default="", max_length=500)
    templateTitleEn: str = Field(default="", max_length=500)
    title: str = Field(default="", max_length=500)
    answers: dict[str, str] = Field(default_factory=dict)
    generatedTextBn: str = Field(default="", max_length=50000)
    generatedTextEn: str = Field(default="", max_length=50000)


async def _owned(db: AsyncSession, kind: str, user: User) -> list[AppRecord]:
    rows = await db.scalars(
        select(AppRecord).where(AppRecord.kind == kind, AppRecord.owner_id == user.id).order_by(AppRecord.created_at.desc())
    )
    return list(rows.all())


@router.get("/documents")
async def list_documents(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> list[dict]:
    return [records.out(r) for r in await _owned(db, "document", user)]


@router.get("/documents/{document_id}")
async def get_document(document_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> dict:
    rec = await records.get(db, "document", document_id)
    if rec.owner_id != user.id:
        raise records.not_found("Document")
    return records.out(rec)


@router.post("/documents")
async def create_document(payload: DocumentIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> dict:
    now = records.now_iso()
    rec = await records.create(
        db,
        "document",
        {**payload.model_dump(), "title": payload.title or payload.templateTitleBn, "userId": str(user.id),
         "status": "draft", "createdAt": now, "updatedAt": now},
        owner_id=user.id,
    )
    await db.commit()
    return records.out(rec)


@router.get("/notifications")
async def list_notifications(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> list[dict]:
    return [records.out(r) for r in await _owned(db, "notification", user)]


@router.post("/notifications/read-all")
async def read_all(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> dict:
    for rec in await _owned(db, "notification", user):
        if not rec.data.get("isRead"):
            records.save(rec, {**rec.data, "isRead": True})
    await db.commit()
    return {"ok": True}


@router.post("/notifications/{notification_id}/read")
async def read_one(
    notification_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    rec = await records.get(db, "notification", notification_id)
    if rec.owner_id != user.id:
        raise records.not_found("Notification")
    if not rec.data.get("isRead"):
        records.save(rec, {**rec.data, "isRead": True})
        await db.commit()
    return {"ok": True}
