"""Video meeting models (LiveKit / Jitsi backed)."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import ENUM, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import MeetingStatus, ParticipantRole, VideoProviderEnum

video_provider_enum = ENUM(
    VideoProviderEnum, name="video_provider", values_callable=lambda e: [m.value for m in e]
)
meeting_status_enum = ENUM(
    MeetingStatus, name="meeting_status", values_callable=lambda e: [m.value for m in e]
)
participant_role_enum = ENUM(
    ParticipantRole, name="participant_role", values_callable=lambda e: [m.value for m in e]
)


class VideoMeeting(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "video_meetings"

    consultation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("consultations.id", ondelete="SET NULL"), nullable=True
    )
    host_lawyer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lawyer_profiles.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider: Mapped[VideoProviderEnum] = mapped_column(video_provider_enum, nullable=False)
    room_name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    join_code: Mapped[str] = mapped_column(String(12), unique=True, nullable=False)
    passcode_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    scheduled_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    scheduled_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    started_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    ended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[MeetingStatus] = mapped_column(
        meeting_status_enum, nullable=False, default=MeetingStatus.SCHEDULED
    )
    recording_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    participants: Mapped[list["MeetingParticipant"]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan"
    )


class MeetingParticipant(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "meeting_participants"

    meeting_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("video_meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role: Mapped[ParticipantRole] = mapped_column(participant_role_enum, nullable=False)
    joined_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    left_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    meeting: Mapped["VideoMeeting"] = relationship(back_populates="participants")
