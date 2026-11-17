"""`/admin/*` — platform administration (admins only)."""
from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError, ForbiddenError
from app.core.security import SUSPENDED_UNTIL, is_suspended, require_roles
from app.database import get_db
from app.models.app_record import AppRecord
from app.models.enums import LawyerApprovalStatus, UserRole
from app.models.profile import CitizenProfile, LawyerProfile
from app.models.user import User
from app.services import records
from app.services.lawyer_directory import load_lawyer, load_lawyers

router = APIRouter()
admin_only = require_roles(UserRole.ADMIN)

CATEGORIES = [
    ("Tenancy & Rent", "বাড়িভাড়া ও উচ্ছেদ", r"rent|landlord|tenan|evict|ভাড়া|বাড়িওয়ালা|উচ্ছেদ"),
    ("Cyber Harassment", "সাইবার ও অনলাইন নিরাপত্তা", r"cyber|facebook|hack|photo|blackmail|online|সাইবার|হ্যাক|ছবি|ব্ল্যাকমেইল"),
    ("Domestic Violence", "পারিবারিক সহিংসতা", r"violence|abuse|dowry|husband|wife|divorce|custody|নির্যাতন|যৌতুক|তালাক|পারিবারিক"),
    ("Consumer Rights", "ভোক্তা অধিকার", r"consumer|mrp|overcharg|price|receipt|ভোক্তা|দাম|রসিদ"),
    ("Penal / Criminal", "দণ্ডবিধি ও প্রতারণা", r"criminal|fraud|cheat|theft|assault|police|জালিয়াতি|প্রতারণা|চুরি|থানা"),
    ("Inheritance & Land", "উত্তরাধিকার ও জমিজমা", r"land|property|deed|inherit|succession|জমি|সম্পত্তি|দলিল|উত্তরাধিকার"),
    ("Labour & Employment", "শ্রম ও চাকরি", r"labou?r|salary|job|employ|maternity|শ্রম|বেতন|চাকরি"),
]


class ReasonIn(BaseModel):
    reason: str = Field(default="", max_length=2000)


class SuspendIn(BaseModel):
    suspended: bool


class FlagActionIn(BaseModel):
    action: Literal["dismiss", "escalate", "corpus_issue"]


class ReportActionIn(BaseModel):
    action: Literal["dismiss", "warn", "escalate"]


class NotSupported(AppError):
    status_code = 501
    code = "NOT_SUPPORTED"


# --- Stats --------------------------------------------------------------------

@router.get("/admin/stats")
async def stats(_: User = Depends(admin_only), db: AsyncSession = Depends(get_db)) -> dict:
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    citizens = await db.scalar(select(func.count()).select_from(User).where(User.role == UserRole.CITIZEN, User.deleted_at.is_(None)))
    approved = await db.scalar(select(func.count()).select_from(LawyerProfile).where(LawyerProfile.approval_status == LawyerApprovalStatus.APPROVED))
    pending = await db.scalar(select(func.count()).select_from(LawyerProfile).where(LawyerProfile.approval_status.in_(
        [LawyerApprovalStatus.PENDING, LawyerApprovalStatus.UNDER_REVIEW, LawyerApprovalStatus.DRAFT])))

    questions = (await db.execute(text(
        "SELECT m->>'bodyEn' AS en, m->>'bodyBn' AS bn, (m->>'createdAt')::timestamptz AS at "
        "FROM app_records, jsonb_array_elements(data->'messages') AS m "
        "WHERE kind = 'conversation' AND m->>'role' = 'user'"
    ))).all()

    days = [(now - timedelta(days=offset)).date() for offset in range(6, -1, -1)]
    per_day = {d: 0 for d in days}
    counts = {name: 0 for name, _, _ in CATEGORIES}
    this_week = 0
    for en, bn, at in questions:
        if at and at >= week_ago:
            this_week += 1
            if at.date() in per_day:
                per_day[at.date()] += 1
        body = f"{en or ''} {bn or ''}".lower()
        for name, _, pattern in CATEGORIES:
            if re.search(pattern, body):
                counts[name] += 1
                break

    overdue = await db.scalar(
        select(func.count()).select_from(AppRecord).where(
            AppRecord.kind == "verification",
            AppRecord.data["status"].astext.in_(["pending", "claimed"]),
            AppRecord.created_at < now - timedelta(hours=48),
        )
    )

    corpus = _corpus_stats()
    health = round(corpus["indexedSections"] / corpus["sections"] * 100, 1) if corpus.get("sections") else 0.0
    return {
        "totalCitizens": citizens or 0,
        "totalLawyers": approved or 0,
        "pendingLawyers": pending or 0,
        "questionsAskedThisWeek": this_week,
        "questionsTotal": len(questions),
        "unansweredVerificationsOver48h": overdue or 0,
        "corpusHealthPct": health,
        "indexedStatutesCount": corpus.get("acts", 0),
        "weeklyQuestions": [{"day": d.strftime("%a"), "count": per_day[d]} for d in days],
        "categoryBreakdown": [
            {"category": name, "categoryBn": name_bn, "count": counts[name]}
            for name, name_bn, _ in sorted(CATEGORIES, key=lambda c: -counts[c[0]])
        ],
    }


def _corpus_stats() -> dict:
    from app.api.v1.chat import corpus_status

    status = corpus_status()
    return status if isinstance(status, dict) else {}


# --- Lawyers ------------------------------------------------------------------

@router.get("/admin/lawyers")
async def all_lawyers(_: User = Depends(admin_only), db: AsyncSession = Depends(get_db)) -> list[dict]:
    return await load_lawyers(db, include_license=True)


async def _set_approval(db: AsyncSession, admin: User, lawyer_id: str, approve: bool, reason: str = "") -> dict:
    uid = records.parse_uuid(lawyer_id)
    profile = await db.get(LawyerProfile, uid) if uid else None
    if profile is None:
        raise records.not_found("Lawyer")
    if approve:
        profile.approval_status = LawyerApprovalStatus.APPROVED
        profile.approved_by = admin.id
        profile.approved_at = datetime.now(timezone.utc)
        profile.rejection_reason = None
        await records.notify(
            db, uid, "system", "Your profile is approved", "আপনার প্রোফাইল অনুমোদিত হয়েছে",
            "You are now listed in the lawyer directory and can receive requests.",
            "আপনি এখন আইনজীবী তালিকায় আছেন এবং অনুরোধ গ্রহণ করতে পারবেন।", "/lawyer",
        )
    else:
        profile.approval_status = LawyerApprovalStatus.REJECTED
        profile.rejection_reason = reason or "Credentials could not be verified with Bar Council records"
        await records.notify(
            db, uid, "system", "Your profile was not approved", "আপনার প্রোফাইল অনুমোদিত হয়নি",
            profile.rejection_reason, profile.rejection_reason, "/signup/lawyer/pending",
        )
    await db.commit()
    return await load_lawyer(db, uid, include_license=True)


@router.post("/admin/lawyers/{lawyer_id}/approve")
async def approve(lawyer_id: str, admin: User = Depends(admin_only), db: AsyncSession = Depends(get_db)) -> dict:
    return await _set_approval(db, admin, lawyer_id, True)


@router.post("/admin/lawyers/{lawyer_id}/reject")
async def reject(lawyer_id: str, payload: ReasonIn, admin: User = Depends(admin_only), db: AsyncSession = Depends(get_db)) -> dict:
    return await _set_approval(db, admin, lawyer_id, False, payload.reason)


# --- Users --------------------------------------------------------------------

def _user_out(user: User, district: Optional[str]) -> dict:
    return {
        "id": str(user.id),
        "email": user.email or "",
        "name": user.full_name,
        "role": user.role.value.lower(),
        "phone": user.phone,
        "district": district,
        "avatarUrl": user.avatar_url,
        "isVerified": user.is_active,
        "createdAt": user.created_at.isoformat(),
        "suspended": is_suspended(user),
    }


@router.get("/admin/users")
async def users(_: User = Depends(admin_only), db: AsyncSession = Depends(get_db)) -> list[dict]:
    rows = (await db.execute(
        select(User, CitizenProfile.district, LawyerProfile.district)
        .outerjoin(CitizenProfile, CitizenProfile.user_id == User.id)
        .outerjoin(LawyerProfile, LawyerProfile.user_id == User.id)
        .where(User.deleted_at.is_(None))
        .order_by(User.created_at.desc())
    )).all()
    return [_user_out(u, cd or ld) for u, cd, ld in rows]


@router.post("/admin/users/{user_id}/suspend")
async def suspend(user_id: str, payload: SuspendIn, admin: User = Depends(admin_only), db: AsyncSession = Depends(get_db)) -> dict:
    uid = records.parse_uuid(user_id)
    target = await db.get(User, uid) if uid else None
    if target is None or target.deleted_at is not None:
        raise records.not_found("User")
    if target.role == UserRole.ADMIN:
        raise ForbiddenError("Admin accounts cannot be suspended here.", "অ্যাডমিন অ্যাকাউন্ট এখানে স্থগিত করা যায় না।")
    target.locked_until = SUSPENDED_UNTIL if payload.suspended else None
    target.failed_login_attempts = 0
    await db.commit()
    district = await db.scalar(select(CitizenProfile.district).where(CitizenProfile.user_id == uid)) or \
        await db.scalar(select(LawyerProfile.district).where(LawyerProfile.user_id == uid))
    return _user_out(target, district)


# --- AI answer flags ----------------------------------------------------------

@router.get("/admin/flags")
async def flags(_: User = Depends(admin_only), db: AsyncSession = Depends(get_db)) -> list[dict]:
    return [records.out(r) for r in await records.list_kind(db, "flag") if r.data.get("status") == "pending"]


@router.post("/admin/flags/{flag_id}/resolve")
async def resolve_flag(flag_id: str, payload: FlagActionIn, _: User = Depends(admin_only), db: AsyncSession = Depends(get_db)) -> dict:
    rec = await records.get(db, "flag", flag_id)
    status = "escalated" if payload.action == "escalate" else "resolved"
    records.save(rec, {**rec.data, "status": status, "resolution": payload.action, "resolvedAt": records.now_iso()})
    await db.commit()
    return {"ok": True}


# --- Message reports ----------------------------------------------------------

@router.get("/admin/message-reports")
async def message_reports(_: User = Depends(admin_only), db: AsyncSession = Depends(get_db)) -> list[dict]:
    return [records.out(r) for r in await records.list_kind(db, "message_report")]


@router.post("/admin/message-reports/{report_id}/resolve")
async def resolve_report(report_id: str, payload: ReportActionIn, _: User = Depends(admin_only), db: AsyncSession = Depends(get_db)) -> dict:
    rec = await records.get(db, "message_report", report_id)
    thread_id = records.parse_uuid(rec.data.get("threadId"))
    thread = await db.get(AppRecord, thread_id) if thread_id else None
    if thread is not None and payload.action != "dismiss":
        reported = thread.lawyer_id if rec.data.get("reportedByRole") == "citizen" else thread.owner_id
        if payload.action == "warn":
            await records.notify(
                db, reported, "system", "Warning about a message you sent", "আপনার পাঠানো একটি বার্তা সম্পর্কে সতর্কতা",
                "A message you sent was reported and reviewed. Please keep conversations respectful.",
                "আপনার একটি বার্তা রিপোর্ট ও পর্যালোচনা করা হয়েছে। অনুগ্রহ করে সম্মানজনক আচরণ বজায় রাখুন।", "/",
            )
        else:  # escalate: block the conversation
            records.save(thread, {**thread.data, "isLocked": True})
            for participant in (thread.owner_id, thread.lawyer_id):
                await records.notify(
                    db, participant, "system", "A conversation was locked", "একটি কথোপকথন বন্ধ করা হয়েছে",
                    "After reviewing a report, an admin locked this conversation.",
                    "একটি রিপোর্ট পর্যালোচনার পর অ্যাডমিন এই কথোপকথনটি বন্ধ করেছেন।", "/",
                )
    records.save(rec, {**rec.data, "status": "dismissed" if payload.action == "dismiss" else "reviewed",
                       "resolution": payload.action})
    await db.commit()
    return {"ok": True}


# --- Corpus -------------------------------------------------------------------

@router.get("/admin/corpus")
async def corpus(_: User = Depends(admin_only)) -> list[dict]:
    from app.api.v1.chat import CorpusMissing, get_engine

    try:
        engine = get_engine()
    except CorpusMissing:
        return []
    built = engine.stats().get("builtAt") or ""
    return [
        {
            "id": str(act["id"]),
            "fileName": act.get("source") or act.get("slug") or "",
            "statuteId": act.get("statute_id") or act.get("slug") or str(act["id"]),
            "statuteTitleBn": act.get("title_bn") or act.get("title_en") or "",
            "statuteTitleEn": act.get("title_en") or act.get("title_bn") or "",
            "chunks": act.get("n_sections") or 0,
            "status": "indexed",
            "fileSizeMb": 0,
            "lastIndexed": built,
        }
        for act in sorted((dict(a) for a in engine.acts.values()),
                          key=lambda a: (-(a.get("year") or 0), a.get("title_en") or ""))
    ]


@router.post("/admin/corpus/upload")
async def corpus_upload(_: User = Depends(admin_only)) -> dict:
    raise NotSupported(
        "Uploading documents from the browser is not supported yet. Add the files to backend/data/raw and run "
        "`python -m scripts.build_corpus --raw data/raw`, then restart the API.",
        "ব্রাউজার থেকে আপলোড এখনও সমর্থিত নয়। ফাইলগুলো backend/data/raw এ রেখে build_corpus স্ক্রিপ্ট চালান।",
    )


@router.post("/admin/corpus/rebuild")
async def corpus_rebuild(_: User = Depends(admin_only)) -> dict:
    raise NotSupported(
        "The index is rebuilt offline: run `python -m scripts.build_corpus --raw data/raw` in backend/, then restart the API.",
        "ইনডেক্স অফলাইনে তৈরি হয়: backend/ এ build_corpus স্ক্রিপ্ট চালিয়ে API পুনরায় চালু করুন।",
    )


# --- Lawyer payouts -------------------------------------------------------------

@router.post("/admin/payouts/{kind}/{record_id}")
async def record_payout(
    kind: Literal["verification", "consultation"], record_id: str,
    _: User = Depends(admin_only), db: AsyncSession = Depends(get_db),
) -> dict:
    """Record that the lawyer has been paid for a completed verification or consultation."""
    rec = await records.get(db, kind, record_id)
    data = dict(rec.data)
    if data.get("status") != "completed":
        raise ForbiddenError("Only completed work can be paid out.", "শুধু সম্পন্ন কাজের পেমেন্ট দেওয়া যায়।")
    now = records.now_iso()
    if kind == "verification":
        data["verdict"] = {**(data.get("verdict") or {}), "paymentProcessed": True, "paidOutAt": now}
    else:
        data["paymentProcessed"] = True
        data["paidOutAt"] = now
    records.save(rec, data)
    await records.notify(
        db, rec.lawyer_id, "system", "Payout recorded", "পেমেন্ট সম্পন্ন",
        "An admin recorded your payout for completed work.", "সম্পন্ন কাজের জন্য আপনার পেমেন্ট রেকর্ড করা হয়েছে।",
        "/lawyer",
    )
    await db.commit()
    return records.out(rec)
