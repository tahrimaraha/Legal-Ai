"""Rung 2: a citizen asks for a lawyer to verify an AI answer; an admin assigns
a lawyer (or declines); the assigned lawyer issues a verdict."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ForbiddenError, IllegalStateTransitionError, NotFoundError
from app.models.chat import Conversation, Message
from app.models.enums import (
    LawyerApprovalStatus,
    MessageRole,
    PaymentPurpose,
    Urgency,
    UserRole,
    VerificationStatus,
)
from app.models.profile import LawyerProfile
from app.models.user import User
from app.models.verification import VerificationAssignment, VerificationRequest, VerificationVerdict
from app.schemas.chat import CitationOut
from app.schemas.verifications import (
    CreateVerificationRequest,
    SubmitVerdictRequest,
    VerdictOut,
    VerificationOut,
)
from app.services.chat_service import citations_by_message, detect_language
from app.services.lawyer_service import DEFAULT_AVATAR
from app.services.mappers import VERDICT_FROM_DB, VERDICT_TO_DB, as_uuid, iso, verification_status
from app.services.notification_service import notify
from app.services import payment_service

FEE_BDT = {"normal": Decimal("200"), "urgent": Decimal("300")}
SLA_HOURS = {"normal": 48, "urgent": 24}
# The lawyer's share of the verification fee, paid out by the admin.
HONORARIUM_SHARE = Decimal("0.5")
PENDING_STATUSES = (VerificationStatus.UNASSIGNED, VerificationStatus.PAID)


def _query():
    return select(VerificationRequest).options(
        selectinload(VerificationRequest.assignments).selectinload(VerificationAssignment.verdict)
    )


def _active_assignment(req: VerificationRequest) -> Optional[VerificationAssignment]:
    live = [a for a in req.assignments if a.declined_at is None]
    return max(live, key=lambda a: a.assigned_at) if live else None


async def _to_outs(db: AsyncSession, requests: list[VerificationRequest]) -> list[VerificationOut]:
    people_ids = {r.citizen_id for r in requests}
    assignments = {r.id: _active_assignment(r) for r in requests}
    people_ids |= {a.lawyer_id for a in assignments.values() if a}
    users = {u.id: u for u in (await db.scalars(select(User).where(User.id.in_(people_ids)))).all()} if people_ids else {}
    lawyer_ids = [a.lawyer_id for a in assignments.values() if a]
    profiles = {p.user_id: p for p in (await db.scalars(
        select(LawyerProfile).where(LawyerProfile.user_id.in_(lawyer_ids))
    )).all()} if lawyer_ids else {}

    out = []
    for r in requests:
        a = assignments[r.id]
        lawyer = users.get(a.lawyer_id) if a else None
        verdict = None
        if a and a.verdict:
            v, profile = a.verdict, profiles.get(a.lawyer_id)
            verdict = VerdictOut(
                id=str(v.id), request_id=str(r.id), lawyer_id=str(a.lawyer_id),
                lawyer_name=lawyer.full_name if lawyer else v.advocate_signature_name,
                lawyer_name_bn=(profile.full_name_bn if profile else None) or v.advocate_signature_name,
                lawyer_avatar=(lawyer.avatar_url if lawyer else None) or DEFAULT_AVATAR,
                lawyer_enrolment_no=profile.bar_council_enrollment_no if profile else "",
                verdict=VERDICT_FROM_DB[v.verdict],
                corrected_explanation_bn=v.corrected_statement or "",
                corrected_explanation_en=v.corrected_statement_en or "",
                added_statute_citations=v.added_citations,
                disputed_statute_citations=v.disputed_citations,
                note_to_citizen_bn=v.summary_bn, note_to_citizen_en=v.summary_en,
                minutes_spent=v.minutes_spent, created_at=iso(v.issued_at),
                payment_processed=a.payment_processed,
            )
        citizen = users.get(r.citizen_id)
        out.append(VerificationOut(
            id=str(r.id),
            citizen_id=str(r.citizen_id),
            citizen_name=citizen.full_name if citizen else "",
            conversation_id=str(r.conversation_id) if r.conversation_id else "",
            message_id=str(r.message_id) if r.message_id else "",
            question_excerpt_bn=r.issue_summary,
            question_excerpt_en=r.question_excerpt_en or r.issue_summary,
            ai_answer_excerpt_bn=r.answer_excerpt_bn or "",
            ai_answer_excerpt_en=r.answer_excerpt_en or r.answer_excerpt_bn or "",
            citations=[CitationOut(**c) for c in r.citations_snapshot],
            status=verification_status(r.status),
            urgency="urgent" if r.urgency == Urgency.URGENT else "normal",
            fee_bdt=float(r.fee_amount),
            claimed_by_lawyer_id=str(a.lawyer_id) if a else None,
            claimed_by_lawyer_name=lawyer.full_name if lawyer else None,
            assigned_at=iso(a.assigned_at) if a else None,
            decline_reason=r.decline_reason,
            verdict=verdict,
            created_at=iso(r.created_at),
            updated_at=iso(r.updated_at),
        ))
    return out


async def _visible(db: AsyncSession, user: User, request_id: str) -> VerificationRequest:
    req = await db.scalar(_query().where(VerificationRequest.id == as_uuid(request_id, "Verification request")))
    if req is None:
        raise NotFoundError("Verification request not found.", "যাচাই অনুরোধটি পাওয়া যায়নি।")
    if user.role == UserRole.CITIZEN and req.citizen_id != user.id:
        raise NotFoundError("Verification request not found.", "যাচাই অনুরোধটি পাওয়া যায়নি।")
    if user.role == UserRole.LAWYER:
        a = _active_assignment(req)
        if a is None or a.lawyer_id != user.id:
            raise NotFoundError("Verification request not found.", "যাচাই অনুরোধটি পাওয়া যায়নি।")
    return req


async def list_requests(db: AsyncSession, user: User) -> list[VerificationOut]:
    stmt = _query().order_by(VerificationRequest.created_at.desc())
    if user.role == UserRole.CITIZEN:
        stmt = stmt.where(VerificationRequest.citizen_id == user.id)
    elif user.role == UserRole.LAWYER:
        # Lawyers only ever see requests assigned to them — never the open queue.
        stmt = stmt.where(VerificationRequest.assignments.any(
            (VerificationAssignment.lawyer_id == user.id) & VerificationAssignment.declined_at.is_(None)
        ))
    return await _to_outs(db, list((await db.scalars(stmt)).all()))


async def get_request(db: AsyncSession, user: User, request_id: str) -> VerificationOut:
    return (await _to_outs(db, [await _visible(db, user, request_id)]))[0]


async def _reload(db: AsyncSession, request_id: uuid.UUID) -> VerificationOut:
    req = await db.scalar(
        _query().where(VerificationRequest.id == request_id).execution_options(populate_existing=True)
    )
    return (await _to_outs(db, [req]))[0]


async def create_request(db: AsyncSession, citizen: User, data: CreateVerificationRequest) -> VerificationOut:
    # Prefer the stored chat message over client-sent text so the lawyer reviews exactly what the AI said.
    message = None
    try:
        message_uuid = uuid.UUID(data.message_id)
    except ValueError:
        message_uuid = None
    if message_uuid:
        message = await db.scalar(
            select(Message).join(Conversation, Conversation.id == Message.conversation_id).where(
                Message.id == message_uuid, Conversation.citizen_id == citizen.id,
                Message.role == MessageRole.ASSISTANT,
            )
        )
    if message is None:
        raise NotFoundError("That answer could not be found.", "উত্তরটি পাওয়া যায়নি।")

    existing = await db.scalar(_query().where(
        VerificationRequest.message_id == message.id,
        VerificationRequest.status.notin_([VerificationStatus.CANCELLED, VerificationStatus.REFUNDED]),
    ))
    if existing is not None:
        return (await _to_outs(db, [existing]))[0]

    await payment_service.ensure_payment_usable(db, data.payment)

    question = await db.scalar(
        select(Message).where(
            Message.conversation_id == message.conversation_id, Message.role == MessageRole.USER,
            Message.created_at <= message.created_at,
        ).order_by(Message.created_at.desc()).limit(1)
    )
    question_text = question.content if question else data.question_text
    citations = (await citations_by_message(db, [message.id])).get(message.id, [])
    now = datetime.now(timezone.utc)

    req = VerificationRequest(
        citizen_id=citizen.id,
        conversation_id=message.conversation_id,
        message_id=message.id,
        issue_summary=question_text,
        question_excerpt_en=question_text,
        answer_excerpt_bn=message.body_bn or message.content,
        answer_excerpt_en=message.body_en or message.content,
        citations_snapshot=[c.model_dump(by_alias=True) for c in citations],
        urgency=Urgency.URGENT if data.urgency == "urgent" else Urgency.NORMAL,
        preferred_language=detect_language(question_text),
        attached_statute_ids=[],
        fee_amount=FEE_BDT[data.urgency],
        # The citizen has sent the money and submitted a TrxID; an admin confirms
        # it on the payments page, but the request is queued straight away.
        status=VerificationStatus.UNASSIGNED,
        sla_due_at=now + timedelta(hours=SLA_HOURS[data.urgency]),
    )
    db.add(req)
    await db.flush()
    payment = payment_service.add_manual_payment(
        db, citizen, PaymentPurpose.VERIFICATION_FEE, "verification_request", req.id, req.fee_amount, data.payment,
    )
    await db.flush()
    req.payment_id = payment.id

    admins = (await db.scalars(select(User.id).where(User.role == UserRole.ADMIN, User.deleted_at.is_(None)))).all()
    for admin_id in admins:
        notify(db, admin_id, "verification_requested",
               title_bn="নতুন যাচাই অনুরোধ", title_en="New verification request",
               body_bn=f"{citizen.full_name} একটি এআই উত্তর যাচাইয়ের অনুরোধ করেছেন।",
               body_en=f"{citizen.full_name} requested verification of an AI answer.",
               link="/admin/verifications")
    await db.commit()
    return await _reload(db, req.id)


async def assign(db: AsyncSession, admin: User, request_id: str, lawyer_id: str) -> VerificationOut:
    req = await _visible(db, admin, request_id)
    if req.status not in PENDING_STATUSES:
        raise IllegalStateTransitionError("Only pending requests can be assigned.", "শুধু অপেক্ষমাণ অনুরোধ বরাদ্দ করা যায়।")
    lawyer = await db.get(LawyerProfile, as_uuid(lawyer_id, "Lawyer"))
    if lawyer is None or lawyer.approval_status != LawyerApprovalStatus.APPROVED:
        raise NotFoundError("Approved lawyer not found.", "অনুমোদিত আইনজীবী পাওয়া যায়নি।")

    now = datetime.now(timezone.utc)
    db.add(VerificationAssignment(
        request_id=req.id, lawyer_id=lawyer.user_id, assigned_by=admin.id,
        assigned_at=now, claimed_at=now, honorarium_amount=req.fee_amount * HONORARIUM_SHARE,
    ))
    req.status = VerificationStatus.CLAIMED
    notify(db, lawyer.user_id, "verification_requested",
           title_bn="নতুন যাচাই অনুরোধ", title_en="New verification request",
           body_bn="একটি এআই উত্তর আপনার যাচাইয়ের জন্য বরাদ্দ করা হয়েছে।",
           body_en="An AI answer has been assigned to you for verification.",
           link=f"/lawyer/verifications/{req.id}")
    await db.commit()
    return await _reload(db, req.id)


async def decline(db: AsyncSession, admin: User, request_id: str, reason: str) -> VerificationOut:
    req = await _visible(db, admin, request_id)
    if req.status not in PENDING_STATUSES:
        raise IllegalStateTransitionError("Only pending requests can be declined.", "শুধু অপেক্ষমাণ অনুরোধ বাতিল করা যায়।")
    req.status = VerificationStatus.CANCELLED
    req.decline_reason = reason
    notify(db, req.citizen_id, "system",
           title_bn="যাচাই অনুরোধ বাতিল হয়েছে", title_en="Verification request declined",
           body_bn=reason, body_en=reason, link=f"/app/verifications/{req.id}")
    await db.commit()
    return await _reload(db, req.id)


async def submit_verdict(db: AsyncSession, lawyer: User, request_id: str, data: SubmitVerdictRequest) -> VerdictOut:
    req = await _visible(db, lawyer, request_id)
    assignment = _active_assignment(req)
    if req.status != VerificationStatus.CLAIMED or assignment is None or assignment.lawyer_id != lawyer.id:
        raise ForbiddenError("This request is not assigned to you.", "এই অনুরোধটি আপনাকে বরাদ্দ করা হয়নি।")

    db.add(VerificationVerdict(
        assignment_id=assignment.id,
        verdict=VERDICT_TO_DB[data.verdict],
        summary_bn=data.note_to_citizen_bn,
        summary_en=data.note_to_citizen_en,
        corrected_statement=data.corrected_explanation_bn,
        corrected_statement_en=data.corrected_explanation_en,
        added_citations=data.added_statute_citations,
        disputed_citations=data.disputed_statute_citations,
        minutes_spent=data.minutes_spent,
        advocate_signature_name=lawyer.full_name,
        issued_at=datetime.now(timezone.utc),
    ))
    req.status = VerificationStatus.VERDICT_ISSUED
    notify(db, req.citizen_id, "verification_completed",
           title_bn="আইনজীবী যাচাই সম্পন্ন হয়েছে", title_en="Lawyer verification completed",
           body_bn=f"{lawyer.full_name} আপনার এআই উত্তরটি যাচাই করেছেন।",
           body_en=f"{lawyer.full_name} has verified your AI answer.",
           link=f"/app/verifications/{req.id}")
    await db.commit()
    out = await _reload(db, req.id)
    return out.verdict
