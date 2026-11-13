"""Translations between the frontend contract's vocabulary and the DB enums.

The frontend (frontend/src/mocks/types.ts) uses lowercase, user-facing status
names; the schema uses the richer uppercase lifecycle enums. Every mapping
lives here so services never hand-roll them.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from app.core.exceptions import NotFoundError
from app.models.enums import (
    ConsultationMode,
    ConsultationStatus,
    IngestStatus,
    LawyerApprovalStatus,
    VerdictEnum,
    VerificationStatus,
)

LANGUAGE_CODES = {"Bengali": "bn", "English": "en", "Chittagonian": "ctg", "Sylheti": "syl"}
LANGUAGE_NAMES = {code: name for name, code in LANGUAGE_CODES.items()}

MODE_TO_DB = {
    "chat": ConsultationMode.CHAT,
    "audio": ConsultationMode.AUDIO,
    "video": ConsultationMode.VIDEO,
    "in_person": ConsultationMode.CHAMBER,
}
MODE_FROM_DB = {db: fe for fe, db in MODE_TO_DB.items()}


def lawyer_status(status: LawyerApprovalStatus) -> str:
    if status == LawyerApprovalStatus.APPROVED:
        return "verified"
    if status in (LawyerApprovalStatus.REJECTED, LawyerApprovalStatus.SUSPENDED):
        return "rejected"
    return "pending"


CONSULTATION_STATUS_TO_DB = {
    "requested": ConsultationStatus.REQUESTED,
    "accepted": ConsultationStatus.AWAITING_PAYMENT,
    "scheduled": ConsultationStatus.CONFIRMED,
    "completed": ConsultationStatus.COMPLETED,
    "declined": ConsultationStatus.CANCELLED_BY_LAWYER,
    "cancelled": ConsultationStatus.CANCELLED_BY_CITIZEN,
}
CONSULTATION_STATUS_FROM_DB = {db: fe for fe, db in CONSULTATION_STATUS_TO_DB.items()}
CONSULTATION_STATUS_FROM_DB[ConsultationStatus.IN_PROGRESS] = "scheduled"
CONSULTATION_STATUS_FROM_DB[ConsultationStatus.NO_SHOW] = "cancelled"

VERDICT_TO_DB = {
    "accurate": VerdictEnum.ACCURATE,
    "incomplete": VerdictEnum.PARTIALLY_ACCURATE,
    "needs_correction": VerdictEnum.NEEDS_CORRECTION,
    "incorrect": VerdictEnum.INACCURATE,
}
VERDICT_FROM_DB = {db: fe for fe, db in VERDICT_TO_DB.items()}


def verification_status(status: VerificationStatus) -> str:
    if status in (VerificationStatus.CLAIMED, VerificationStatus.ASSIGNED, VerificationStatus.IN_REVIEW):
        return "claimed"
    if status in (VerificationStatus.VERDICT_ISSUED, VerificationStatus.CLOSED):
        return "completed"
    if status in (VerificationStatus.CANCELLED, VerificationStatus.REFUNDED):
        return "declined"
    return "pending"


CORPUS_STATUS_FROM_DB = {
    IngestStatus.READY: "indexed",
    IngestStatus.FAILED: "failed",
}


def corpus_status(status: IngestStatus) -> str:
    return CORPUS_STATUS_FROM_DB.get(status, "processing")


def iso(value: Optional[datetime]) -> Optional[str]:
    """ISO-8601 with a trailing Z, as the frontend fixtures use."""
    if value is None:
        return None
    return value.isoformat().replace("+00:00", "Z")


def as_uuid(value: str, what: str = "Resource") -> uuid.UUID:
    """Parse a path id; anything that isn't a UUID can't exist, so it's a 404."""
    try:
        return uuid.UUID(str(value))
    except ValueError:
        raise NotFoundError(f"{what} not found.", "অনুরোধকৃত তথ্য পাওয়া যায়নি।") from None
