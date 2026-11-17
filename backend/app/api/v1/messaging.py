"""`/threads/*`, `/meetings/*` — Rung 3 citizen↔lawyer messaging and video meetings.

Threads are opened when a lawyer accepts a consultation and are visible only to their two
participants (admins only see messages that someone reports).
"""
from __future__ import annotations

import secrets
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, ForbiddenError, ValidationAppError
from app.core.security import get_current_user, require_roles
from app.database import get_db
from app.models.app_record import AppRecord
from app.models.enums import UserRole
from app.models.user import User
from app.services import records
from app.api.v1.meeting_signal import broadcast_ended

router = APIRouter()

_CODE_CHARS = "abcdefghijkmnpqrstuvwxyz23456789"


class MessageIn(BaseModel):
    text: str = Field(min_length=1, max_length=5000)


class ReportIn(BaseModel):
    messageId: str
    reasonCategory: str = Field(min_length=1, max_length=100)
    reasonDetails: Optional[str] = Field(default=None, max_length=2000)


class MeetingIn(BaseModel):
    title: str = Field(default="Consultation meeting", max_length=255)
    threadId: Optional[str] = None
    citizenId: Optional[str] = None


class JoinIn(BaseModel):
    code: str = Field(max_length=40)
    password: str = Field(max_length=40)


def _role(user: User) -> str:
    return "lawyer" if user.role == UserRole.LAWYER else "citizen"


def _is_participant(rec: AppRecord, user: User) -> bool:
    return user.id in (rec.owner_id, rec.lawyer_id)


def _thread_view(rec: AppRecord, user: User) -> dict:
    data = records.out(rec)
    me = _role(user)
    data["unreadCount"] = sum(1 for m in data.get("messages", []) if m.get("senderRole") != me and not m.get("isRead"))
    return data


async def _thread_for(db: AsyncSession, thread_id: str, user: User) -> AppRecord:
    rec = await records.get(db, "thread", thread_id)
    if not _is_participant(rec, user):
        raise records.not_found("Thread")
    return rec


def _meeting_view(rec: AppRecord, user: User) -> dict:
    data = records.out(rec)
    if user.id != rec.lawyer_id:
        data.pop("password", None)  # only the host sees (and shares) the password
    return data


@router.get("/threads")
async def list_threads(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = await db.scalars(
        select(AppRecord)
        .where(AppRecord.kind == "thread", or_(AppRecord.owner_id == user.id, AppRecord.lawyer_id == user.id))
        .order_by(AppRecord.updated_at.desc())
    )
    return [_thread_view(r, user) for r in rows.all()]


@router.get("/threads/{thread_id}")
async def get_thread(thread_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> dict:
    rec = await _thread_for(db, thread_id, user)
    me = _role(user)
    messages = [
        {**m, "isRead": True} if m.get("senderRole") != me and not m.get("isRead") else m
        for m in rec.data.get("messages", [])
    ]
    changed = messages != rec.data.get("messages", [])
    if changed:
        records.save(rec, {**rec.data, "messages": messages})
    # Reading the conversation also clears its "new message" notifications.
    unread = await db.scalars(
        select(AppRecord).where(
            AppRecord.kind == "notification", AppRecord.owner_id == user.id,
            AppRecord.data["type"].astext == "new_message",
            AppRecord.data["threadId"].astext == str(rec.id),
            AppRecord.data["isRead"].astext == "false",
        )
    )
    for n in unread.all():
        records.save(n, {**n.data, "isRead": True})
        changed = True
    if changed:
        await db.commit()
    return _thread_view(rec, user)


@router.post("/threads/{thread_id}/messages")
async def send_message(
    thread_id: str, payload: MessageIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    rec = await _thread_for(db, thread_id, user)
    if rec.data.get("isLocked"):
        raise ConflictError("This conversation is locked.", "এই কথোপকথনটি বন্ধ করা হয়েছে।")
    me = _role(user)
    now = records.now_iso()
    text = payload.text.strip()
    message = {"id": f"tm-{secrets.token_hex(6)}", "senderId": str(user.id), "senderRole": me, "text": text,
               "createdAt": now, "isRead": False}
    records.save(rec, {**rec.data, "messages": [*rec.data.get("messages", []), message], "lastMessage": text,
                       "lastMessageAt": now})
    recipient = rec.lawyer_id if me == "citizen" else rec.owner_id
    link = f"/lawyer/messages/{rec.id}" if me == "citizen" else f"/app/messages/{rec.id}"
    note = await records.notify(
        db, recipient, "new_message", f"New message from {user.full_name}", f"{user.full_name} এর নতুন বার্তা",
        text[:140], text[:140], link,
    )
    if note is not None:
        records.save(note, {**note.data, "threadId": str(rec.id)})
    await db.commit()
    return _thread_view(rec, user)


@router.post("/threads/{thread_id}/reports")
async def report_message(
    thread_id: str, payload: ReportIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    rec = await _thread_for(db, thread_id, user)
    message = next((m for m in rec.data.get("messages", []) if m.get("id") == payload.messageId), None)
    if message is None:
        raise records.not_found("Message")
    me = _role(user)
    against = rec.data.get("lawyerName") if me == "citizen" else rec.data.get("citizenName")
    report = await records.create(
        db,
        "message_report",
        {
            "threadId": str(rec.id),
            "messageId": payload.messageId,
            "messageSnapshot": message.get("text", ""),
            "reportedByRole": me,
            "reportedByName": user.full_name,
            "reportedAgainstName": against or "",
            "reasonCategory": payload.reasonCategory,
            "reasonDetails": payload.reasonDetails,
            "status": "pending",
            "createdAt": records.now_iso(),
        },
        owner_id=user.id,
    )
    await records.notify_admins(
        db, "system", "Message reported", "বার্তা রিপোর্ট করা হয়েছে",
        f"{user.full_name} reported a message ({payload.reasonCategory}).",
        f"{user.full_name} একটি বার্তা রিপোর্ট করেছেন।", "/admin/message-reports",
    )
    await db.commit()
    return records.out(report)


# --- Meetings ---------------------------------------------------------------

@router.post("/meetings")
async def create_meeting(
    payload: MeetingIn, user: User = Depends(require_roles(UserRole.LAWYER)), db: AsyncSession = Depends(get_db)
) -> dict:
    thread: Optional[AppRecord] = None
    citizen_id = None
    if payload.threadId:
        thread = await _thread_for(db, payload.threadId, user)
        citizen_id = thread.owner_id
    elif payload.citizenId:
        citizen_id = records.parse_uuid(payload.citizenId)
        # A lawyer can only start a meeting with a citizen they already have a thread with.
        has_thread = citizen_id and await db.scalar(
            select(AppRecord.id).where(AppRecord.kind == "thread", AppRecord.owner_id == citizen_id,
                                       AppRecord.lawyer_id == user.id)
        )
        if not has_thread:
            raise ValidationAppError("Pick one of your clients to meet.", "আপনার একজন ক্লায়েন্ট নির্বাচন করুন।")
    # No thread and no citizen = an instant meeting: the first citizen who joins with the code and
    # password becomes its participant.
    citizen = await db.get(User, citizen_id) if citizen_id else None
    code = "-".join("".join(secrets.choice(_CODE_CHARS) for _ in range(n)) for n in (3, 4, 3))
    meeting = await records.create(
        db,
        "meeting",
        {
            "code": code,
            "password": f"{secrets.randbelow(900000) + 100000}",
            "link": f"/app/meeting/{code}",
            "title": payload.title,
            "hostLawyerId": str(user.id),
            "hostLawyerName": user.full_name,
            "citizenId": str(citizen_id) if citizen_id else "",
            "citizenName": citizen.full_name if citizen else "",
            "threadId": str(thread.id) if thread else None,
            "status": "live",
            "createdAt": records.now_iso(),
        },
        owner_id=citizen_id,
        lawyer_id=user.id,
    )
    if thread is not None:
        records.save(thread, {**thread.data, "meetingLink": meeting.data["link"], "activeMeetingCode": code})
    if citizen_id:
        await records.notify(
            db, citizen_id, "system", "Your lawyer started a video meeting", "আপনার আইনজীবী ভিডিও মিটিং শুরু করেছেন",
            f"{user.full_name} started '{payload.title}'. Meeting code: {code}.",
            f"{user.full_name} '{payload.title}' শুরু করেছেন। মিটিং কোড: {code}।",
            f"/app/meeting/{code}",
        )
    await db.commit()
    return _meeting_view(meeting, user)


async def _meeting_by_code(db: AsyncSession, code: str) -> Optional[AppRecord]:
    return await db.scalar(
        select(AppRecord).where(AppRecord.kind == "meeting", AppRecord.data["code"].astext == code.strip().lower())
    )


@router.get("/meetings/by-code/{code}")
async def meeting_by_code(code: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> dict:
    rec = await _meeting_by_code(db, code)
    if rec is None or not _is_participant(rec, user):
        raise records.not_found("Meeting")
    return _meeting_view(rec, user)


@router.post("/meetings/join")
async def join_meeting(payload: JoinIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> dict:
    rec = await _meeting_by_code(db, payload.code)
    if rec is None:
        return {"ok": False, "error": "No meeting found with this code."}
    if rec.data.get("status") == "ended":
        return {"ok": False, "error": "This meeting has already ended."}
    if not secrets.compare_digest(str(rec.data.get("password", "")), payload.password.strip()):
        return {"ok": False, "error": "Incorrect password."}
    if rec.owner_id is None and user.id != rec.lawyer_id:
        if user.role != UserRole.CITIZEN:
            return {"ok": False, "error": "Only clients can join this meeting."}
        # Instant meeting: the first citizen to join becomes its participant.
        rec.owner_id = user.id
        records.save(rec, {**rec.data, "citizenId": str(user.id), "citizenName": user.full_name})
        await records.notify(
            db, rec.lawyer_id, "system", "A client joined your meeting", "একজন ক্লায়েন্ট আপনার মিটিংয়ে যোগ দিয়েছেন",
            f"{user.full_name} joined '{rec.data.get('title', '')}'.",
            f"{user.full_name} মিটিংয়ে যোগ দিয়েছেন।",
            f"/lawyer/meeting/{rec.data.get('code')}",
        )
        await db.commit()
    elif not _is_participant(rec, user):
        return {"ok": False, "error": "This meeting is for another client."}
    return {"ok": True, "meeting": _meeting_view(rec, user)}


@router.post("/meetings/{meeting_id}/end")
async def end_meeting(meeting_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> dict:
    rec = await records.get(db, "meeting", meeting_id)
    if rec.lawyer_id != user.id:
        raise ForbiddenError("Only the host can end this meeting.", "শুধু হোস্ট মিটিং শেষ করতে পারেন।")
    records.save(rec, {**rec.data, "status": "ended", "endedAt": records.now_iso()})
    thread_id = records.parse_uuid(rec.data.get("threadId"))
    thread = await db.get(AppRecord, thread_id) if thread_id else None
    if thread is not None and thread.data.get("activeMeetingCode") == rec.data.get("code"):
        data = dict(thread.data)
        data.pop("activeMeetingCode", None)
        records.save(thread, data)
    await db.commit()
    await broadcast_ended(str(rec.data.get("code", "")))
    return _meeting_view(rec, user)
