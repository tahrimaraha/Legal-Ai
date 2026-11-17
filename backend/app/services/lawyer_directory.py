"""Builds the frontend `LawyerProfile` shape from the relational lawyer tables."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Iterable, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.app_record import AppRecord
from app.models.enums import ConsultationMode, CourtLevel, LawyerApprovalStatus
from app.models.profile import (
    AvailabilityRule,
    LawyerFee,
    LawyerProfile,
    LawyerSpecialization,
    Specialization,
)
from app.models.user import User

DISTRICT_BN = {
    "dhaka": "ঢাকা", "chattogram": "চট্টগ্রাম", "chittagong": "চট্টগ্রাম", "khulna": "খুলনা",
    "rajshahi": "রাজশাহী", "sylhet": "সিলেট", "barishal": "বরিশাল", "barisal": "বরিশাল",
    "rangpur": "রংপুর", "mymensingh": "ময়মনসিংহ", "cumilla": "কুমিল্লা", "comilla": "কুমিল্লা",
    "gazipur": "গাজীপুর", "narayanganj": "নারায়ণগঞ্জ", "bogura": "বগুড়া", "jessore": "যশোর",
    "jashore": "যশোর", "cox's bazar": "কক্সবাজার", "noakhali": "নোয়াখালী", "tangail": "টাঙ্গাইল",
}
COURTS = {
    CourtLevel.JUDGE_COURT: ("District & Sessions Judge Court", "জেলা ও দায়রা জজ আদালত"),
    CourtLevel.HIGH_COURT: ("High Court Division, Supreme Court", "হাইকোর্ট বিভাগ, সুপ্রিম কোর্ট"),
    CourtLevel.APPELLATE_DIVISION: ("Appellate Division, Supreme Court", "আপিল বিভাগ, সুপ্রিম কোর্ট"),
}
LANGUAGES = {"bn": "Bengali", "en": "English"}
MODE_OUT = {
    ConsultationMode.CHAT: "chat",
    ConsultationMode.AUDIO: "audio",
    ConsultationMode.VIDEO: "video",
    ConsultationMode.CHAMBER: "in_person",
}


def verification_status(status: LawyerApprovalStatus) -> str:
    if status == LawyerApprovalStatus.APPROVED:
        return "verified"
    if status in (LawyerApprovalStatus.REJECTED, LawyerApprovalStatus.SUSPENDED):
        return "rejected"
    return "pending"


async def load_lawyers(
    db: AsyncSession,
    user_ids: Optional[Iterable[uuid.UUID]] = None,
    statuses: Optional[set[LawyerApprovalStatus]] = None,
    include_license: bool = False,
) -> list[dict]:
    stmt = (
        select(LawyerProfile, User)
        .join(User, User.id == LawyerProfile.user_id)
        .where(User.deleted_at.is_(None))
        .order_by(LawyerProfile.rating_avg.desc(), User.full_name)
    )
    if user_ids is not None:
        stmt = stmt.where(LawyerProfile.user_id.in_(list(user_ids)))
    if statuses is not None:
        stmt = stmt.where(LawyerProfile.approval_status.in_(list(statuses)))
    rows = (await db.execute(stmt)).all()
    if not rows:
        return []
    ids = [p.user_id for p, _ in rows]

    areas: dict[uuid.UUID, list[tuple[str, str]]] = {i: [] for i in ids}
    for lawyer_id, name_en, name_bn in (
        await db.execute(
            select(LawyerSpecialization.lawyer_id, Specialization.name_en, Specialization.name_bn)
            .join(Specialization, Specialization.id == LawyerSpecialization.specialization_id)
            .where(LawyerSpecialization.lawyer_id.in_(ids))
        )
    ).all():
        areas[lawyer_id].append((name_en, name_bn))

    fees: dict[uuid.UUID, list[LawyerFee]] = {i: [] for i in ids}
    for fee in (await db.scalars(select(LawyerFee).where(LawyerFee.lawyer_id.in_(ids), LawyerFee.is_active.is_(True)))).all():
        fees[fee.lawyer_id].append(fee)

    weekday = datetime.now(timezone.utc).weekday()
    available_today = set(
        (await db.scalars(
            select(AvailabilityRule.lawyer_id).where(
                AvailabilityRule.lawyer_id.in_(ids), AvailabilityRule.weekday == weekday, AvailabilityRule.is_active.is_(True)
            )
        )).all()
    )

    # Completed verifications / consultations handled by each lawyer.
    totals: dict[tuple[uuid.UUID, str], int] = {}
    for lawyer_id, kind, count in (
        await db.execute(
            select(AppRecord.lawyer_id, AppRecord.kind, func.count())
            .where(
                AppRecord.lawyer_id.in_(ids),
                AppRecord.kind.in_(["verification", "consultation"]),
                AppRecord.data["status"].astext == "completed",
            )
            .group_by(AppRecord.lawyer_id, AppRecord.kind)
        )
    ).all():
        totals[(lawyer_id, kind)] = count

    extras: dict[uuid.UUID, dict] = {}
    for rec in (await db.scalars(select(AppRecord).where(AppRecord.kind.in_(["lawyer_extra", "license"]), AppRecord.lawyer_id.in_(ids)))).all():
        extras.setdefault(rec.lawyer_id, {})[rec.kind] = rec.data

    result = []
    for profile, user in rows:
        uid = profile.user_id
        extra = extras.get(uid, {}).get("lawyer_extra", {})
        fee_list = sorted(fees[uid], key=lambda f: f.amount)
        district = profile.district or ""
        court = COURTS.get(profile.court_level) if profile.court_level else None
        item = {
            "id": str(uid),
            "userId": str(uid),
            "fullName": user.full_name,
            "fullNameBn": extra.get("fullNameBn") or user.full_name,
            "title": extra.get("title") or "Advocate",
            "titleBn": extra.get("titleBn") or "আইনজীবী",
            "avatarUrl": user.avatar_url or "/logo.svg",
            "district": district,
            "districtBn": DISTRICT_BN.get(district.lower(), district),
            "barEnrolmentNo": profile.bar_council_enrollment_no,
            "enrolmentYear": profile.enrollment_year or 0,
            "verificationStatus": verification_status(profile.approval_status),
            "practiceAreas": [a[0] for a in areas[uid]],
            "practiceAreasBn": [a[1] for a in areas[uid]],
            "courts": [court[0]] if court else [],
            "courtsBn": [court[1]] if court else [],
            "languages": [LANGUAGES.get(code, code) for code in (profile.languages or [])],
            "bioBn": profile.bio_bn or profile.bio_en or "",
            "bioEn": profile.bio_en or profile.bio_bn or "",
            "experienceYears": profile.years_of_experience or 0,
            "startingFeeBdt": float(fee_list[0].amount) if fee_list else 0,
            "fees": [
                {"mode": MODE_OUT[f.mode], "feeBdt": float(f.amount), "durationMinutes": f.duration_minutes}
                for f in fee_list
            ],
            "rating": float(profile.rating_avg or 0),
            "reviewCount": profile.rating_count or 0,
            "responseTimeCommitment": extra.get("responseTimeCommitment") or "Usually responds within 24 hours",
            "responseTimeCommitmentBn": extra.get("responseTimeCommitmentBn") or "সাধারণত ২৪ ঘণ্টার মধ্যে সাড়া দেন",
            "totalVerifications": totals.get((uid, "verification"), 0),
            "totalConsultations": totals.get((uid, "consultation"), 0),
            "education": extra.get("education") or [],
            "educationBn": extra.get("educationBn") or [],
            "isAvailableToday": uid in available_today and not extra.get("vacationMode"),
            "awayNotice": (
                profile.rejection_reason if profile.approval_status == LawyerApprovalStatus.REJECTED
                else "Currently on leave — not taking new consultations" if extra.get("vacationMode") else None
            ),
        }
        if include_license:
            license_rec = extras.get(uid, {}).get("license")
            if license_rec:
                item["licenseDocumentUrl"] = license_rec.get("url")
                item["licenseDocumentName"] = license_rec.get("name")
        result.append(item)
    return result


async def load_lawyer(db: AsyncSession, user_id: uuid.UUID, include_license: bool = False) -> Optional[dict]:
    found = await load_lawyers(db, user_ids=[user_id], include_license=include_license)
    return found[0] if found else None


async def lawyer_name(db: AsyncSession, user_id: uuid.UUID) -> tuple[str, str, str]:
    """(name, Bangla name, avatar) for denormalised display fields."""
    user = await db.get(User, user_id)
    if user is None:
        return ("", "", "/logo.svg")
    extra = await db.scalar(
        select(AppRecord.data).where(AppRecord.kind == "lawyer_extra", AppRecord.lawyer_id == user_id)
    )
    return (user.full_name, (extra or {}).get("fullNameBn") or user.full_name, user.avatar_url or "/logo.svg")


def money(value: float) -> Decimal:
    return Decimal(str(round(float(value), 2)))
