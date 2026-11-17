"""Consultation time slots: validation and the lawyer's open slots.

All times are Bangladesh time (UTC+6, no daylight saving). A slot is a date "YYYY-MM-DD" plus a
start time "HH:MM".
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, time, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, ValidationAppError
from app.models.app_record import AppRecord
from app.models.profile import AvailabilityRule

BD_TZ = timezone(timedelta(hours=6))
MIN_LEAD = timedelta(hours=1)  # book at least an hour ahead
MAX_AHEAD_DAYS = 90
ACTIVE = ["requested", "accepted", "scheduled"]


def now_bd() -> datetime:
    return datetime.now(BD_TZ)


def parse_slot(slot_date: str, slot_time: str) -> datetime:
    try:
        d = date.fromisoformat(slot_date.strip())
        t = datetime.strptime(slot_time.strip()[:5], "%H:%M").time()
    except ValueError as exc:
        raise ValidationAppError("Choose a valid date and time.", "সঠিক তারিখ ও সময় নির্বাচন করুন।") from exc
    return datetime.combine(d, t, tzinfo=BD_TZ)


async def active_rules(db: AsyncSession, lawyer_id: uuid.UUID) -> list[AvailabilityRule]:
    rows = await db.scalars(
        select(AvailabilityRule).where(AvailabilityRule.lawyer_id == lawyer_id, AvailabilityRule.is_active.is_(True))
    )
    return list(rows.all())


async def booked_slots(db: AsyncSession, lawyer_id: uuid.UUID, exclude_id: Optional[uuid.UUID] = None) -> set[tuple[str, str]]:
    """Times already fixed for this lawyer's active consultations."""
    rows = await db.scalars(
        select(AppRecord).where(
            AppRecord.kind == "consultation", AppRecord.lawyer_id == lawyer_id,
            AppRecord.data["status"].astext.in_(["accepted", "scheduled"]),
        )
    )
    taken = set()
    for rec in rows.all():
        s = rec.data.get("scheduledSlot") or {}
        if rec.id != exclude_id and s.get("date") and s.get("time"):
            taken.add((s["date"], s["time"][:5]))
    return taken


def _in_rules(when: datetime, rules: list[AvailabilityRule]) -> bool:
    t = when.time()
    return any(r.weekday == when.weekday() and r.start_time <= t < r.end_time for r in rules)


async def validate_slot(
    db: AsyncSession,
    lawyer_id: uuid.UUID,
    slot_date: str,
    slot_time: str,
    *,
    enforce_hours: bool,
    exclude_id: Optional[uuid.UUID] = None,
) -> datetime:
    """Raises a friendly error unless the slot is in the future, within range, free, and (for client
    bookings) inside the lawyer's weekly hours."""
    when = parse_slot(slot_date, slot_time)
    now = now_bd()
    if when < now + MIN_LEAD:
        raise ValidationAppError(
            "That time has already passed or is too soon. Please choose a time at least 1 hour from now.",
            "সময়টি পার হয়ে গেছে বা খুব কাছাকাছি। অন্তত ১ ঘণ্টা পরের একটি সময় নির্বাচন করুন।",
        )
    if when > now + timedelta(days=MAX_AHEAD_DAYS):
        raise ValidationAppError(
            f"Please choose a time within the next {MAX_AHEAD_DAYS} days.",
            f"আগামী {MAX_AHEAD_DAYS} দিনের মধ্যে একটি সময় নির্বাচন করুন।",
        )
    if enforce_hours:
        rules = await active_rules(db, lawyer_id)
        if rules and not _in_rules(when, rules):
            raise ValidationAppError(
                "The lawyer is not available at that time. Please pick one of their open slots.",
                "এই সময়ে আইনজীবী পাওয়া যাবে না। তাঁর খালি সময়গুলোর একটি নির্বাচন করুন।",
            )
    if (when.date().isoformat(), when.strftime("%H:%M")) in await booked_slots(db, lawyer_id, exclude_id):
        raise ConflictError(
            "That time is already booked. Please choose another slot.",
            "এই সময়টি ইতিমধ্যে বুক করা হয়েছে। অন্য একটি সময় নির্বাচন করুন।",
        )
    return when


async def open_slots(db: AsyncSession, lawyer_id: uuid.UUID, days: int = 14) -> list[dict]:
    """The lawyer's bookable slots for the coming days (future, inside weekly hours, not yet taken)."""
    rules = await active_rules(db, lawyer_id)
    if not rules:
        return []
    taken = await booked_slots(db, lawyer_id)
    earliest = now_bd() + MIN_LEAD
    out = []
    for offset in range(days + 1):
        day = earliest.date() + timedelta(days=offset)
        for r in sorted((r for r in rules if r.weekday == day.weekday()), key=lambda r: r.start_time):
            step = timedelta(minutes=r.slot_minutes or 30)
            cur = datetime.combine(day, r.start_time, tzinfo=BD_TZ)
            end = datetime.combine(day, r.end_time, tzinfo=BD_TZ)
            while cur + step <= end:
                key = (day.isoformat(), cur.strftime("%H:%M"))
                if cur >= earliest and key not in taken:
                    out.append({"date": key[0], "time": key[1]})
                cur += step
    return out
