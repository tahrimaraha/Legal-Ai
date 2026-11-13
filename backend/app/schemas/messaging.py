"""Schemas for `/threads`, `/meetings` and message reports (frontend `Thread`, `Meeting`, `MessageReport`)."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import Field

from app.schemas.common import CamelModel


class ThreadMessageOut(CamelModel):
    id: str
    sender_id: str
    sender_role: Literal["citizen", "lawyer"]
    text: str
    created_at: str
    is_read: bool


class ThreadOut(CamelModel):
    id: str
    citizen_id: str
    citizen_name: str
    lawyer_id: str
    lawyer_name: str
    lawyer_name_bn: str
    lawyer_avatar: str
    consultation_id: Optional[str] = None
    verification_id: Optional[str] = None
    context_title_bn: str
    context_title_en: str
    is_locked: bool
    unread_count: int
    last_message: str
    last_message_at: str
    messages: list[ThreadMessageOut]
    mode: Optional[Literal["chat", "audio", "video", "in_person"]] = None
    meeting_link: Optional[str] = None
    active_meeting_code: Optional[str] = None


class SendMessageRequest(CamelModel):
    text: str = Field(min_length=1, max_length=4000)


class MeetingOut(CamelModel):
    id: str
    code: str
    # Only the host gets the passcode back; everyone else must already know it.
    password: str = ""
    link: str
    title: str
    host_lawyer_id: str
    host_lawyer_name: str
    citizen_id: str
    citizen_name: str
    thread_id: Optional[str] = None
    status: Literal["live", "ended"]
    created_at: str
    ended_at: Optional[str] = None


class CreateMeetingRequest(CamelModel):
    # Both optional: a lawyer can always start an instant meeting and invite later.
    citizen_id: Optional[str] = None
    title: str = Field(default="Consultation", max_length=255)
    # When given, the invite (link, code, password) is posted into this thread.
    thread_id: Optional[str] = None


class InviteToMeetingRequest(CamelModel):
    thread_id: str


class JoinMeetingRequest(CamelModel):
    code: str
    password: str


class JoinMeetingResponse(CamelModel):
    ok: bool
    meeting: Optional[MeetingOut] = None
    error: Optional[str] = None


class ReportMessageRequest(CamelModel):
    thread_id: str
    message_id: str
    reason_category: str = Field(min_length=1, max_length=80)
    reason_details: Optional[str] = None


class MessageReportOut(CamelModel):
    id: str
    thread_id: str
    message_id: str
    message_snapshot: str
    reported_by_role: Literal["citizen", "lawyer"]
    reported_by_name: str
    reported_against_name: str
    reason_category: str
    reason_details: Optional[str] = None
    status: Literal["pending", "reviewed", "dismissed"]
    created_at: str


class ResolveReportRequest(CamelModel):
    action: Literal["dismiss", "warn", "escalate"]
