"""`/conversations/*` — the signed-in user's saved AI chats (private to their owner, even from admins)."""
from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.core.security import get_current_user
from app.database import get_db
from app.models.app_record import AppRecord
from app.models.user import User
from app.services import records

router = APIRouter()


class ExchangeIn(BaseModel):
    conversationId: Optional[str] = None
    userMessage: dict
    assistantMessage: dict


class FeedbackIn(BaseModel):
    messageId: str
    value: Literal["up", "down", "flag"]
    reason: Optional[str] = Field(default=None, max_length=2000)


async def _own(db: AsyncSession, user: User) -> list[AppRecord]:
    stmt = (
        select(AppRecord)
        .where(AppRecord.kind == "conversation", AppRecord.owner_id == user.id)
        .order_by(AppRecord.updated_at.desc())
    )
    return list((await db.scalars(stmt)).all())


async def _own_one(db: AsyncSession, user: User, conversation_id: str) -> AppRecord:
    rec = await records.get(db, "conversation", conversation_id)
    if rec.owner_id != user.id:
        raise records.not_found("Conversation")
    return rec


def _clean_message(raw: dict, role: str) -> dict:
    text_bn = str(raw.get("bodyBn") or "")[:20000]
    text_en = str(raw.get("bodyEn") or "")[:20000]
    citations = raw.get("citations") if isinstance(raw.get("citations"), list) else []
    return {
        "id": str(raw.get("id") or records.now_iso()),
        "role": role,
        "bodyBn": text_bn,
        "bodyEn": text_en,
        "citations": citations[:20],
        "createdAt": str(raw.get("createdAt") or records.now_iso()),
    }


@router.get("/conversations")
async def list_conversations(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> list[dict]:
    return [records.out(r) for r in await _own(db, user)]


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    return records.out(await _own_one(db, user, conversation_id))


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    await db.delete(await _own_one(db, user, conversation_id))
    await db.commit()
    return {"ok": True}


@router.post("/conversations/exchange")
async def save_exchange(
    payload: ExchangeIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    """Append one question + AI answer to a conversation, creating it on the first question."""
    question = _clean_message(payload.userMessage, "user")
    answer = _clean_message(payload.assistantMessage, "assistant")
    now = records.now_iso()

    rec: Optional[AppRecord] = None
    if payload.conversationId and records.parse_uuid(payload.conversationId):
        try:
            rec = await _own_one(db, user, payload.conversationId)
        except NotFoundError:
            rec = None

    if rec is None:
        title = question["bodyEn"] or question["bodyBn"]
        title = title[:45] + ("..." if len(title) > 45 else "")
        rec = await records.create(
            db,
            "conversation",
            {"titleBn": title, "titleEn": title, "updatedAt": now, "messages": [], "status": "active",
             "citedStatuteIds": []},
            owner_id=user.id,
        )

    data = dict(rec.data)
    data["messages"] = [*data.get("messages", []), question, answer]
    data["updatedAt"] = now
    cited = set(data.get("citedStatuteIds") or [])
    cited.update(str(c.get("statuteId")) for c in answer["citations"] if isinstance(c, dict) and c.get("statuteId"))
    data["citedStatuteIds"] = sorted(cited)
    records.save(rec, data)
    await db.commit()
    return records.out(rec)


@router.post("/conversations/feedback")
async def message_feedback(
    payload: FeedbackIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    for rec in await _own(db, user):
        messages = list(rec.data.get("messages", []))
        idx = next((i for i, m in enumerate(messages) if m.get("id") == payload.messageId), None)
        if idx is None:
            continue
        msg = dict(messages[idx])
        if payload.value == "flag":
            msg["flagged"] = True
            question = next((m for m in reversed(messages[:idx]) if m.get("role") == "user"), {})
            await records.create(
                db,
                "flag",
                {
                    "messageId": payload.messageId,
                    "conversationId": str(rec.id),
                    "questionBn": question.get("bodyBn", ""),
                    "questionEn": question.get("bodyEn", ""),
                    "answerBn": msg.get("bodyBn", ""),
                    "answerEn": msg.get("bodyEn", ""),
                    "reason": payload.reason or "Flagged by citizen as inaccurate",
                    "status": "pending",
                    "reportedAt": records.now_iso(),
                    "citations": msg.get("citations", []),
                },
                owner_id=user.id,
            )
            await records.notify_admins(
                db, "system", "AI answer flagged", "এআই উত্তর রিপোর্ট করা হয়েছে",
                "A citizen flagged an AI answer for review.", "একজন নাগরিক একটি এআই উত্তর পর্যালোচনার জন্য রিপোর্ট করেছেন।",
                "/admin/flags",
            )
        else:
            msg["rating"] = None if msg.get("rating") == payload.value else payload.value
            if msg["rating"] is None:
                msg.pop("rating")
        messages[idx] = msg
        records.save(rec, {**rec.data, "messages": messages})
        await db.commit()
        return {"ok": True, "messageId": payload.messageId}
    raise records.not_found("Message")
