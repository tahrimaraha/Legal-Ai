"""Moderation (flags/reports), notifications, system settings and daily metrics."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import ENUM, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import FlaggedStatus, ReportedAction

flagged_status_enum = ENUM(
    FlaggedStatus, name="flagged_status", values_callable=lambda e: [m.value for m in e]
)
reported_action_enum = ENUM(
    ReportedAction, name="reported_action", values_callable=lambda e: [m.value for m in e]
)


class FlaggedAnswer(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "flagged_answers"

    message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reporter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    reason_code: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[FlaggedStatus] = mapped_column(
        flagged_status_enum, nullable=False, default=FlaggedStatus.OPEN
    )
    resolved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    resolution_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    corpus_action_taken: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)


class ReportedMessage(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "reported_messages"

    thread_message_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("thread_messages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reporter_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    reason_code: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[FlaggedStatus] = mapped_column(
        flagged_status_enum, nullable=False, default=FlaggedStatus.OPEN
    )
    action: Mapped[ReportedAction] = mapped_column(
        reported_action_enum, nullable=False, default=ReportedAction.NONE
    )
    resolved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )


class Notification(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "notifications"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(80), nullable=False)
    title_bn: Mapped[str] = mapped_column(String(255), nullable=False)
    title_en: Mapped[str] = mapped_column(String(255), nullable=False)
    body_bn: Mapped[str] = mapped_column(Text, nullable=False)
    body_en: Mapped[str] = mapped_column(Text, nullable=False)
    deep_link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notification_metadata: Mapped[dict] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict
    )


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(120), primary_key=True)
    value: Mapped[dict] = mapped_column(JSONB, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class DailyMetric(Base):
    __tablename__ = "daily_metrics"

    date: Mapped[date] = mapped_column(Date, primary_key=True)
    questions_asked: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    new_citizens: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    new_lawyers: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    verifications_completed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    revenue: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    topic_distribution: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
