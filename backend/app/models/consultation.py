"""Rung 4 (hire & consult) and Rung 3 (gated messaging) models."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ENUM, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import ConsultationMode, ConsultationStatus, ScanStatus, ThreadOrigin, ThreadStatus

consultation_mode_enum = ENUM(
    ConsultationMode, name="consultation_mode", values_callable=lambda e: [m.value for m in e]
)
consultation_status_enum = ENUM(
    ConsultationStatus, name="consultation_status", values_callable=lambda e: [m.value for m in e]
)
thread_origin_enum = ENUM(
    ThreadOrigin, name="thread_origin", values_callable=lambda e: [m.value for m in e]
)
thread_status_enum = ENUM(
    ThreadStatus, name="thread_status", values_callable=lambda e: [m.value for m in e]
)
scan_status_enum = ENUM(
    ScanStatus, name="scan_status", values_callable=lambda e: [m.value for m in e]
)


class Consultation(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "consultations"

    citizen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    lawyer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lawyer_profiles.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    mode: Mapped[ConsultationMode] = mapped_column(consultation_mode_enum, nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    scheduled_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    scheduled_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="Asia/Dhaka")
    fee_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("payments.id", ondelete="SET NULL"), nullable=True
    )
    meeting_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("video_meetings.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[ConsultationStatus] = mapped_column(
        consultation_status_enum, nullable=False, default=ConsultationStatus.REQUESTED
    )
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    citizen_rating: Mapped[Optional[int]] = mapped_column(SmallInteger, nullable=True)
    citizen_review: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    # [{date, time}] as proposed by the citizen; scheduled_start is the agreed one.
    preferred_slots: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list)
    attachments: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list)
    # [{status, timestamp, note?}] in frontend status vocabulary.
    timeline: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list)
    lawyer_private_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    payment_processed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)


class MessageThread(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "message_threads"
    __table_args__ = (
        UniqueConstraint(
            "citizen_id", "lawyer_id", "origin", "origin_id", name="uq_thread_participants_origin"
        ),
    )

    citizen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    lawyer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lawyer_profiles.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    origin: Mapped[ThreadOrigin] = mapped_column(thread_origin_enum, nullable=False)
    origin_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    status: Mapped[ThreadStatus] = mapped_column(
        thread_status_enum, nullable=False, default=ThreadStatus.PENDING_LAWYER_ACCEPTANCE
    )
    accepted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_message_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    citizen_unread_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    lawyer_unread_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    context_title_bn: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    context_title_en: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    messages: Mapped[list["ThreadMessage"]] = relationship(
        back_populates="thread", cascade="all, delete-orphan", order_by="ThreadMessage.created_at"
    )


class ThreadMessage(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "thread_messages"

    thread_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("message_threads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    attachment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("attachments.id", ondelete="SET NULL"), nullable=True
    )
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    thread: Mapped["MessageThread"] = relationship(back_populates="messages")


class Attachment(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "attachments"

    uploader_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    scan_status: Mapped[ScanStatus] = mapped_column(
        scan_status_enum, nullable=False, default=ScanStatus.PENDING
    )
