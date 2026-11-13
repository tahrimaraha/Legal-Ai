"""Schemas for `/verifications` (frontend `VerificationRequest`, `VerificationVerdict`)."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import Field

from app.schemas.chat import CitationOut
from app.schemas.common import CamelModel
from app.schemas.payments import ManualPaymentIn

VerdictType = Literal["accurate", "incomplete", "needs_correction", "incorrect"]


class VerdictOut(CamelModel):
    id: str
    request_id: str
    lawyer_id: str
    lawyer_name: str
    lawyer_name_bn: str
    lawyer_avatar: str
    lawyer_enrolment_no: str
    verdict: VerdictType
    corrected_explanation_bn: str
    corrected_explanation_en: str
    added_statute_citations: list[str]
    disputed_statute_citations: list[str]
    note_to_citizen_bn: str
    note_to_citizen_en: str
    minutes_spent: int
    created_at: str
    payment_processed: bool = False


class VerificationOut(CamelModel):
    id: str
    citizen_id: str
    citizen_name: str
    conversation_id: str
    message_id: str
    question_excerpt_bn: str
    question_excerpt_en: str
    ai_answer_excerpt_bn: str
    ai_answer_excerpt_en: str
    citations: list[CitationOut]
    status: Literal["pending", "claimed", "completed", "declined"]
    urgency: Literal["normal", "urgent"]
    fee_bdt: float
    claimed_by_lawyer_id: Optional[str] = None
    claimed_by_lawyer_name: Optional[str] = None
    assigned_at: Optional[str] = None
    decline_reason: Optional[str] = None
    verdict: Optional[VerdictOut] = None
    created_at: str
    updated_at: str


class CreateVerificationRequest(CamelModel):
    conversation_id: Optional[str] = None
    message_id: str
    question_text: str = ""
    answer_text: str = ""
    citations: list[CitationOut] = []
    urgency: Literal["normal", "urgent"] = "normal"
    payment: ManualPaymentIn


class AssignVerificationRequest(CamelModel):
    lawyer_id: str


class DeclineRequest(CamelModel):
    reason: str = Field(min_length=1, max_length=2000)


class SubmitVerdictRequest(CamelModel):
    verdict: VerdictType
    corrected_explanation_bn: str = ""
    corrected_explanation_en: str = ""
    added_statute_citations: list[str] = []
    disputed_statute_citations: list[str] = []
    note_to_citizen_bn: str = ""
    note_to_citizen_en: str = ""
    minutes_spent: int = Field(default=0, ge=0, le=1440)
