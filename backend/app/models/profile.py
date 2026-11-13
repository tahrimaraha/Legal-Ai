"""Citizen and lawyer profile models, credentials, fees and availability."""
from __future__ import annotations

import uuid
from datetime import date, datetime, time
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, ENUM, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import (
    ConsultationMode,
    CourtLevel,
    CredentialDocType,
    CredentialStatus,
    Gender,
    LawyerApprovalStatus,
    PaymentMethod,
)

gender_enum = ENUM(Gender, name="gender", values_callable=lambda e: [m.value for m in e])
court_level_enum = ENUM(
    CourtLevel, name="court_level", values_callable=lambda e: [m.value for m in e]
)
lawyer_approval_status_enum = ENUM(
    LawyerApprovalStatus,
    name="lawyer_approval_status",
    values_callable=lambda e: [m.value for m in e],
)
credential_doc_type_enum = ENUM(
    CredentialDocType, name="credential_doc_type", values_callable=lambda e: [m.value for m in e]
)
credential_status_enum = ENUM(
    CredentialStatus, name="credential_status", values_callable=lambda e: [m.value for m in e]
)
consultation_mode_enum = ENUM(
    ConsultationMode, name="consultation_mode", values_callable=lambda e: [m.value for m in e]
)


class CitizenProfile(TimestampMixin, Base):
    __tablename__ = "citizen_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    district: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    nid_last4: Mapped[Optional[str]] = mapped_column(String(4), nullable=True)
    dob: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    gender: Mapped[Optional[Gender]] = mapped_column(gender_enum, nullable=True)


class LawyerProfile(TimestampMixin, Base):
    __tablename__ = "lawyer_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    bar_council_enrollment_no: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False
    )
    enrollment_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    chamber_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    chamber_address: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    district: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    court_level: Mapped[Optional[CourtLevel]] = mapped_column(court_level_enum, nullable=True)
    years_of_experience: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    bio_bn: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bio_en: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    languages: Mapped[list[str]] = mapped_column(ARRAY(String(8)), nullable=False, default=list)
    profile_completeness: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    rating_avg: Mapped[Decimal] = mapped_column(Numeric(3, 2), nullable=False, default=0)
    rating_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    approval_status: Mapped[LawyerApprovalStatus] = mapped_column(
        lawyer_approval_status_enum, nullable=False, default=LawyerApprovalStatus.DRAFT
    )
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    approved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Wallet the admin sends this lawyer's earnings to (bKash / Nagad / Rocket + number).
    payout_msisdn: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    payout_method: Mapped[Optional[PaymentMethod]] = mapped_column(
        ENUM(PaymentMethod, name="payment_method", values_callable=lambda e: [m.value for m in e], create_type=False),
        nullable=True,
    )
    full_name_bn: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    title_en: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    title_bn: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    district_bn: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    courts: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    courts_bn: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    education: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    education_bn: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    response_time_en: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    response_time_bn: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    is_available_today: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    away_notice: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    specializations: Mapped[list["LawyerSpecialization"]] = relationship(
        back_populates="lawyer", cascade="all, delete-orphan"
    )
    credentials: Mapped[list["LawyerCredential"]] = relationship(
        back_populates="lawyer", cascade="all, delete-orphan"
    )
    fees: Mapped[list["LawyerFee"]] = relationship(
        back_populates="lawyer", cascade="all, delete-orphan"
    )


class Specialization(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "specializations"

    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    name_bn: Mapped[str] = mapped_column(String(150), nullable=False)
    name_en: Mapped[str] = mapped_column(String(150), nullable=False)


class LawyerSpecialization(Base):
    __tablename__ = "lawyer_specializations"

    lawyer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lawyer_profiles.user_id", ondelete="CASCADE"),
        primary_key=True,
    )
    specialization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("specializations.id", ondelete="CASCADE"),
        primary_key=True,
    )

    lawyer: Mapped["LawyerProfile"] = relationship(back_populates="specializations")
    specialization: Mapped["Specialization"] = relationship()


class LawyerCredential(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "lawyer_credentials"

    lawyer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lawyer_profiles.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    doc_type: Mapped[CredentialDocType] = mapped_column(credential_doc_type_enum, nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[CredentialStatus] = mapped_column(
        credential_status_enum, nullable=False, default=CredentialStatus.PENDING
    )
    reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    review_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    lawyer: Mapped["LawyerProfile"] = relationship(back_populates="credentials")


class LawyerFee(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "lawyer_fees"
    __table_args__ = (UniqueConstraint("lawyer_id", "mode", name="uq_lawyer_fee_mode"),)

    lawyer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lawyer_profiles.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    mode: Mapped[ConsultationMode] = mapped_column(consultation_mode_enum, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="BDT")
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    lawyer: Mapped["LawyerProfile"] = relationship(back_populates="fees")


class AvailabilityRule(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "availability_rules"

    lawyer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lawyer_profiles.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    weekday: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    slot_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class AvailabilityException(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "availability_exceptions"

    lawyer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("lawyer_profiles.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    start_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    end_time: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
