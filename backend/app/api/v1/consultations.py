"""`/consultations/*` — Rung 4: a citizen books a consultation with an approved lawyer.

Flow: requested → (lawyer) accepted / scheduled → completed → (citizen) review.
The lawyer may decline; the citizen may cancel. Accepting opens a message thread between the two.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Literal, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, ForbiddenError, ValidationAppError
from app.core.security import get_current_user, require_roles
from app.database import get_db
from app.models.app_record import AppRecord
from app.models.enums import LawyerApprovalStatus, UserRole
from app.models.profile import LawyerProfile
from app.models.user import User
from app.services import payments, records
from app.services.lawyer_directory import load_lawyer
from app.services.scheduling import validate_slot

router = APIRouter()

Mode = Literal["chat", "audio", "video", "in_person"]


class Slot(BaseModel):
    date: str = Field(max_length=40)
    time: str = Field(max_length=40)


class ConsultationIn(BaseModel):
    lawyerId: str
    topic: str = Field(min_length=1, max_length=255)
    description: str = Field(default="", max_length=10000)
    mode: Mode
    feeBdt: Optional[float] = None
    slots: list[Slot] = Field(default_factory=list, max_length=10)
    attachments: list[dict] = Field(default_factory=list, max_length=10)
    payment: Optional[payments.PaymentIn] = None  # client paid the lawyer's bKash/Nagad/Rocket/bank account


class AcceptIn(BaseModel):
    slot: Optional[Slot] = None


class ReasonIn(BaseModel):
    reason: str = Field(default="", max_length=2000)


class CompleteIn(BaseModel):
    privateNotes: Optional[str] = Field(default=None, max_length=10000)


class ReviewIn(BaseModel):
    rating: int = Field(ge=1, le=5)
    text: str = Field(default="", max_length=5000)


class DetailsIn(BaseModel):
    topic: str = Field(min_length=1, max_length=255)
    description: str = Field(default="", max_length=10000)


def _view(rec: AppRecord, user: User) -> dict:
    data = records.out(rec)
    if user.id != rec.lawyer_id:
        data.pop("lawyerPrivateNotes", None)  # the lawyer's own notes are never shown to anyone else
    return data


def _push_timeline(data: dict, status: str, note: Optional[str] = None) -> None:
    entry = {"status": status, "timestamp": records.now_iso()}
    if note:
        entry["note"] = note
    data["timeline"] = [*data.get("timeline", []), entry]
    data["status"] = status


async def _open_thread(db: AsyncSession, rec: AppRecord) -> None:
    exists = await db.scalar(
        select(AppRecord.id).where(
            AppRecord.kind == "thread",
            AppRecord.data["consultationId"].astext == str(rec.id),
        )
    )
    if exists:
        return
    c = rec.data
    await records.create(
        db,
        "thread",
        {
            "citizenId": c["citizenId"],
            "citizenName": c["citizenName"],
            "lawyerId": c["lawyerId"],
            "lawyerName": c["lawyerName"],
            "lawyerNameBn": c["lawyerNameBn"],
            "lawyerAvatar": c["lawyerAvatar"],
            "consultationId": str(rec.id),
            "contextTitleBn": c["topicBn"],
            "contextTitleEn": c["topicEn"],
            "isLocked": False,
            "mode": c["mode"],
            "messages": [],
            "lastMessage": "",
            "lastMessageAt": records.now_iso(),
        },
        owner_id=rec.owner_id,
        lawyer_id=rec.lawyer_id,
    )


@router.get("/consultations")
async def list_consultations(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> list[dict]:
    return [_view(r, user) for r in await records.list_for(db, "consultation", user)]


@router.get("/consultations/{consultation_id}")
async def get_consultation(
    consultation_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    return _view(await records.get_for(db, "consultation", consultation_id, user), user)


@router.post("/consultations")
async def create_consultation(
    payload: ConsultationIn,
    user: User = Depends(require_roles(UserRole.CITIZEN)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    lawyer_uid = records.parse_uuid(payload.lawyerId)
    profile = await db.get(LawyerProfile, lawyer_uid) if lawyer_uid else None
    lawyer = await load_lawyer(db, lawyer_uid) if profile else None
    if lawyer is None or profile.approval_status != LawyerApprovalStatus.APPROVED:
        raise ValidationAppError("This lawyer is not available for booking.", "এই আইনজীবীকে বুক করা যাচ্ছে না।")
    extra = await db.scalar(
        select(AppRecord.data).where(AppRecord.kind == "lawyer_extra", AppRecord.lawyer_id == lawyer_uid)
    ) or {}
    if extra.get("vacationMode"):
        raise ValidationAppError("This lawyer is on leave and not taking new consultations.",
                                 "এই আইনজীবী ছুটিতে আছেন এবং নতুন পরামর্শ নিচ্ছেন না।")
    open_count = await db.scalar(
        select(func.count()).select_from(AppRecord).where(
            AppRecord.kind == "consultation",
            AppRecord.lawyer_id == lawyer_uid,
            AppRecord.data["status"].astext.in_(["requested", "accepted", "scheduled"]),
        )
    )
    if open_count >= int(extra.get("maxActiveConsultations", 5)):
        raise ValidationAppError("This lawyer is fully booked right now. Please try another lawyer or check back later.",
                                 "এই আইনজীবীর এখন কোনো খালি সময় নেই। অন্য আইনজীবী দেখুন বা পরে চেষ্টা করুন।")
    if not payload.slots:
        raise ValidationAppError("Choose a date and time for the consultation.", "পরামর্শের তারিখ ও সময় নির্বাচন করুন।")
    for s in payload.slots:
        await validate_slot(db, lawyer_uid, s.date, s.time, enforce_hours=True)
    # Fee comes from the lawyer's own fee table, never from the client.
    mode_fee = next((f["feeBdt"] for f in lawyer["fees"] if f["mode"] == payload.mode), None)
    fee = mode_fee if mode_fee is not None else lawyer["startingFeeBdt"]
    accounts = await payments.lawyer_accounts(db, lawyer_uid)
    payment = None
    if payload.payment is not None:
        payment = await payments.build_payment(db, payload.payment, accounts, lawyer["fullName"], float(fee or 0))
    elif payments.methods(accounts) and fee:
        raise ValidationAppError("Pay the consultation fee and enter the transaction ID to book.",
                                 "বুক করতে পরামর্শ ফি পরিশোধ করে লেনদেন আইডি দিন।")
    now = records.now_iso()
    rec = await records.create(
        db,
        "consultation",
        {
            "citizenId": str(user.id),
            "citizenName": user.full_name,
            "citizenPhone": user.phone,
            "lawyerId": lawyer["id"],
            "lawyerName": lawyer["fullName"],
            "lawyerNameBn": lawyer["fullNameBn"],
            "lawyerAvatar": lawyer["avatarUrl"],
            "topicBn": payload.topic,
            "topicEn": payload.topic,
            "description": payload.description,
            "mode": payload.mode,
            "feeBdt": fee,
            "status": "requested",
            "preferredSlots": [s.model_dump() for s in payload.slots],
            "attachments": payload.attachments,
            "timeline": [{"status": "requested", "timestamp": now, "note": "Consultation request submitted"}],
            "payment": payment,
            "createdAt": now,
        },
        owner_id=user.id,
        lawyer_id=lawyer_uid,
    )
    await records.notify(
        db, lawyer_uid, "system", "New consultation request", "নতুন পরামর্শের অনুরোধ",
        f"{user.full_name} requested a {payload.mode.replace('_', ' ')} consultation: {payload.topic}"
        + (f" — paid ৳{payment['amount']:.0f} by {payment['methodLabel']} (TrxID {payment['trxId']}), please confirm." if payment else ""),
        f"{user.full_name} একটি পরামর্শের অনুরোধ করেছেন: {payload.topic}",
        f"/lawyer/consultations/{rec.id}",
    )
    await db.commit()
    return _view(rec, user)


@router.post("/consultations/{consultation_id}/accept")
async def accept_consultation(
    consultation_id: str,
    payload: AcceptIn,
    user: User = Depends(require_roles(UserRole.LAWYER)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    rec = await records.get_for(db, "consultation", consultation_id, user)
    data = dict(rec.data)
    if data.get("status") not in ("requested", "accepted", "scheduled"):
        raise ConflictError("This consultation can no longer be accepted.", "এই পরামর্শটি আর গ্রহণ করা যাবে না।")
    if data.get("status") == "scheduled" and not payload.slot:
        raise ValidationAppError("Choose the new date and time.", "নতুন তারিখ ও সময় নির্বাচন করুন।")
    if payload.slot:
        # The lawyer may pick any future time (not only their published hours), but never a past or taken one.
        await validate_slot(db, user.id, payload.slot.date, payload.slot.time, enforce_hours=False, exclude_id=rec.id)
        rescheduled = data.get("status") == "scheduled"
        payload.slot.time = payload.slot.time.strip()[:5]
        data["scheduledSlot"] = payload.slot.model_dump()
        data["status"] = "scheduled"
        _push_timeline(data, "scheduled", f"{'Rescheduled' if rescheduled else 'Scheduled'} for {payload.slot.date} at {payload.slot.time}")
        title_en, title_bn = (
            ("Consultation rescheduled", "পরামর্শের সময় পরিবর্তন হয়েছে") if rescheduled
            else ("Consultation scheduled", "পরামর্শের সময় নির্ধারিত হয়েছে")
        )
        body_en = f"{data['lawyerName']} scheduled your consultation for {payload.slot.date} at {payload.slot.time}."
        body_bn = f"{data['lawyerNameBn']} আপনার পরামর্শ {payload.slot.date}, {payload.slot.time} এ নির্ধারণ করেছেন।"
        ntype = "consultation_scheduled"
    else:
        _push_timeline(data, "accepted", "Accepted by lawyer")
        title_en, title_bn = "Consultation accepted", "পরামর্শের অনুরোধ গৃহীত"
        body_en = f"{data['lawyerName']} accepted your consultation request. You can now message them."
        body_bn = f"{data['lawyerNameBn']} আপনার অনুরোধ গ্রহণ করেছেন। এখন আপনি বার্তা পাঠাতে পারবেন।"
        ntype = "consultation_accepted"
    records.save(rec, data)
    await _open_thread(db, rec)
    await records.notify(db, rec.owner_id, ntype, title_en, title_bn, body_en, body_bn, f"/app/consultations/{rec.id}")
    await db.commit()
    return _view(rec, user)


@router.post("/consultations/{consultation_id}/decline")
async def decline_consultation(
    consultation_id: str, payload: ReasonIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    """The lawyer declines, or the citizen cancels their own request."""
    rec = await records.get_for(db, "consultation", consultation_id, user)
    data = dict(rec.data)
    if data.get("status") in ("completed", "declined", "cancelled"):
        raise ConflictError("This consultation is already closed.", "এই পরামর্শটি ইতিমধ্যে বন্ধ।")
    data["declineReason"] = payload.reason
    if user.id == rec.lawyer_id:
        _push_timeline(data, "declined", payload.reason or None)
        await records.notify(
            db, rec.owner_id, "system", "Consultation declined", "পরামর্শের অনুরোধ প্রত্যাখ্যাত",
            f"{data['lawyerName']} declined your request. {payload.reason}".strip(),
            f"{data['lawyerNameBn']} আপনার অনুরোধ প্রত্যাখ্যান করেছেন। {payload.reason}".strip(),
            f"/app/consultations/{rec.id}",
        )
    elif user.id == rec.owner_id:
        _push_timeline(data, "cancelled", payload.reason or "Cancelled by citizen")
        await records.notify(
            db, rec.lawyer_id, "system", "Consultation cancelled", "পরামর্শ বাতিল",
            f"{data['citizenName']} cancelled the consultation.", f"{data['citizenName']} পরামর্শটি বাতিল করেছেন।",
            f"/lawyer/consultations/{rec.id}",
        )
    else:
        raise ForbiddenError()
    records.save(rec, data)
    await db.commit()
    return _view(rec, user)


@router.post("/consultations/{consultation_id}/complete")
async def complete_consultation(
    consultation_id: str,
    payload: CompleteIn,
    user: User = Depends(require_roles(UserRole.LAWYER)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    rec = await records.get_for(db, "consultation", consultation_id, user)
    if rec.data.get("status") not in ("accepted", "scheduled"):
        raise ConflictError("Only accepted consultations can be completed.", "শুধু গৃহীত পরামর্শ সম্পন্ন করা যায়।")
    await mark_completed(db, rec, "Consultation marked completed", payload.privateNotes)
    await db.commit()
    return _view(rec, user)


async def mark_completed(db: AsyncSession, rec: AppRecord, note: str, private_notes: Optional[str] = None) -> bool:
    """Move an accepted/scheduled consultation to completed and tell the client. Returns False if it wasn't open."""
    data = dict(rec.data)
    if data.get("status") not in ("accepted", "scheduled"):
        return False
    if private_notes:
        data["lawyerPrivateNotes"] = private_notes
    _push_timeline(data, "completed", note)
    records.save(rec, data)
    await records.notify(
        db, rec.owner_id, "system", "Consultation completed", "পরামর্শ সম্পন্ন হয়েছে",
        f"Your consultation with {data.get('lawyerName', 'your lawyer')} is complete. You can now leave a review.",
        f"{data.get('lawyerNameBn') or data.get('lawyerName', '')} এর সাথে আপনার পরামর্শ সম্পন্ন হয়েছে। এখন রিভিউ দিতে পারেন।",
        f"/app/consultations/{rec.id}",
    )
    return True


@router.post("/consultations/{consultation_id}/review")
async def review_consultation(
    consultation_id: str,
    payload: ReviewIn,
    user: User = Depends(require_roles(UserRole.CITIZEN)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    rec = await records.get_for(db, "consultation", consultation_id, user)
    data = dict(rec.data)
    if rec.owner_id != user.id:
        raise ForbiddenError()
    if data.get("status") != "completed":
        raise ConflictError("You can review a consultation once it is completed.", "পরামর্শ সম্পন্ন হলে রিভিউ দিতে পারবেন।")
    if data.get("review"):
        raise ConflictError("You have already reviewed this consultation.", "আপনি ইতিমধ্যে রিভিউ দিয়েছেন।")
    now = records.now_iso()
    data["review"] = {"rating": payload.rating, "text": payload.text, "createdAt": now}
    records.save(rec, data)
    await records.create(
        db,
        "review",
        {"lawyerId": data["lawyerId"], "consultationId": str(rec.id), "citizenId": str(user.id),
         "citizenName": user.full_name, "rating": payload.rating, "text": payload.text, "createdAt": now},
        owner_id=user.id,
        lawyer_id=rec.lawyer_id,
    )
    profile = await db.get(LawyerProfile, rec.lawyer_id)
    if profile is not None:
        total = Decimal(profile.rating_avg or 0) * profile.rating_count + payload.rating
        profile.rating_count += 1
        profile.rating_avg = (total / profile.rating_count).quantize(Decimal("0.01"))
    await records.notify(
        db, rec.lawyer_id, "system", "New review", "নতুন রিভিউ",
        f"{user.full_name} rated your consultation {payload.rating}/5.",
        f"{user.full_name} আপনার পরামর্শকে {payload.rating}/৫ রেটিং দিয়েছেন।",
        f"/lawyer/consultations/{rec.id}",
    )
    await db.commit()
    return {"ok": True}


@router.patch("/consultations/{consultation_id}")
async def update_consultation(
    consultation_id: str,
    payload: DetailsIn,
    user: User = Depends(require_roles(UserRole.CITIZEN)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    rec = await records.get_for(db, "consultation", consultation_id, user)
    if rec.owner_id != user.id:
        raise ForbiddenError()
    if rec.data.get("status") != "requested":
        raise ConflictError("Details can only be edited before the lawyer responds.", "আইনজীবী সাড়া দেওয়ার আগে শুধু তথ্য সম্পাদনা করা যায়।")
    records.save(rec, {**rec.data, "topicBn": payload.topic, "topicEn": payload.topic, "description": payload.description})
    await db.commit()
    return _view(rec, user)
