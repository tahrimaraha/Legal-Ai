"""Rung 3: citizen ↔ lawyer message threads, video meetings started from them,
and reports of abusive messages."""
from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.core.exceptions import ForbiddenError, IllegalStateTransitionError, NotFoundError
from app.core.security import hash_otp, verify_otp
from app.models.consultation import Consultation, MessageThread, ThreadMessage
from app.models.enums import (
    FlaggedStatus,
    MeetingStatus,
    ReportedAction,
    ThreadOrigin,
    ThreadStatus,
    UserRole,
    VideoProviderEnum,
)
from app.models.moderation import ReportedMessage
from app.models.profile import LawyerProfile
from app.models.user import User
from app.models.video import VideoMeeting
from app.schemas.messaging import MeetingOut, MessageReportOut, ThreadMessageOut, ThreadOut
from app.services.lawyer_service import DEFAULT_AVATAR
from app.services.mappers import MODE_FROM_DB, as_uuid, iso
from app.services.notification_service import notify

MEETING_LENGTH = timedelta(hours=1)
_CODE_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"


# --- threads ---------------------------------------------------------------

def _thread_query(user: User):
    stmt = select(MessageThread).options(selectinload(MessageThread.messages))
    if user.role == UserRole.CITIZEN:
        stmt = stmt.where(MessageThread.citizen_id == user.id)
    elif user.role == UserRole.LAWYER:
        stmt = stmt.where(MessageThread.lawyer_id == user.id)
    return stmt


async def _threads_out(db: AsyncSession, viewer: User, threads: list[MessageThread]) -> list[ThreadOut]:
    ids = {t.citizen_id for t in threads} | {t.lawyer_id for t in threads}
    users = {u.id: u for u in (await db.scalars(select(User).where(User.id.in_(ids)))).all()} if ids else {}
    profiles = {p.user_id: p for p in (await db.scalars(
        select(LawyerProfile).where(LawyerProfile.user_id.in_({t.lawyer_id for t in threads}))
    )).all()} if threads else {}
    consultation_ids = [t.origin_id for t in threads if t.origin == ThreadOrigin.CONSULTATION]
    modes = dict((await db.execute(
        select(Consultation.id, Consultation.mode).where(Consultation.id.in_(consultation_ids))
    )).all()) if consultation_ids else {}
    live = {m.thread_id: m for m in (await db.scalars(select(VideoMeeting).where(
        VideoMeeting.thread_id.in_([t.id for t in threads]), VideoMeeting.status == MeetingStatus.LIVE
    ))).all()} if threads else {}

    out = []
    for t in threads:
        citizen, lawyer, profile = users.get(t.citizen_id), users.get(t.lawyer_id), profiles.get(t.lawyer_id)
        visible = [m for m in t.messages if not m.is_deleted]
        last = visible[-1] if visible else None
        meeting = live.get(t.id)
        out.append(ThreadOut(
            id=str(t.id),
            citizen_id=str(t.citizen_id),
            citizen_name=citizen.full_name if citizen else "",
            lawyer_id=str(t.lawyer_id),
            lawyer_name=lawyer.full_name if lawyer else "",
            lawyer_name_bn=(profile.full_name_bn if profile else None) or (lawyer.full_name if lawyer else ""),
            lawyer_avatar=(lawyer.avatar_url if lawyer else None) or DEFAULT_AVATAR,
            consultation_id=str(t.origin_id) if t.origin == ThreadOrigin.CONSULTATION else None,
            verification_id=str(t.origin_id) if t.origin == ThreadOrigin.VERIFICATION else None,
            context_title_bn=t.context_title_bn or "",
            context_title_en=t.context_title_en or "",
            is_locked=t.status != ThreadStatus.OPEN,
            unread_count=t.lawyer_unread_count if viewer.id == t.lawyer_id else t.citizen_unread_count,
            last_message=last.body if last else "",
            last_message_at=iso((last.created_at if last else None) or t.accepted_at or t.created_at),
            messages=[
                ThreadMessageOut(
                    id=str(m.id), sender_id=str(m.sender_id),
                    sender_role="lawyer" if m.sender_id == t.lawyer_id else "citizen",
                    text=m.body, created_at=iso(m.created_at), is_read=m.read_at is not None,
                )
                for m in visible
            ],
            mode=MODE_FROM_DB.get(modes.get(t.origin_id)) if t.origin_id in modes else None,
            meeting_link=_meeting_link(meeting.join_code) if meeting else None,
            active_meeting_code=meeting.join_code if meeting else None,
        ))
    return out


async def list_threads(db: AsyncSession, user: User) -> list[ThreadOut]:
    threads = (await db.scalars(
        _thread_query(user).order_by(MessageThread.last_message_at.desc().nullslast(), MessageThread.created_at.desc())
    )).all()
    return await _threads_out(db, user, list(threads))


async def _thread(db: AsyncSession, user: User, thread_id: str, *, refresh: bool = False) -> MessageThread:
    stmt = _thread_query(user).where(MessageThread.id == as_uuid(thread_id, "Thread"))
    if refresh:
        stmt = stmt.execution_options(populate_existing=True)
    t = await db.scalar(stmt)
    if t is None:
        raise NotFoundError("Conversation thread not found.", "বার্তা থ্রেডটি পাওয়া যায়নি।")
    return t


async def _reload_thread(db: AsyncSession, user: User, thread_id) -> ThreadOut:
    return (await _threads_out(db, user, [await _thread(db, user, str(thread_id), refresh=True)]))[0]


async def get_thread(db: AsyncSession, user: User, thread_id: str) -> ThreadOut:
    """Opening a thread marks the other side's messages as read."""
    t = await _thread(db, user, thread_id)
    now = datetime.now(timezone.utc)
    for m in t.messages:
        if m.sender_id != user.id and m.read_at is None:
            m.read_at = now
    if user.id == t.lawyer_id:
        t.lawyer_unread_count = 0
    else:
        t.citizen_unread_count = 0
    await db.commit()
    return await _reload_thread(db, user, t.id)


async def send_message(db: AsyncSession, user: User, thread_id: str, text: str) -> ThreadOut:
    t = await _thread(db, user, thread_id)
    if t.status != ThreadStatus.OPEN:
        raise IllegalStateTransitionError("This conversation is closed.", "এই কথোপকথনটি বন্ধ রয়েছে।")
    now = datetime.now(timezone.utc)
    db.add(ThreadMessage(thread_id=t.id, sender_id=user.id, body=text.strip()))
    t.last_message_at = now
    recipient = t.citizen_id if user.id == t.lawyer_id else t.lawyer_id
    if user.id == t.lawyer_id:
        t.citizen_unread_count += 1
        link = f"/app/messages/{t.id}"
    else:
        t.lawyer_unread_count += 1
        link = f"/lawyer/messages/{t.id}"
    notify(db, recipient, "new_message",
           title_bn=f"{user.full_name} এর নতুন বার্তা", title_en=f"New message from {user.full_name}",
           body_bn=text[:200], body_en=text[:200], link=link)
    await db.commit()
    return await _reload_thread(db, user, t.id)


# --- meetings ----------------------------------------------------------------

def _meeting_link(code: str) -> str:
    return f"{settings.frontend_url}/app/meeting/{code}"


def _invite_link(code: str, passcode: str) -> str:
    """One-click join link for invitees: carries the password, so only the host gets it."""
    return f"{settings.frontend_url}/app/meeting/join?code={code}&pwd={passcode}"


def _invite_text(lawyer: User, m: VideoMeeting) -> str:
    title = m.title or "Consultation"
    return (
        f"📹 ভিডিও মিটিং-এর আমন্ত্রণ / Video meeting invitation — {title}\n"
        f"{lawyer.full_name} আপনাকে একটি ভিডিও মিটিং-এ আমন্ত্রণ জানিয়েছেন।\n\n"
        f"Join link: {_invite_link(m.join_code, m.passcode or '')}\n"
        f"Meeting code / মিটিং কোড: {m.join_code}\n"
        f"Password / পাসওয়ার্ড: {m.passcode}\n\n"
        "লিংকে ক্লিক করুন, অথবা \"Join Meeting\" পাতায় কোড ও পাসওয়ার্ড দিন।\n"
        "Open the link, or enter the code and password on the \"Join Meeting\" page."
    )


def _new_code() -> str:
    seg = lambda n: "".join(secrets.choice(_CODE_ALPHABET) for _ in range(n))  # noqa: E731
    return f"{seg(3)}-{seg(4)}-{seg(3)}"


async def _meeting_out(db: AsyncSession, viewer: User, m: VideoMeeting) -> MeetingOut:
    people = {u.id: u for u in (await db.scalars(
        select(User).where(User.id.in_([i for i in (m.host_lawyer_id, m.citizen_id) if i]))
    )).all()}
    host, citizen = people.get(m.host_lawyer_id), people.get(m.citizen_id)
    return MeetingOut(
        id=str(m.id), code=m.join_code,
        password=(m.passcode or "") if viewer.id == m.host_lawyer_id else "",
        link=_invite_link(m.join_code, m.passcode or "") if viewer.id == m.host_lawyer_id else _meeting_link(m.join_code),
        title=m.title or "",
        host_lawyer_id=str(m.host_lawyer_id), host_lawyer_name=host.full_name if host else "",
        citizen_id=str(m.citizen_id) if m.citizen_id else "", citizen_name=citizen.full_name if citizen else "",
        thread_id=str(m.thread_id) if m.thread_id else None,
        status="ended" if m.status in (MeetingStatus.ENDED, MeetingStatus.CANCELLED) else "live",
        created_at=iso(m.created_at), ended_at=iso(m.ended_at),
    )


async def create_meeting(
    db: AsyncSession, lawyer: User, citizen_id: Optional[str], title: str, thread_id: Optional[str]
) -> MeetingOut:
    """Lawyers can always start a meeting. With a thread, the invite is posted there;
    without one it is an open meeting the lawyer shares later (link or code + password)."""
    citizen_uuid = None
    thread = None
    if thread_id:
        thread = await _thread(db, lawyer, thread_id)
        if thread.status != ThreadStatus.OPEN:
            raise IllegalStateTransitionError("This conversation is closed.", "এই কথোপকথনটি বন্ধ রয়েছে।")
        citizen_uuid = thread.citizen_id
    elif citizen_id:
        citizen = await db.get(User, as_uuid(citizen_id, "Citizen"))
        if citizen is None or citizen.role != UserRole.CITIZEN:
            raise NotFoundError("Client not found.", "ক্লায়েন্ট পাওয়া যায়নি।")
        citizen_uuid = citizen.id
    code = _new_code()
    while await db.scalar(select(VideoMeeting.id).where(VideoMeeting.join_code == code)):
        code = _new_code()
    passcode = f"{secrets.randbelow(900000) + 100000}"
    now = datetime.now(timezone.utc)
    meeting = VideoMeeting(
        host_lawyer_id=lawyer.id, citizen_id=citizen_uuid, thread_id=thread.id if thread else None,
        consultation_id=thread.origin_id if thread and thread.origin == ThreadOrigin.CONSULTATION else None,
        provider=VideoProviderEnum(settings.video_provider.upper()),
        room_name=f"legalai-{code}", join_code=code, passcode=passcode, passcode_hash=hash_otp(passcode),
        scheduled_start=now, scheduled_end=now + MEETING_LENGTH, started_at=now,
        status=MeetingStatus.LIVE, title=title,
    )
    db.add(meeting)
    await db.flush()
    if thread is not None:
        _post_invite(db, lawyer, thread, meeting)
    elif citizen_uuid is not None:
        _notify_invite(db, lawyer, citizen_uuid, meeting)
    await db.commit()
    await db.refresh(meeting)
    return await _meeting_out(db, lawyer, meeting)


def _notify_invite(db: AsyncSession, lawyer: User, citizen_id, m: VideoMeeting) -> None:
    notify(db, citizen_id, "system",
           title_bn="ভিডিও মিটিং-এর আমন্ত্রণ", title_en="Video meeting invitation",
           body_bn=f"{lawyer.full_name} আপনাকে একটি ভিডিও মিটিং-এ আমন্ত্রণ জানিয়েছেন।",
           body_en=f"{lawyer.full_name} invited you to a video meeting.",
           link=f"/app/meeting/join?code={m.join_code}&pwd={m.passcode}")


def _post_invite(db: AsyncSession, lawyer: User, thread: MessageThread, m: VideoMeeting) -> None:
    """Posts the invite into the client's thread (as a normal lawyer message) and notifies them."""
    now = datetime.now(timezone.utc)
    db.add(ThreadMessage(thread_id=thread.id, sender_id=lawyer.id, body=_invite_text(lawyer, m)))
    thread.last_message_at = now
    thread.citizen_unread_count += 1
    _notify_invite(db, lawyer, thread.citizen_id, m)


async def invite_to_meeting(db: AsyncSession, lawyer: User, meeting_id: str, thread_id: str) -> MeetingOut:
    """Sends a live meeting's invite to a client through their message thread."""
    m = await db.get(VideoMeeting, as_uuid(meeting_id, "Meeting"))
    if m is None or m.host_lawyer_id != lawyer.id:
        raise NotFoundError("Meeting not found.", "মিটিং পাওয়া যায়নি।")
    if m.status in (MeetingStatus.ENDED, MeetingStatus.CANCELLED):
        raise IllegalStateTransitionError("This meeting has already ended.", "এই মিটিংটি শেষ হয়ে গেছে।")
    thread = await _thread(db, lawyer, thread_id)
    if thread.status != ThreadStatus.OPEN:
        raise IllegalStateTransitionError("This conversation is closed.", "এই কথোপকথনটি বন্ধ রয়েছে।")
    # A meeting is one-to-one: once it belongs to a client, it can't be handed to another.
    if m.citizen_id is not None and m.citizen_id != thread.citizen_id:
        raise IllegalStateTransitionError(
            "This meeting is already for another client. Start a new meeting for this client.",
            "এই মিটিংটি অন্য একজন ক্লায়েন্টের জন্য। এই ক্লায়েন্টের জন্য নতুন মিটিং শুরু করুন।",
        )
    m.citizen_id = thread.citizen_id
    m.thread_id = m.thread_id or thread.id
    _post_invite(db, lawyer, thread, m)
    await db.commit()
    await db.refresh(m)
    return await _meeting_out(db, lawyer, m)


async def _meeting_by_code(db: AsyncSession, code: str) -> Optional[VideoMeeting]:
    return await db.scalar(select(VideoMeeting).where(VideoMeeting.join_code == code.strip().lower()))


async def get_meeting(db: AsyncSession, user: User, code: str) -> MeetingOut:
    m = await _meeting_by_code(db, code)
    if m is None or user.id not in (m.host_lawyer_id, m.citizen_id):
        raise NotFoundError("Meeting not found.", "মিটিং পাওয়া যায়নি।")
    return await _meeting_out(db, user, m)


async def join_meeting(db: AsyncSession, user: User, code: str, password: str) -> tuple[Optional[MeetingOut], Optional[str]]:
    m = await _meeting_by_code(db, code)
    if m is None:
        return None, "No meeting found with this code."
    if m.status in (MeetingStatus.ENDED, MeetingStatus.CANCELLED):
        return None, "This meeting has already ended."
    if not verify_otp(password.strip(), m.passcode_hash):
        return None, "Incorrect password."
    if user.id == m.host_lawyer_id:
        return await _meeting_out(db, user, m), None
    if user.role != UserRole.CITIZEN:
        return None, "Only clients can join as a participant."
    if m.citizen_id is not None and m.citizen_id != user.id:
        return None, "This meeting is for another client."
    if m.citizen_id is None:
        m.citizen_id = user.id
        await db.commit()
    return await _meeting_out(db, user, m), None


async def end_meeting(db: AsyncSession, lawyer: User, meeting_id: str) -> MeetingOut:
    m = await db.get(VideoMeeting, as_uuid(meeting_id, "Meeting"))
    if m is None or m.host_lawyer_id != lawyer.id:
        raise NotFoundError("Meeting not found.", "মিটিং পাওয়া যায়নি।")
    m.status, m.ended_at = MeetingStatus.ENDED, datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(m)
    return await _meeting_out(db, lawyer, m)


# --- reports -----------------------------------------------------------------

REPORT_STATUS = {
    FlaggedStatus.OPEN: "pending", FlaggedStatus.UNDER_REVIEW: "pending",
    FlaggedStatus.RESOLVED: "reviewed", FlaggedStatus.DISMISSED: "dismissed",
}


async def report_message(db: AsyncSession, user: User, thread_id: str, message_id: str,
                         category: str, details: Optional[str]) -> MessageReportOut:
    t = await _thread(db, user, thread_id)
    message = next((m for m in t.messages if str(m.id) == message_id), None)
    if message is None:
        raise NotFoundError("Message not found.", "বার্তাটি পাওয়া যায়নি।")
    if message.sender_id == user.id:
        raise ForbiddenError("You can't report your own message.", "নিজের বার্তা রিপোর্ট করা যায় না।")
    report = ReportedMessage(thread_message_id=message.id, reporter_id=user.id, reason_code=category, description=details)
    db.add(report)
    await db.commit()
    return (await _reports_out(db, [report]))[0]


async def _reports_out(db: AsyncSession, reports: list[ReportedMessage]) -> list[MessageReportOut]:
    if not reports:
        return []
    messages = {m.id: m for m in (await db.scalars(
        select(ThreadMessage).where(ThreadMessage.id.in_([r.thread_message_id for r in reports]))
    )).all()}
    threads = {t.id: t for t in (await db.scalars(
        select(MessageThread).where(MessageThread.id.in_({m.thread_id for m in messages.values()}))
    )).all()}
    user_ids = {r.reporter_id for r in reports} | {m.sender_id for m in messages.values()}
    users = {u.id: u for u in (await db.scalars(select(User).where(User.id.in_(user_ids)))).all()}
    out = []
    for r in reports:
        m = messages[r.thread_message_id]
        t = threads[m.thread_id]
        reporter, sender = users.get(r.reporter_id), users.get(m.sender_id)
        out.append(MessageReportOut(
            id=str(r.id), thread_id=str(t.id), message_id=str(m.id), message_snapshot=m.body,
            reported_by_role="lawyer" if r.reporter_id == t.lawyer_id else "citizen",
            reported_by_name=reporter.full_name if reporter else "",
            reported_against_name=sender.full_name if sender else "",
            reason_category=r.reason_code, reason_details=r.description,
            status=REPORT_STATUS[r.status], created_at=iso(r.created_at),
        ))
    return out


async def list_reports(db: AsyncSession) -> list[MessageReportOut]:
    reports = (await db.scalars(select(ReportedMessage).order_by(ReportedMessage.created_at.desc()))).all()
    return await _reports_out(db, list(reports))


async def resolve_report(db: AsyncSession, admin: User, report_id: str, action: str) -> None:
    r = await db.get(ReportedMessage, as_uuid(report_id, "Report"))
    if r is None:
        raise NotFoundError("Report not found.", "রিপোর্টটি পাওয়া যায়নি।")
    r.resolved_by = admin.id
    if action == "dismiss":
        r.status, r.action = FlaggedStatus.DISMISSED, ReportedAction.NONE
    else:
        r.status = FlaggedStatus.RESOLVED
        r.action = ReportedAction.WARNING if action == "warn" else ReportedAction.THREAD_BLOCKED
        message = await db.get(ThreadMessage, r.thread_message_id)
        if action == "escalate":
            thread = await db.get(MessageThread, message.thread_id)
            thread.status = ThreadStatus.BLOCKED
        else:
            notify(db, message.sender_id, "system",
                   title_bn="আচরণবিধি সতর্কতা", title_en="Conduct warning",
                   body_bn="আপনার একটি বার্তা আচরণবিধি লঙ্ঘনের জন্য রিপোর্ট করা হয়েছে।",
                   body_en="One of your messages was reported for violating the code of conduct.",
                   link="/")
    await db.commit()
