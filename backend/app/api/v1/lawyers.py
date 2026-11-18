"""`/lawyers/*` — public lawyer directory, reviews, and a lawyer editing their own profile."""
from __future__ import annotations

from datetime import datetime, time, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field
from sqlalchemy import delete as sa_delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import UnauthorizedError, ValidationAppError
from app.core.security import get_current_user, require_roles
from app.database import get_db
from app.models.app_record import AppRecord
from app.models.enums import ConsultationMode, LawyerApprovalStatus, UserRole
from app.models.profile import AvailabilityRule, LawyerFee, LawyerProfile
from app.models.user import User
from app.services import records
from app.services.lawyer_directory import load_lawyer, load_lawyers, money
from app.services.scheduling import active_rules, open_slots

router = APIRouter()
_optional_bearer = HTTPBearer(auto_error=False)


async def optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_optional_bearer),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials, db)
    except UnauthorizedError:
        return None


class LawyerProfileUpdate(BaseModel):
    fullName: Optional[str] = Field(default=None, min_length=1, max_length=255)
    fullNameBn: Optional[str] = Field(default=None, max_length=255)
    title: Optional[str] = Field(default=None, max_length=255)
    titleBn: Optional[str] = Field(default=None, max_length=255)
    district: Optional[str] = Field(default=None, max_length=100)
    bioEn: Optional[str] = Field(default=None, max_length=5000)
    bioBn: Optional[str] = Field(default=None, max_length=5000)
    startingFeeBdt: Optional[float] = Field(default=None, gt=0)
    responseTimeCommitment: Optional[str] = Field(default=None, max_length=255)
    responseTimeCommitmentBn: Optional[str] = Field(default=None, max_length=255)
    education: Optional[list[str]] = None


@router.get("/lawyers")
async def list_lawyers(
    area: Optional[str] = None,
    district: Optional[str] = None,
    maxFee: Optional[float] = Query(default=None, gt=0),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Approved lawyers only — unverified profiles are never offered to citizens."""
    lawyers = await load_lawyers(db, statuses={LawyerApprovalStatus.APPROVED})
    if district and district != "all":
        lawyers = [l for l in lawyers if l["district"].lower() == district.lower()]
    if area and area != "all":
        needle = area.lower()
        lawyers = [l for l in lawyers if any(needle in a.lower() for a in l["practiceAreas"])]
    if maxFee:
        lawyers = [l for l in lawyers if l["startingFeeBdt"] <= maxFee]
    return lawyers


@router.get("/lawyers/{lawyer_id}")
async def get_lawyer(
    lawyer_id: str, viewer: Optional[User] = Depends(optional_user), db: AsyncSession = Depends(get_db)
) -> dict:
    uid = records.parse_uuid(lawyer_id)
    lawyer = await load_lawyer(db, uid) if uid else None
    is_self_or_admin = viewer is not None and (viewer.role == UserRole.ADMIN or viewer.id == uid)
    if lawyer is None or (lawyer["verificationStatus"] != "verified" and not is_self_or_admin):
        raise records.not_found("Lawyer")
    return lawyer


@router.get("/lawyers/{lawyer_id}/open-slots")
async def lawyer_open_slots(
    lawyer_id: str, days: int = Query(default=14, ge=1, le=60), db: AsyncSession = Depends(get_db)
) -> dict:
    """Bookable times (Bangladesh time) for an approved lawyer. `hasSchedule` is false when the lawyer
    hasn't published weekly hours — the client may then propose any future time."""
    uid = records.parse_uuid(lawyer_id)
    profile = await db.get(LawyerProfile, uid) if uid else None
    if profile is None or profile.approval_status != LawyerApprovalStatus.APPROVED:
        raise records.not_found("Lawyer")
    slots = await open_slots(db, uid, days)
    return {"hasSchedule": bool(await active_rules(db, uid)), "slots": slots, "timezone": "Asia/Dhaka"}


@router.get("/lawyers/{lawyer_id}/reviews")
async def lawyer_reviews(lawyer_id: str, db: AsyncSession = Depends(get_db)) -> list[dict]:
    uid = records.parse_uuid(lawyer_id)
    if uid is None:
        return []
    rows = await db.scalars(
        select(AppRecord)
        .where(AppRecord.kind == "review", AppRecord.lawyer_id == uid)
        .order_by(AppRecord.created_at.desc())
    )
    return [records.out(r) for r in rows.all()]


@router.put("/lawyers/me")
async def update_my_profile(
    payload: LawyerProfileUpdate,
    user: User = Depends(require_roles(UserRole.LAWYER)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    profile = await db.get(LawyerProfile, user.id)
    if profile is None:
        raise records.not_found("Lawyer profile")

    if payload.fullName:
        user.full_name = payload.fullName.strip()
    if payload.district is not None:
        profile.district = payload.district.strip() or None
    if payload.bioEn is not None:
        profile.bio_en = payload.bioEn
    if payload.bioBn is not None:
        profile.bio_bn = payload.bioBn
    if payload.startingFeeBdt is not None:
        # The starting fee is the cheapest active fee; adjust that one (or create a chat fee).
        fees = (await db.scalars(
            select(LawyerFee).where(LawyerFee.lawyer_id == user.id, LawyerFee.is_active.is_(True)).order_by(LawyerFee.amount)
        )).all()
        if fees:
            fees[0].amount = money(payload.startingFeeBdt)
        else:
            db.add(LawyerFee(lawyer_id=user.id, mode=ConsultationMode.CHAT, amount=money(payload.startingFeeBdt),
                             currency="BDT", duration_minutes=20))

    extra_fields = {
        k: v for k, v in payload.model_dump(exclude_unset=True).items()
        if k in {"fullNameBn", "title", "titleBn", "responseTimeCommitment", "responseTimeCommitmentBn", "education"}
    }
    if extra_fields:
        extra = await db.scalar(
            select(AppRecord).where(AppRecord.kind == "lawyer_extra", AppRecord.lawyer_id == user.id)
        )
        if extra is None:
            await records.create(db, "lawyer_extra", extra_fields, lawyer_id=user.id)
        else:
            records.save(extra, {**extra.data, **extra_fields})

    await db.commit()
    return await load_lawyer(db, user.id)


# --- Availability -------------------------------------------------------------

WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]  # datetime.weekday() order
SLOT_MINUTES = 90


class AvailabilityIn(BaseModel):
    vacationMode: bool = False
    maxActiveConsultations: int = Field(default=5, ge=1, le=100)
    slots: list[str] = Field(default_factory=list, max_length=100)  # e.g. "Sunday-16:00"


def _parse_slot(slot: str) -> tuple[int, time]:
    day, _, hhmm = slot.partition("-")
    try:
        return WEEKDAYS.index(day), datetime.strptime(hhmm, "%H:%M").time()
    except ValueError as exc:
        raise ValidationAppError(f"Invalid slot: {slot}", "অবৈধ সময়।") from exc


@router.get("/lawyers/me/availability")
async def get_availability(user: User = Depends(require_roles(UserRole.LAWYER)), db: AsyncSession = Depends(get_db)) -> dict:
    rules = (await db.scalars(
        select(AvailabilityRule).where(AvailabilityRule.lawyer_id == user.id, AvailabilityRule.is_active.is_(True))
    )).all()
    extra = await db.scalar(select(AppRecord.data).where(AppRecord.kind == "lawyer_extra", AppRecord.lawyer_id == user.id)) or {}
    return {
        "vacationMode": bool(extra.get("vacationMode", False)),
        "maxActiveConsultations": int(extra.get("maxActiveConsultations", 5)),
        "slots": sorted(f"{WEEKDAYS[r.weekday]}-{r.start_time.strftime('%H:%M')}" for r in rules),
    }


@router.put("/lawyers/me/availability")
async def save_availability(
    payload: AvailabilityIn, user: User = Depends(require_roles(UserRole.LAWYER)), db: AsyncSession = Depends(get_db)
) -> dict:
    parsed = sorted({_parse_slot(s) for s in payload.slots})
    await db.execute(sa_delete(AvailabilityRule).where(AvailabilityRule.lawyer_id == user.id))
    for weekday, start in parsed:
        end = (datetime.combine(datetime.today(), start) + timedelta(minutes=SLOT_MINUTES)).time()
        db.add(AvailabilityRule(lawyer_id=user.id, weekday=weekday, start_time=start, end_time=end,
                                slot_minutes=SLOT_MINUTES, is_active=True))
    extra = await db.scalar(select(AppRecord).where(AppRecord.kind == "lawyer_extra", AppRecord.lawyer_id == user.id))
    settings_ = {"vacationMode": payload.vacationMode, "maxActiveConsultations": payload.maxActiveConsultations}
    if extra is None:
        await records.create(db, "lawyer_extra", settings_, lawyer_id=user.id)
    else:
        records.save(extra, {**extra.data, **settings_})
    await db.commit()
    return await get_availability(user, db)


# --- Lawyer's diary / day planner ---------------------------------------------------------------------
# The lawyer's own entries (court hearings, meetings, tasks, personal time). Entries that "block booking"
# are taken out of the open slots clients can book; consultations show up in the diary automatically.

DIARY_KINDS = ("court", "client_meeting", "task", "personal", "other")
_HHMM = r"^([01]\d|2[0-3]):[0-5]\d$"


class DiaryEntryIn(BaseModel):
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    start: str = Field(pattern=_HHMM)
    end: str = Field(pattern=_HHMM)
    title: str = Field(min_length=1, max_length=120)
    kind: str = Field(default="other", pattern="^(" + "|".join(DIARY_KINDS) + ")$")
    location: str = Field(default="", max_length=160)
    notes: str = Field(default="", max_length=2000)
    blocksBooking: bool = True
    done: bool = False


def _check_entry(e: DiaryEntryIn) -> None:
    from datetime import date as _date
    try:
        _date.fromisoformat(e.date)
    except ValueError as exc:
        raise ValidationAppError("Choose a valid date.", "সঠিক তারিখ দিন।") from exc
    if e.end <= e.start:
        raise ValidationAppError("The end time must be after the start time.", "শেষের সময় শুরুর সময়ের পরে হতে হবে।")


async def _diary_conflicts(db: AsyncSession, lawyer_id, e: DiaryEntryIn) -> list[dict]:
    """Booked consultations that overlap a busy entry — returned as a warning, not an error."""
    if not e.blocksBooking:
        return []
    rows = await db.scalars(select(AppRecord).where(
        AppRecord.kind == "consultation", AppRecord.lawyer_id == lawyer_id,
        AppRecord.data["status"].astext.in_(["accepted", "scheduled"]),
        AppRecord.data["scheduledSlot"]["date"].astext == e.date,
    ))
    out = []
    for rec in rows.all():
        t = (rec.data.get("scheduledSlot") or {}).get("time", "")[:5]
        if t and e.start <= t < e.end:
            out.append({"id": str(rec.id), "time": t, "citizenName": rec.data.get("citizenName", "")})
    return out


async def _own_entry(db: AsyncSession, entry_id: str, user: User) -> AppRecord:
    rec = await records.get(db, "diary_entry", entry_id)
    if rec.lawyer_id != user.id:
        raise records.not_found("Diary entry")
    return rec


@router.get("/lawyers/me/diary")
async def get_diary(
    start: str = Query(pattern=r"^\d{4}-\d{2}-\d{2}$"),
    days: int = Query(default=7, ge=1, le=42),
    user: User = Depends(require_roles(UserRole.LAWYER)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Everything on the lawyer's calendar for [start, start+days): own entries, consultations, weekly hours."""
    from datetime import date as _date
    try:
        first = _date.fromisoformat(start)
    except ValueError as exc:
        raise ValidationAppError("Choose a valid date.", "সঠিক তারিখ দিন।") from exc
    last = (first + timedelta(days=days - 1)).isoformat()
    entries = (await db.scalars(select(AppRecord).where(
        AppRecord.kind == "diary_entry", AppRecord.lawyer_id == user.id,
        AppRecord.data["date"].astext >= first.isoformat(), AppRecord.data["date"].astext <= last,
    ))).all()
    consults = (await db.scalars(select(AppRecord).where(
        AppRecord.kind == "consultation", AppRecord.lawyer_id == user.id,
        AppRecord.data["status"].astext.in_(["requested", "accepted", "scheduled", "completed"]),
    ))).all()
    sessions = []
    for rec in consults:
        d = rec.data
        base = {"id": str(rec.id), "citizenName": d.get("citizenName", ""), "topic": d.get("topicEn") or d.get("topicBn", ""),
                "mode": d.get("mode", ""), "status": d.get("status", "")}
        slots = [d.get("scheduledSlot")] if d.get("scheduledSlot") else (d.get("preferredSlots") or [])[:1] if d.get("status") == "requested" else []
        for s in slots:
            if s and first.isoformat() <= s.get("date", "") <= last:
                sessions.append({**base, "date": s["date"], "time": s.get("time", "")[:5]})
    rules = await active_rules(db, user.id)
    extra = await db.scalar(select(AppRecord.data).where(AppRecord.kind == "lawyer_extra", AppRecord.lawyer_id == user.id)) or {}
    return {
        "entries": sorted((records.out(e) for e in entries), key=lambda e: (e.get("date", ""), e.get("start", ""))),
        "consultations": sorted(sessions, key=lambda s: (s["date"], s["time"])),
        "hours": sorted(({"weekday": WEEKDAYS[r.weekday], "start": r.start_time.strftime("%H:%M"),
                          "end": r.end_time.strftime("%H:%M")} for r in rules), key=lambda h: (h["weekday"], h["start"])),
        "vacationMode": bool(extra.get("vacationMode", False)),
    }


@router.post("/lawyers/me/diary")
async def create_diary_entry(payload: DiaryEntryIn, user: User = Depends(require_roles(UserRole.LAWYER)),
                             db: AsyncSession = Depends(get_db)) -> dict:
    _check_entry(payload)
    now = records.now_iso()
    rec = await records.create(db, "diary_entry", {**payload.model_dump(), "createdAt": now, "updatedAt": now},
                               owner_id=user.id, lawyer_id=user.id)
    conflicts = await _diary_conflicts(db, user.id, payload)
    await db.commit()
    return {"entry": records.out(rec), "conflicts": conflicts}


@router.put("/lawyers/me/diary/{entry_id}")
async def update_diary_entry(entry_id: str, payload: DiaryEntryIn, user: User = Depends(require_roles(UserRole.LAWYER)),
                             db: AsyncSession = Depends(get_db)) -> dict:
    _check_entry(payload)
    rec = await _own_entry(db, entry_id, user)
    records.save(rec, {**rec.data, **payload.model_dump(), "updatedAt": records.now_iso()})
    conflicts = await _diary_conflicts(db, user.id, payload)
    await db.commit()
    return {"entry": records.out(rec), "conflicts": conflicts}


@router.delete("/lawyers/me/diary/{entry_id}")
async def delete_diary_entry(entry_id: str, user: User = Depends(require_roles(UserRole.LAWYER)),
                             db: AsyncSession = Depends(get_db)) -> dict:
    rec = await _own_entry(db, entry_id, user)
    await db.delete(rec)
    await db.commit()
    return {"ok": True}
