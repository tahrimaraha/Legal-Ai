"""Schemas for `/consultations` (frontend `ConsultationRequest`)."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import Field

from app.schemas.common import CamelModel
from app.schemas.payments import ManualPaymentIn

Mode = Literal["chat", "audio", "video", "in_person"]
Status = Literal["requested", "accepted", "scheduled", "completed", "declined", "cancelled"]


class Slot(CamelModel):
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    time: str = Field(pattern=r"^\d{2}:\d{2}$")


class AttachmentRef(CamelModel):
    name: str
    size: str
    url: str


class TimelineEntry(CamelModel):
    status: Status
    timestamp: str
    note: Optional[str] = None


class ReviewOut(CamelModel):
    rating: int
    text: str
    created_at: str


class ConsultationOut(CamelModel):
    id: str
    citizen_id: str
    citizen_name: str
    citizen_phone: Optional[str] = None
    lawyer_id: str
    lawyer_name: str
    lawyer_name_bn: str
    lawyer_avatar: str
    topic_bn: str
    topic_en: str
    description: str
    mode: Mode
    fee_bdt: float
    status: Status
    preferred_slots: list[Slot]
    scheduled_slot: Optional[Slot] = None
    attachments: list[AttachmentRef] = []
    timeline: list[TimelineEntry]
    decline_reason: Optional[str] = None
    lawyer_private_notes: Optional[str] = None
    review: Optional[ReviewOut] = None
    payment_processed: bool = False
    created_at: str


class CreateConsultationRequest(CamelModel):
    lawyer_id: str
    topic: str = Field(min_length=1, max_length=255)
    description: str = ""
    mode: Mode
    fee_bdt: Optional[float] = None
    slots: list[Slot] = Field(min_length=1)
    attachments: list[AttachmentRef] = []
    payment: ManualPaymentIn


class AcceptConsultationRequest(CamelModel):
    slot: Optional[Slot] = None


class DeclineConsultationRequest(CamelModel):
    reason: str = Field(min_length=1, max_length=2000)


class CompleteConsultationRequest(CamelModel):
    private_notes: Optional[str] = None


class ReviewRequest(CamelModel):
    rating: int = Field(ge=1, le=5)
    text: str = Field(default="", max_length=4000)


class UpdateConsultationRequest(CamelModel):
    topic: str = Field(min_length=1, max_length=255)
    description: str = ""
