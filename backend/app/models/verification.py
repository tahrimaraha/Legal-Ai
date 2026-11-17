"""Rung 2: lawyer verification of AI answers."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, ENUM, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import Language, Urgency, VerdictEnum, VerificationStatus

urgency_enum = ENUM(Urgency, name="urgency", values_callable=lambda e: [m.value for m in e])
verification_status_enum = ENUM(
    VerificationStatus,
    name="verification_status",
    values_callable=lambda e: [m.value for m in e],
)
verdict_enum = ENUM(VerdictEnum, name="verdict_enum", values_callable=lambda e: [m.value for m in e])
verification_language_enum = ENUM(
    Language, name="verification_language", values_callable=lambda e: [m.value for m in e]
)


class VerificationRequest(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "verification_requests"

    citizen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    conversation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True
    )
    message_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("messages.id", ondelete="SET NULL"), nullable=True
    )
    issue_summary: Mapped[str] = mapped_column(Text, nullable=False)
    desired_outcome: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    urgency: Mapped[Urgency] = mapped_column(urgency_enum, nullable=False, default=Urgency.NORMAL)
    preferred_language: Mapped[Language] = mapped_column(
        verification_language_enum, nullable=False
    )
    attached_statute_ids: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(UUID(as_uuid=True)), nullable=False, default=list
    )
    fee_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    payment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("payments.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[VerificationStatus] = mapped_column(
        verification_status_enum, nullable=False, default=VerificationStatus.DRAFT
    )
    sla_due_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    assignments: Mapped[list["VerificationAssignment"]] = relationship(
        back_populates="request", cascade="all, delete-orphan"
    )


class VerificationAssignment(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "verification_assignments"

    request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("verification_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lawyer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lawyer_profiles.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assigned_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    claimed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    declined_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    decline_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    honorarium_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    payout_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("payouts.id", ondelete="SET NULL"), nullable=True
    )

    request: Mapped["VerificationRequest"] = relationship(back_populates="assignments")
    verdict: Mapped[Optional["VerificationVerdict"]] = relationship(
        back_populates="assignment", cascade="all, delete-orphan", uselist=False
    )


class VerificationVerdict(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "verification_verdicts"

    assignment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("verification_assignments.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    verdict: Mapped[VerdictEnum] = mapped_column(verdict_enum, nullable=False)
    summary_bn: Mapped[str] = mapped_column(Text, nullable=False)
    summary_en: Mapped[str] = mapped_column(Text, nullable=False)
    corrected_statement: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cited_section_ids: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(UUID(as_uuid=True)), nullable=False, default=list
    )
    advocate_signature_name: Mapped[str] = mapped_column(String(255), nullable=False)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_final: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    assignment: Mapped["VerificationAssignment"] = relationship(back_populates="verdict")
