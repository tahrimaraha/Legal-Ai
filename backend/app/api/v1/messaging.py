"""`/threads`, `/meetings` and `/reports` — citizen ↔ lawyer messaging."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, require_approved_lawyer
from app.database import get_db
from app.models.user import User
from app.schemas.messaging import (
    CreateMeetingRequest,
    InviteToMeetingRequest,
    JoinMeetingRequest,
    JoinMeetingResponse,
    MeetingOut,
    MessageReportOut,
    ReportMessageRequest,
    SendMessageRequest,
    ThreadOut,
)
from app.services import messaging_service

router = APIRouter()
lawyer_only = require_approved_lawyer


@router.get("/threads", response_model=list[ThreadOut])
async def list_threads(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> list[ThreadOut]:
    return await messaging_service.list_threads(db, user)


@router.get("/threads/{thread_id}", response_model=ThreadOut)
async def get_thread(
    thread_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> ThreadOut:
    return await messaging_service.get_thread(db, user, thread_id)


@router.post("/threads/{thread_id}/messages", response_model=ThreadOut)
async def send_message(
    thread_id: str, payload: SendMessageRequest,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
) -> ThreadOut:
    return await messaging_service.send_message(db, user, thread_id, payload.text)


@router.post("/meetings", response_model=MeetingOut, status_code=status.HTTP_201_CREATED)
async def create_meeting(
    payload: CreateMeetingRequest, user: User = Depends(lawyer_only), db: AsyncSession = Depends(get_db)
) -> MeetingOut:
    return await messaging_service.create_meeting(db, user, payload.citizen_id, payload.title, payload.thread_id)


@router.post("/meetings/join", response_model=JoinMeetingResponse)
async def join_meeting(
    payload: JoinMeetingRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> JoinMeetingResponse:
    meeting, error = await messaging_service.join_meeting(db, user, payload.code, payload.password)
    return JoinMeetingResponse(ok=meeting is not None, meeting=meeting, error=error)


@router.get("/meetings/{code}", response_model=MeetingOut)
async def get_meeting(code: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> MeetingOut:
    return await messaging_service.get_meeting(db, user, code)


@router.post("/meetings/{meeting_id}/invite", response_model=MeetingOut)
async def invite_to_meeting(
    meeting_id: str, payload: InviteToMeetingRequest,
    user: User = Depends(lawyer_only), db: AsyncSession = Depends(get_db),
) -> MeetingOut:
    """Posts the meeting's link, code and password into a client's message thread."""
    return await messaging_service.invite_to_meeting(db, user, meeting_id, payload.thread_id)


@router.post("/meetings/{meeting_id}/end", response_model=MeetingOut)
async def end_meeting(
    meeting_id: str, user: User = Depends(lawyer_only), db: AsyncSession = Depends(get_db)
) -> MeetingOut:
    return await messaging_service.end_meeting(db, user, meeting_id)


@router.post("/reports", response_model=MessageReportOut, status_code=status.HTTP_201_CREATED)
async def report_message(
    payload: ReportMessageRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> MessageReportOut:
    return await messaging_service.report_message(
        db, user, payload.thread_id, payload.message_id, payload.reason_category, payload.reason_details
    )
