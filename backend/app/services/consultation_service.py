"""Rung 4: a citizen books a consultation; the lawyer accepts (opening a
message thread), declines or completes it; the citizen reviews it."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import IllegalStateTransitionError, NotFoundError
from app.models.consultation import Consultation, MessageThread
from app.models.enums import (
    ConsultationStatus,
    LawyerApprovalStatus,
    PaymentPurpose,
    ThreadOrigin,
    ThreadStatus,
    UserRole,
)
from app.models.profile import LawyerFee, LawyerProfile
from app.models.user import User
from app.services import payment_service
from app.schemas.consultations import (
    ConsultationOut,
    CreateConsultationRequest,
    ReviewOut,
    Slot,
    TimelineEntry,
)
from app.services.lawyer_service import DEFAULT_AVATAR
from app.services.mappers import (
    CONSULTATION_STATUS_FROM_DB,
    MODE_FROM_DB,
    MODE_TO_DB,
    as_uuid,
    iso,
)
from app.services.notification_service import notify

DHAKA = ZoneInfo("Asia/Dhaka")
DEFAULT_DURATION_MINUTES = 30


def _slot_start(slot: Slot) -> datetime:
    local = datetime.fromisoformat(f"{slot.date}T{slot.time}").replace(tzinfo=DHAKA)
    return local.astimezone(timezone.utc)


def _slot_of(start: datetime) -> Slot:
    local = start.astimezone(DHAKA)
    return Slot(date=local.strftime("%Y-%m-%d"), time=local.strftime("%H:%M"))


def _now_iso() -> str:
    return iso(datetime.now(timezone.utc))


def _log(c: Consultation, status: str, note: Optional[str] = None) -> None:
    # Reassign rather than append so SQLAlchemy sees the JSONB change.
    c.timeline = [*c.timeline, {"status": status, "timestamp": _now_iso(), **({"note": note} if note else {})}]


async def _to_outs(db: AsyncSession, viewer: User, items: list[Consultation]) -> list[ConsultationOut]:
    ids = {c.citizen_id for c in items} | {c.lawyer_id for c in items}
    users = {u.id: u for u in (await db.scalars(select(User).where(User.id.in_(ids)))).all()} if ids else {}
    profiles = {p.user_id: p for p in (await db.scalars(
        select(LawyerProfile).where(LawyerProfile.user_id.in_({c.lawyer_id for c in items}))
    )).all()} if items else {}
    out = []
    for c in items:
        citizen, lawyer, profile = users.get(c.citizen_id), users.get(c.lawyer_id), profiles.get(c.lawyer_id)
        status = CONSULTATION_STATUS_FROM_DB[c.status]
        out.append(ConsultationOut(
            id=str(c.id),
            citizen_id=str(c.citizen_id),
            citizen_name=citizen.full_name if citizen else "",
            citizen_phone=citizen.phone if citizen else None,
            lawyer_id=str(c.lawyer_id),
            lawyer_name=lawyer.full_name if lawyer else "",
            lawyer_name_bn=(profile.full_name_bn if profile else None) or (lawyer.full_name if lawyer else ""),
            lawyer_avatar=(lawyer.avatar_url if lawyer else None) or DEFAULT_AVATAR,
            topic_bn=c.subject,
            topic_en=c.subject,
            description=c.description or "",
            mode=MODE_FROM_DB[c.mode],
            fee_bdt=float(c.fee_amount),
            status=status,
            preferred_slots=[Slot(**s) for s in c.preferred_slots],
            # scheduled_start holds the first proposed slot until the lawyer confirms one.
            scheduled_slot=_slot_of(c.scheduled_start) if status in ("scheduled", "completed") else None,
            attachments=c.attachments,
            timeline=[TimelineEntry(**t) for t in c.timeline],
            decline_reason=c.cancellation_reason,
            lawyer_private_notes=c.lawyer_private_notes if viewer.role != UserRole.CITIZEN else None,
            review=ReviewOut(rating=c.citizen_rating, text=c.citizen_review or "",
                             created_at=iso(c.reviewed_at or c.updated_at)) if c.citizen_rating else None,
            payment_processed=c.payment_processed,
            created_at=iso(c.created_at),
        ))
    return out


def _scoped(user: User):
    stmt = select(Consultation)
    if user.role == UserRole.CITIZEN:
        stmt = stmt.where(Consultation.citizen_id == user.id)
    elif user.role == UserRole.LAWYER:
        stmt = stmt.where(Consultation.lawyer_id == user.id)
    return stmt


async def _get(db: AsyncSession, user: User, consultation_id: str) -> Consultation:
    c = await db.scalar(_scoped(user).where(Consultation.id == as_uuid(consultation_id, "Consultation")))
    if c is None:
        raise NotFoundError("Consultation not found.", "পরামর্শটি পাওয়া যায়নি।")
    return c


async def _one(db: AsyncSession, user: User, c: Consultation) -> ConsultationOut:
    await db.refresh(c)
    return (await _to_outs(db, user, [c]))[0]


async def list_consultations(db: AsyncSession, user: User) -> list[ConsultationOut]:
    items = (await db.scalars(_scoped(user).order_by(Consultation.created_at.desc()))).all()
    return await _to_outs(db, user, list(items))


async def get_consultation(db: AsyncSession, user: User, consultation_id: str) -> ConsultationOut:
    return await _one(db, user, await _get(db, user, consultation_id))


async def create(db: AsyncSession, citizen: User, data: CreateConsultationRequest) -> ConsultationOut:
    lawyer = await db.get(LawyerProfile, as_uuid(data.lawyer_id, "Lawyer"))
    if lawyer is None or lawyer.approval_status != LawyerApprovalStatus.APPROVED:
        raise NotFoundError("Lawyer not found.", "আইনজীবী পাওয়া যায়নি।")

    # The lawyer's published fee for the mode is authoritative over what the client sent.
    fee = await db.scalar(select(LawyerFee).where(
        LawyerFee.lawyer_id == lawyer.user_id, LawyerFee.mode == MODE_TO_DB[data.mode], LawyerFee.is_active.is_(True)
    ))
    amount = fee.amount if fee else Decimal(str(data.fee_bdt or 0))
    await payment_service.ensure_payment_usable(db, data.payment)
    duration = fee.duration_minutes if fee else DEFAULT_DURATION_MINUTES
    start = _slot_start(data.slots[0])

    c = Consultation(
        citizen_id=citizen.id, lawyer_id=lawyer.user_id, mode=MODE_TO_DB[data.mode],
        subject=data.topic, description=data.description,
        scheduled_start=start, scheduled_end=start + timedelta(minutes=duration),
        fee_amount=amount, status=ConsultationStatus.REQUESTED,
        preferred_slots=[s.model_dump() for s in data.slots],
        attachments=[a.model_dump() for a in data.attachments],
        timeline=[],
    )
    _log(c, "requested", "Consultation request submitted")
    db.add(c)
    await db.flush()
    payment = payment_service.add_manual_payment(
        db, citizen, PaymentPurpose.CONSULTATION_FEE, "consultation", c.id, amount, data.payment,
    )
    await db.flush()
    c.payment_id = payment.id
    notify(db, lawyer.user_id, "consultation_scheduled",
           title_bn="নতুন পরামর্শের অনুরোধ", title_en="New consultation request",
           body_bn=f"{citizen.full_name}: {data.topic}", body_en=f"{citizen.full_name}: {data.topic}",
           link=f"/lawyer/consultations/{c.id}")
    await db.commit()
    return await _one(db, citizen, c)


async def _ensure_thread(db: AsyncSession, c: Consultation) -> None:
    existing = await db.scalar(select(MessageThread).where(
        MessageThread.origin == ThreadOrigin.CONSULTATION, MessageThread.origin_id == c.id
    ))
    if existing is None:
        db.add(MessageThread(
            citizen_id=c.citizen_id, lawyer_id=c.lawyer_id, origin=ThreadOrigin.CONSULTATION, origin_id=c.id,
            status=ThreadStatus.OPEN, accepted_at=datetime.now(timezone.utc),
            context_title_bn=c.subject, context_title_en=c.subject,
        ))
    elif existing.status == ThreadStatus.PENDING_LAWYER_ACCEPTANCE:
        existing.status = ThreadStatus.OPEN


def _require(c: Consultation, *allowed: ConsultationStatus) -> None:
    if c.status not in allowed:
        raise IllegalStateTransitionError(
            "This consultation can't be changed in its current state.", "বর্তমান অবস্থায় এই পরামর্শটি পরিবর্তন করা যাবে না।"
        )


async def accept(db: AsyncSession, lawyer: User, consultation_id: str, slot: Optional[Slot]) -> ConsultationOut:
    c = await _get(db, lawyer, consultation_id)
    _require(c, ConsultationStatus.REQUESTED, ConsultationStatus.AWAITING_PAYMENT)
    if slot:
        duration = c.scheduled_end - c.scheduled_start
        c.scheduled_start = _slot_start(slot)
        c.scheduled_end = c.scheduled_start + duration
        c.status = ConsultationStatus.CONFIRMED
        _log(c, "scheduled", f"Scheduled for {slot.date} at {slot.time}")
    else:
        c.status = ConsultationStatus.AWAITING_PAYMENT
        _log(c, "accepted", "Accepted by lawyer")
    await _ensure_thread(db, c)
    notify(db, c.citizen_id, "consultation_scheduled" if slot else "consultation_accepted",
           title_bn="পরামর্শের অনুরোধ গৃহীত হয়েছে", title_en="Consultation request accepted",
           body_bn=f"{lawyer.full_name} আপনার অনুরোধ গ্রহণ করেছেন" + (f" — {slot.date} {slot.time}" if slot else "।"),
           body_en=f"{lawyer.full_name} accepted your request" + (f" for {slot.date} at {slot.time}." if slot else "."),
           link=f"/app/consultations/{c.id}")
    await db.commit()
    return await _one(db, lawyer, c)


async def decline(db: AsyncSession, lawyer: User, consultation_id: str, reason: str) -> ConsultationOut:
    c = await _get(db, lawyer, consultation_id)
    _require(c, ConsultationStatus.REQUESTED, ConsultationStatus.AWAITING_PAYMENT, ConsultationStatus.CONFIRMED)
    c.status = ConsultationStatus.CANCELLED_BY_LAWYER
    c.cancellation_reason = reason
    _log(c, "declined", reason)
    notify(db, c.citizen_id, "system",
           title_bn="পরামর্শের অনুরোধ প্রত্যাখ্যাত", title_en="Consultation request declined",
           body_bn=reason, body_en=reason, link=f"/app/consultations/{c.id}")
    await db.commit()
    return await _one(db, lawyer, c)


async def complete(db: AsyncSession, lawyer: User, consultation_id: str, private_notes: Optional[str]) -> ConsultationOut:
    c = await _get(db, lawyer, consultation_id)
    _require(c, ConsultationStatus.AWAITING_PAYMENT, ConsultationStatus.CONFIRMED, ConsultationStatus.IN_PROGRESS)
    c.status = ConsultationStatus.COMPLETED
    c.completed_at = datetime.now(timezone.utc)
    if private_notes:
        c.lawyer_private_notes = private_notes
    _log(c, "completed", "Consultation marked completed")
    notify(db, c.citizen_id, "system",
           title_bn="পরামর্শ সম্পন্ন হয়েছে", title_en="Consultation completed",
           body_bn="অনুগ্রহ করে আপনার অভিজ্ঞতা রেটিং দিন।", body_en="Please rate your experience.",
           link=f"/app/consultations/{c.id}")
    await db.commit()
    return await _one(db, lawyer, c)


async def review(db: AsyncSession, citizen: User, consultation_id: str, rating: int, text: str) -> None:
    c = await _get(db, citizen, consultation_id)
    _require(c, ConsultationStatus.COMPLETED)
    previous = c.citizen_rating
    c.citizen_rating, c.citizen_review, c.reviewed_at = rating, text, datetime.now(timezone.utc)

    # Running average: profiles carry ratings from before this platform (seeded), so
    # recomputing from consultation rows alone would discard them.
    profile = await db.get(LawyerProfile, c.lawyer_id)
    total = profile.rating_avg * profile.rating_count
    if previous is None:
        profile.rating_count += 1
        total += rating
    else:
        total += rating - previous
    profile.rating_avg = (total / profile.rating_count).quantize(Decimal("0.01"))
    await db.commit()


async def update_details(db: AsyncSession, citizen: User, consultation_id: str, topic: str, description: str) -> ConsultationOut:
    c = await _get(db, citizen, consultation_id)
    _require(c, ConsultationStatus.REQUESTED)
    c.subject, c.description = topic, description
    await db.commit()
    return await _one(db, citizen, c)

