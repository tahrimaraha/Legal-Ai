"""Payments, gateway logs, refunds and lawyer payouts. All money is Numeric(12, 2)."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ENUM, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import (
    LogDirection,
    PaymentMethod,
    PaymentPurpose,
    PaymentStatus,
    PayoutStatus,
    PayoutSourceType,
    RefundStatus,
)

payment_purpose_enum = ENUM(
    PaymentPurpose, name="payment_purpose", values_callable=lambda e: [m.value for m in e]
)
payment_method_enum = ENUM(
    PaymentMethod, name="payment_method", values_callable=lambda e: [m.value for m in e]
)
payment_status_enum = ENUM(
    PaymentStatus, name="payment_status", values_callable=lambda e: [m.value for m in e]
)
log_direction_enum = ENUM(
    LogDirection, name="log_direction", values_callable=lambda e: [m.value for m in e]
)
refund_status_enum = ENUM(
    RefundStatus, name="refund_status", values_callable=lambda e: [m.value for m in e]
)
payout_status_enum = ENUM(
    PayoutStatus, name="payout_status", values_callable=lambda e: [m.value for m in e]
)
payout_source_type_enum = ENUM(
    PayoutSourceType, name="payout_source_type", values_callable=lambda e: [m.value for m in e]
)


class Payment(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "payments"

    payer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    purpose: Mapped[PaymentPurpose] = mapped_column(payment_purpose_enum, nullable=False)
    reference_type: Mapped[str] = mapped_column(String(40), nullable=False)
    reference_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="BDT")
    platform_fee: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    method: Mapped[PaymentMethod] = mapped_column(payment_method_enum, nullable=False)
    provider_ref: Mapped[Optional[str]] = mapped_column(String(120), nullable=True, index=True)
    provider_txn_id: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    payer_msisdn_masked: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    nagad_challenge: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    status: Mapped[PaymentStatus] = mapped_column(
        payment_status_enum, nullable=False, default=PaymentStatus.INITIATED
    )
    idempotency_key: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_error_code: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    last_error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    raw_payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    gateway_logs: Mapped[list["PaymentGatewayLog"]] = relationship(
        back_populates="payment", cascade="all, delete-orphan"
    )
    refunds: Mapped[list["Refund"]] = relationship(
        back_populates="payment", cascade="all, delete-orphan"
    )


class PaymentGatewayLog(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "payment_gateway_logs"

    payment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("payments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    direction: Mapped[LogDirection] = mapped_column(log_direction_enum, nullable=False)
    endpoint: Mapped[str] = mapped_column(String(255), nullable=False)
    http_status: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    request_body: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    response_body: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    payment: Mapped["Payment"] = relationship(back_populates="gateway_logs")


class Refund(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "refunds"

    payment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("payments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[RefundStatus] = mapped_column(
        refund_status_enum, nullable=False, default=RefundStatus.REQUESTED
    )
    external_reference: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    processed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    processed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    payment: Mapped["Payment"] = relationship(back_populates="refunds")


class Payout(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "payouts"

    lawyer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lawyer_profiles.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    gross_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    platform_commission: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    net_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[PayoutStatus] = mapped_column(
        payout_status_enum, nullable=False, default=PayoutStatus.PENDING
    )
    external_reference: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    items: Mapped[list["PayoutItem"]] = relationship(
        back_populates="payout", cascade="all, delete-orphan"
    )


class PayoutItem(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "payout_items"
    __table_args__ = (
        # A single source (a verification honorarium or a consultation fee share)
        # can never be paid out twice.
        UniqueConstraint("source_type", "source_id", name="uq_payout_item_source"),
    )

    payout_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("payouts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    source_type: Mapped[PayoutSourceType] = mapped_column(payout_source_type_enum, nullable=False)
    source_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    payout: Mapped["Payout"] = relationship(back_populates="items")
