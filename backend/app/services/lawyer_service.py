"""Lawyer directory, profile editing, reviews and admin approval."""
from __future__ import annotations

import uuid
from datetime import datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Optional

from slugify import slugify
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError, ValidationAppError
from app.models.consultation import Consultation
from app.models.enums import (
    ConsultationStatus,
    CredentialDocType,
    LawyerApprovalStatus,
)
from app.models.profile import (
    AvailabilityRule,
    LawyerCredential,
    LawyerFee,
    LawyerProfile,
    LawyerSpecialization,
    Specialization,
)
from app.models.user import User
from app.providers.storage import read_stored
from app.models.verification import VerificationAssignment, VerificationVerdict
from app.schemas.lawyers import (
    AvailabilityIn,
    AvailabilityOut,
    LawyerFeeOut,
    LawyerOut,
    LawyerReviewOut,
    LawyerUpdateRequest,
)
from app.services.mappers import (
    LANGUAGE_CODES,
    LANGUAGE_NAMES,
    MODE_FROM_DB,
    MODE_TO_DB,
    as_uuid,
    iso,
    lawyer_status,
)
from app.services.notification_service import notify

DEFAULT_AVATAR = "/logo.svg"


def _profile_query():
    return select(LawyerProfile, User).join(User, User.id == LawyerProfile.user_id).options(
        selectinload(LawyerProfile.specializations).selectinload(LawyerSpecialization.specialization),
        selectinload(LawyerProfile.fees),
        selectinload(LawyerProfile.credentials),
    ).where(User.deleted_at.is_(None))


async def _activity_counts(db: AsyncSession, lawyer_ids: list[uuid.UUID]) -> tuple[dict, dict]:
    if not lawyer_ids:
        return {}, {}
    verifications = dict((await db.execute(
        select(VerificationAssignment.lawyer_id, func.count(VerificationVerdict.id))
        .join(VerificationVerdict, VerificationVerdict.assignment_id == VerificationAssignment.id)
        .where(VerificationAssignment.lawyer_id.in_(lawyer_ids))
        .group_by(VerificationAssignment.lawyer_id)
    )).all())
    consultations = dict((await db.execute(
        select(Consultation.lawyer_id, func.count(Consultation.id))
        .where(Consultation.lawyer_id.in_(lawyer_ids), Consultation.status == ConsultationStatus.COMPLETED)
        .group_by(Consultation.lawyer_id)
    )).all())
    return verifications, consultations


def to_lawyer_out(profile: LawyerProfile, user: User, verifications: int = 0, consultations: int = 0) -> LawyerOut:
    specs = [ls.specialization for ls in profile.specializations]
    fees = sorted((f for f in profile.fees if f.is_active), key=lambda f: f.amount)
    license_doc = next((c for c in profile.credentials if c.doc_type == CredentialDocType.BAR_LICENSE), None)
    rejected = profile.approval_status == LawyerApprovalStatus.REJECTED
    return LawyerOut(
        id=str(user.id),
        user_id=str(user.id),
        full_name=user.full_name,
        full_name_bn=profile.full_name_bn or user.full_name,
        title=profile.title_en or "Advocate",
        title_bn=profile.title_bn or "আইনজীবী",
        avatar_url=user.avatar_url or DEFAULT_AVATAR,
        district=profile.district or "",
        district_bn=profile.district_bn or profile.district or "",
        bar_enrolment_no=profile.bar_council_enrollment_no,
        enrolment_year=profile.enrollment_year or 0,
        verification_status=lawyer_status(profile.approval_status),
        practice_areas=[s.name_en for s in specs],
        practice_areas_bn=[s.name_bn for s in specs],
        courts=profile.courts,
        courts_bn=profile.courts_bn,
        languages=[LANGUAGE_NAMES.get(code, code) for code in profile.languages],
        bio_bn=profile.bio_bn or "",
        bio_en=profile.bio_en or "",
        experience_years=profile.years_of_experience or 0,
        starting_fee_bdt=float(fees[0].amount) if fees else 0,
        fees=[LawyerFeeOut(mode=MODE_FROM_DB[f.mode], fee_bdt=float(f.amount), duration_minutes=f.duration_minutes)
              for f in fees],
        rating=float(profile.rating_avg),
        review_count=profile.rating_count,
        response_time_commitment=profile.response_time_en or "",
        response_time_commitment_bn=profile.response_time_bn or "",
        total_verifications=verifications,
        total_consultations=consultations,
        education=profile.education,
        education_bn=profile.education_bn,
        is_available_today=profile.is_available_today,
        # A rejected applicant sees why on their own profile.
        away_notice=(profile.rejection_reason if rejected else profile.away_notice) or None,
        # Admin-only endpoint; the stored file itself is never publicly served.
        license_document_url=f"/admin/lawyers/{profile.user_id}/license-document" if license_doc else None,
        license_document_name=license_doc.original_filename if license_doc else None,
    )


async def _to_outs(db: AsyncSession, rows: list[tuple[LawyerProfile, User]]) -> list[LawyerOut]:
    verifications, consultations = await _activity_counts(db, [p.user_id for p, _ in rows])
    return [to_lawyer_out(p, u, verifications.get(p.user_id, 0), consultations.get(p.user_id, 0)) for p, u in rows]


async def list_lawyers(
    db: AsyncSession, *, area: Optional[str] = None, district: Optional[str] = None,
    max_fee: Optional[float] = None, approved_only: bool = True,
) -> list[LawyerOut]:
    stmt = _profile_query().order_by(LawyerProfile.rating_avg.desc(), User.full_name)
    if approved_only:
        stmt = stmt.where(LawyerProfile.approval_status == LawyerApprovalStatus.APPROVED)
    lawyers = await _to_outs(db, (await db.execute(stmt)).all())
    if district and district != "all":
        lawyers = [l for l in lawyers if l.district.lower() == district.lower()]
    if area and area != "all":
        lawyers = [l for l in lawyers if any(area.lower() in a.lower() for a in l.practice_areas)]
    if max_fee:
        lawyers = [l for l in lawyers if l.starting_fee_bdt <= max_fee]
    return lawyers


async def _get_row(db: AsyncSession, lawyer_id: uuid.UUID, *, refresh: bool = False) -> tuple[LawyerProfile, User]:
    stmt = _profile_query().where(LawyerProfile.user_id == lawyer_id)
    if refresh:
        stmt = stmt.execution_options(populate_existing=True)
    row = (await db.execute(stmt)).first()
    if row is None:
        raise NotFoundError("Lawyer not found.", "আইনজীবী পাওয়া যায়নি।")
    return row


async def get_lawyer(db: AsyncSession, lawyer_id: str, *, refresh: bool = False) -> LawyerOut:
    profile, user = await _get_row(db, as_uuid(lawyer_id, "Lawyer"), refresh=refresh)
    return (await _to_outs(db, [(profile, user)]))[0]


async def update_me(db: AsyncSession, user: User, data: LawyerUpdateRequest) -> LawyerOut:
    profile, _ = await _get_row(db, user.id)
    fields = data.model_fields_set

    if "full_name" in fields and data.full_name:
        user.full_name = data.full_name
    if "avatar_url" in fields:
        user.avatar_url = data.avatar_url
    simple = {
        "full_name_bn": "full_name_bn", "title": "title_en", "title_bn": "title_bn",
        "district": "district", "district_bn": "district_bn", "bio_bn": "bio_bn", "bio_en": "bio_en",
        "experience_years": "years_of_experience", "courts": "courts", "courts_bn": "courts_bn",
        "education": "education", "education_bn": "education_bn",
        "response_time_commitment": "response_time_en", "response_time_commitment_bn": "response_time_bn",
        "is_available_today": "is_available_today", "away_notice": "away_notice",
    }
    for field, column in simple.items():
        if field not in fields:
            continue
        value = getattr(data, field)
        if column in ("courts", "courts_bn", "education", "education_bn"):
            value = value or []
        elif value is None and column == "is_available_today":
            continue
        setattr(profile, column, value)
    if "languages" in fields and data.languages is not None:
        profile.languages = [LANGUAGE_CODES.get(x, x[:8].lower()) for x in data.languages]

    if "practice_areas" in fields and data.practice_areas is not None:
        names_bn = data.practice_areas_bn or []
        await db.execute(delete(LawyerSpecialization).where(LawyerSpecialization.lawyer_id == user.id))
        for i, name_en in enumerate(dict.fromkeys(a.strip() for a in data.practice_areas if a.strip())):
            slug = slugify(name_en)
            spec = await db.scalar(select(Specialization).where(Specialization.slug == slug))
            if spec is None:
                spec = Specialization(slug=slug, name_en=name_en, name_bn=names_bn[i] if i < len(names_bn) else name_en)
                db.add(spec)
                await db.flush()
            db.add(LawyerSpecialization(lawyer_id=user.id, specialization_id=spec.id))

    if "fees" in fields and data.fees is not None:
        await db.execute(delete(LawyerFee).where(LawyerFee.lawyer_id == user.id))
        for fee in {f.mode: f for f in data.fees}.values():
            db.add(LawyerFee(
                lawyer_id=user.id, mode=MODE_TO_DB[fee.mode],
                amount=Decimal(str(fee.fee_bdt)), duration_minutes=fee.duration_minutes,
            ))

    await db.commit()
    return await get_lawyer(db, str(user.id), refresh=True)


async def list_reviews(db: AsyncSession, lawyer_id: str) -> list[LawyerReviewOut]:
    lid = as_uuid(lawyer_id, "Lawyer")
    rows = await db.execute(
        select(Consultation, User).join(User, User.id == Consultation.citizen_id)
        .where(Consultation.lawyer_id == lid, Consultation.citizen_rating.is_not(None))
        .order_by(Consultation.reviewed_at.desc().nullslast())
    )
    return [
        LawyerReviewOut(
            id=f"review-{c.id}", lawyer_id=str(c.lawyer_id), consultation_id=str(c.id),
            citizen_id=str(u.id), citizen_name=u.full_name, rating=c.citizen_rating,
            text=c.citizen_review or "", created_at=iso(c.reviewed_at or c.updated_at),
        )
        for c, u in rows
    ]


# --- admin -----------------------------------------------------------------

async def set_approval(db: AsyncSession, admin: User, lawyer_id: str, approve: bool, reason: Optional[str] = None) -> LawyerOut:
    profile, user = await _get_row(db, as_uuid(lawyer_id, "Lawyer"))
    now = datetime.now(timezone.utc)
    if approve:
        profile.approval_status = LawyerApprovalStatus.APPROVED
        profile.approved_by, profile.approved_at, profile.rejection_reason = admin.id, now, None
        notify(db, user.id, "system",
               title_bn="আপনার প্রোফাইল অনুমোদিত হয়েছে", title_en="Your profile has been approved",
               body_bn="অভিনন্দন! আপনি এখন নাগরিকদের যাচাই ও পরামর্শ অনুরোধ গ্রহণ করতে পারবেন।",
               body_en="Congratulations! You can now receive verification and consultation requests.",
               link="/lawyer")
    else:
        profile.approval_status = LawyerApprovalStatus.REJECTED
        profile.rejection_reason = reason or "Credentials could not be verified with Bar Council records"
        notify(db, user.id, "system",
               title_bn="প্রোফাইল অনুমোদন প্রত্যাখ্যাত", title_en="Profile approval declined",
               body_bn=profile.rejection_reason, body_en=profile.rejection_reason, link="/lawyer/profile")
    await db.commit()
    return await get_lawyer(db, lawyer_id, refresh=True)


# --- weekly availability -------------------------------------------------------

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
SLOT_MINUTES = 30


async def get_availability(db: AsyncSession, lawyer: User) -> AvailabilityOut:
    profile, _ = await _get_row(db, lawyer.id)
    rules = (await db.scalars(
        select(AvailabilityRule).where(AvailabilityRule.lawyer_id == lawyer.id, AvailabilityRule.is_active.is_(True))
    )).all()
    return AvailabilityOut(
        slots=[f"{WEEKDAYS[r.weekday]}-{r.start_time.strftime('%H:%M')}" for r in rules],
        vacation_mode=not profile.is_available_today,
    )


async def save_availability(db: AsyncSession, lawyer: User, data: AvailabilityIn) -> AvailabilityOut:
    profile, _ = await _get_row(db, lawyer.id)
    await db.execute(delete(AvailabilityRule).where(AvailabilityRule.lawyer_id == lawyer.id))
    for key in dict.fromkeys(data.slots):
        day, _, hhmm = key.partition("-")
        if day not in WEEKDAYS:
            raise ValidationAppError(f"Unknown weekday in slot {key!r}.", "সময়সূচিতে অজানা দিন রয়েছে।")
        try:
            start = time.fromisoformat(hhmm)
        except ValueError:
            raise ValidationAppError(f"Invalid time in slot {key!r}.", "সময়সূচিতে অবৈধ সময় রয়েছে।") from None
        end = (datetime.combine(datetime.min, start) + timedelta(minutes=SLOT_MINUTES)).time()
        db.add(AvailabilityRule(
            lawyer_id=lawyer.id, weekday=WEEKDAYS.index(day), start_time=start, end_time=end, slot_minutes=SLOT_MINUTES,
        ))
    profile.is_available_today = not data.vacation_mode
    await db.commit()
    return await get_availability(db, lawyer)


async def get_license_document(db: AsyncSession, lawyer_id: str) -> tuple[bytes, str, str]:
    """The lawyer's submitted bar licence / ID file as (bytes, mime type, filename)."""
    credential = await db.scalar(
        select(LawyerCredential)
        .where(
            LawyerCredential.lawyer_id == as_uuid(lawyer_id, "Lawyer"),
            LawyerCredential.doc_type == CredentialDocType.BAR_LICENSE,
        )
        .order_by(LawyerCredential.created_at.desc())
        .limit(1)
    )
    stored = read_stored(credential.file_url) if credential else None
    if stored is None:
        raise NotFoundError("No licence document found for this lawyer.", "এই আইনজীবীর কোনো লাইসেন্স ডকুমেন্ট পাওয়া যায়নি।")
    data, guessed_mime = stored
    return data, credential.mime_type or guessed_mime, credential.original_filename or "license"
