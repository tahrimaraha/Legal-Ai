"""Schemas for the lawyer directory (frontend `LawyerProfile`, `LawyerReview`)."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import Field

from app.schemas.common import CamelModel

Mode = Literal["chat", "audio", "video", "in_person"]


class LawyerFeeOut(CamelModel):
    mode: Mode
    fee_bdt: float
    duration_minutes: int


class LawyerOut(CamelModel):
    # Both are the lawyer's user id; the frontend uses either interchangeably.
    id: str
    user_id: str
    full_name: str
    full_name_bn: str
    title: str
    title_bn: str
    avatar_url: str
    district: str
    district_bn: str
    bar_enrolment_no: str
    enrolment_year: int
    verification_status: Literal["verified", "pending", "rejected"]
    practice_areas: list[str]
    practice_areas_bn: list[str]
    courts: list[str]
    courts_bn: list[str]
    languages: list[str]
    bio_bn: str
    bio_en: str
    experience_years: int
    starting_fee_bdt: float
    fees: list[LawyerFeeOut]
    rating: float
    review_count: int
    response_time_commitment: str
    response_time_commitment_bn: str
    total_verifications: int
    total_consultations: int
    education: list[str]
    education_bn: list[str]
    is_available_today: bool
    away_notice: Optional[str] = None
    license_document_url: Optional[str] = None
    license_document_name: Optional[str] = None


class LawyerFeeIn(CamelModel):
    mode: Mode
    fee_bdt: float = Field(gt=0)
    duration_minutes: int = Field(gt=0, le=480)


class LawyerUpdateRequest(CamelModel):
    """`PATCH /lawyers/me` — every field optional; unknown frontend fields are ignored."""
    full_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    full_name_bn: Optional[str] = None
    title: Optional[str] = None
    title_bn: Optional[str] = None
    avatar_url: Optional[str] = None
    district: Optional[str] = None
    district_bn: Optional[str] = None
    practice_areas: Optional[list[str]] = None
    practice_areas_bn: Optional[list[str]] = None
    courts: Optional[list[str]] = None
    courts_bn: Optional[list[str]] = None
    languages: Optional[list[str]] = None
    bio_bn: Optional[str] = None
    bio_en: Optional[str] = None
    experience_years: Optional[int] = Field(default=None, ge=0, le=80)
    fees: Optional[list[LawyerFeeIn]] = None
    response_time_commitment: Optional[str] = None
    response_time_commitment_bn: Optional[str] = None
    education: Optional[list[str]] = None
    education_bn: Optional[list[str]] = None
    is_available_today: Optional[bool] = None
    away_notice: Optional[str] = None


class LawyerReviewOut(CamelModel):
    id: str
    lawyer_id: str
    consultation_id: str
    citizen_id: str
    citizen_name: str
    rating: int
    text: str
    created_at: str


class AvailabilityOut(CamelModel):
    """Weekly grid as the availability page renders it: `"<Weekday>-<HH:MM>"` keys."""
    slots: list[str]
    vacation_mode: bool


class AvailabilityIn(CamelModel):
    slots: list[str] = Field(default_factory=list, max_length=200)
    vacation_mode: bool = False
