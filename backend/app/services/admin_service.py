"""Admin console reads (stats, flags, users) and lawyer payouts."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import IllegalStateTransitionError, NotFoundError
from app.models.chat import Message, MessageCitation
from app.models.consultation import Consultation
from app.models.corpus import Act, CorpusDocument
from app.models.enums import (
    ConsultationStatus,
    FlaggedStatus,
    IngestStatus,
    LawyerApprovalStatus,
    MessageRole,
    UserRole,
    VerificationStatus,
)
from app.models.moderation import FlaggedAnswer
from app.models.profile import CitizenProfile, LawyerProfile
from app.models.user import User
from app.models.verification import VerificationAssignment, VerificationRequest
from app.schemas.admin import AdminStatsOut, CategoryCount, DayCount, FlaggedAnswerOut
from app.schemas.auth import UserOut
from app.services.auth_service import to_user_out
from app.services.chat_service import citations_by_message
from app.services.mappers import as_uuid, iso

FLAG_STATUS = {
    FlaggedStatus.OPEN: "pending",
    FlaggedStatus.UNDER_REVIEW: "escalated",
    FlaggedStatus.RESOLVED: "resolved",
    FlaggedStatus.DISMISSED: "resolved",
}


async def _count(db: AsyncSession, stmt) -> int:
    return int(await db.scalar(stmt) or 0)


async def stats(db: AsyncSession) -> AdminStatsOut:
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    users = select(func.count(User.id)).where(User.deleted_at.is_(None))
    questions = select(func.count(Message.id)).where(Message.role == MessageRole.USER)

    # One bar per day for the last 7 days, oldest first.
    day_col = func.date_trunc("day", Message.created_at)
    per_day = dict((await db.execute(
        select(day_col, func.count(Message.id))
        .where(Message.role == MessageRole.USER, Message.created_at >= week_ago.replace(hour=0, minute=0, second=0))
        .group_by(day_col)
    )).all())
    per_day = {k.date(): v for k, v in per_day.items()}
    weekly = []
    for offset in range(6, -1, -1):
        day = (now - timedelta(days=offset)).date()
        weekly.append(DayCount(day=day.strftime("%a"), count=per_day.get(day, 0)))

    # Categories = the Acts that answers cited.
    categories = (await db.execute(
        select(Act.title_en, Act.title_bn, func.count(func.distinct(MessageCitation.message_id)))
        .join(MessageCitation, MessageCitation.act_id == Act.id)
        .group_by(Act.id).order_by(func.count(func.distinct(MessageCitation.message_id)).desc()).limit(6)
    )).all()

    docs_total = await _count(db, select(func.count(CorpusDocument.id)))
    docs_ready = await _count(db, select(func.count(CorpusDocument.id)).where(CorpusDocument.ingest_status == IngestStatus.READY))

    return AdminStatsOut(
        total_citizens=await _count(db, users.where(User.role == UserRole.CITIZEN)),
        total_lawyers=await _count(db, select(func.count(LawyerProfile.user_id)).where(
            LawyerProfile.approval_status == LawyerApprovalStatus.APPROVED)),
        pending_lawyers=await _count(db, select(func.count(LawyerProfile.user_id)).where(
            LawyerProfile.approval_status.in_([LawyerApprovalStatus.PENDING, LawyerApprovalStatus.UNDER_REVIEW]))),
        questions_asked_this_week=await _count(db, questions.where(Message.created_at >= week_ago)),
        questions_total=await _count(db, questions),
        unanswered_verifications_over48h=await _count(db, select(func.count(VerificationRequest.id)).where(
            VerificationRequest.status.in_([VerificationStatus.UNASSIGNED, VerificationStatus.PAID,
                                            VerificationStatus.CLAIMED]),
            VerificationRequest.created_at < now - timedelta(hours=48))),
        corpus_health_pct=round(100 * docs_ready / docs_total, 1) if docs_total else 0.0,
        indexed_statutes_count=await _count(db, select(func.count(Act.id)).where(Act.status == "live")),
        weekly_questions=weekly,
        category_breakdown=[CategoryCount(category=en, category_bn=bn, count=n) for en, bn, n in categories],
    )


# --- flags -------------------------------------------------------------------

async def list_flags(db: AsyncSession) -> list[FlaggedAnswerOut]:
    flags = (await db.scalars(
        select(FlaggedAnswer)
        .where(FlaggedAnswer.status.in_([FlaggedStatus.OPEN, FlaggedStatus.UNDER_REVIEW]))
        .order_by(FlaggedAnswer.created_at.desc())
    )).all()
    if not flags:
        return []
    answers = {m.id: m for m in (await db.scalars(select(Message).where(Message.id.in_([f.message_id for f in flags])))).all()}
    citations = await citations_by_message(db, list(answers))
    out = []
    for f in flags:
        answer = answers[f.message_id]
        question = await db.scalar(select(Message).where(
            Message.conversation_id == answer.conversation_id, Message.role == MessageRole.USER,
            Message.created_at <= answer.created_at,
        ).order_by(Message.created_at.desc()).limit(1))
        out.append(FlaggedAnswerOut(
            id=str(f.id), message_id=str(f.message_id),
            question_bn=question.content if question else "", question_en=question.content if question else "",
            answer_bn=answer.body_bn or answer.content, answer_en=answer.body_en or answer.content,
            reason=f.description or f.reason_code, status=FLAG_STATUS[f.status],
            reported_at=iso(f.created_at), citations=citations.get(answer.id, []),
        ))
    return out


async def resolve_flag(db: AsyncSession, admin: User, flag_id: str, action: str) -> None:
    f = await db.get(FlaggedAnswer, as_uuid(flag_id, "Flag"))
    if f is None:
        raise NotFoundError("Flag not found.", "রিপোর্টটি পাওয়া যায়নি।")
    f.resolved_by = admin.id
    if action == "dismiss":
        f.status = FlaggedStatus.DISMISSED
    elif action == "escalate":
        f.status = FlaggedStatus.UNDER_REVIEW
    else:
        f.status = FlaggedStatus.RESOLVED
        f.corpus_action_taken = "Marked as a corpus issue for statute review"
    await db.commit()


# --- users -------------------------------------------------------------------

async def list_users(db: AsyncSession) -> list[UserOut]:
    rows = await db.execute(
        select(User, CitizenProfile.district, LawyerProfile.district)
        .outerjoin(CitizenProfile, CitizenProfile.user_id == User.id)
        .outerjoin(LawyerProfile, LawyerProfile.user_id == User.id)
        .where(User.deleted_at.is_(None)).order_by(User.created_at.desc())
    )
    return [to_user_out(u, district=cd or ld) for u, cd, ld in rows]


