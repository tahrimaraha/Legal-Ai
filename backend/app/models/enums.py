"""Python string enums backing every Postgres-native ENUM column in the schema."""
from __future__ import annotations

import enum


class UserRole(str, enum.Enum):
    CITIZEN = "CITIZEN"
    LAWYER = "LAWYER"
    ADMIN = "ADMIN"


class Language(str, enum.Enum):
    BN = "bn"
    EN = "en"


class Gender(str, enum.Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"


class OtpChannel(str, enum.Enum):
    EMAIL = "EMAIL"
    SMS = "SMS"


class OtpPurpose(str, enum.Enum):
    SIGNUP = "SIGNUP"
    LOGIN = "LOGIN"
    RESET_PASSWORD = "RESET_PASSWORD"
    CHANGE_CONTACT = "CHANGE_CONTACT"


class CourtLevel(str, enum.Enum):
    JUDGE_COURT = "JUDGE_COURT"
    HIGH_COURT = "HIGH_COURT"
    APPELLATE_DIVISION = "APPELLATE_DIVISION"


class LawyerApprovalStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PENDING = "PENDING"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"


class CredentialDocType(str, enum.Enum):
    BAR_LICENSE = "BAR_LICENSE"
    NID = "NID"
    CERTIFICATE = "CERTIFICATE"


class CredentialStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ConsultationMode(str, enum.Enum):
    CHAT = "CHAT"
    AUDIO = "AUDIO"
    VIDEO = "VIDEO"
    CHAMBER = "CHAMBER"


class IngestStatus(str, enum.Enum):
    UPLOADED = "UPLOADED"
    PARSING = "PARSING"
    CHUNKING = "CHUNKING"
    EMBEDDING = "EMBEDDING"
    READY = "READY"
    FAILED = "FAILED"


class MessageRole(str, enum.Enum):
    USER = "USER"
    ASSISTANT = "ASSISTANT"
    SYSTEM = "SYSTEM"


class FeedbackRating(str, enum.Enum):
    HELPFUL = "HELPFUL"
    NOT_HELPFUL = "NOT_HELPFUL"


class Urgency(str, enum.Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    URGENT = "URGENT"


class VerificationStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    AWAITING_PAYMENT = "AWAITING_PAYMENT"
    PAID = "PAID"
    UNASSIGNED = "UNASSIGNED"
    ASSIGNED = "ASSIGNED"
    CLAIMED = "CLAIMED"
    IN_REVIEW = "IN_REVIEW"
    VERDICT_ISSUED = "VERDICT_ISSUED"
    CLOSED = "CLOSED"
    REFUNDED = "REFUNDED"
    CANCELLED = "CANCELLED"


class VerdictEnum(str, enum.Enum):
    ACCURATE = "ACCURATE"
    PARTIALLY_ACCURATE = "PARTIALLY_ACCURATE"
    NEEDS_CORRECTION = "NEEDS_CORRECTION"
    INACCURATE = "INACCURATE"


class ConsultationStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    AWAITING_PAYMENT = "AWAITING_PAYMENT"
    CONFIRMED = "CONFIRMED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED_BY_CITIZEN = "CANCELLED_BY_CITIZEN"
    CANCELLED_BY_LAWYER = "CANCELLED_BY_LAWYER"
    NO_SHOW = "NO_SHOW"


class ThreadOrigin(str, enum.Enum):
    VERIFICATION = "VERIFICATION"
    CONSULTATION = "CONSULTATION"
    INVITE = "INVITE"


class ThreadStatus(str, enum.Enum):
    PENDING_LAWYER_ACCEPTANCE = "PENDING_LAWYER_ACCEPTANCE"
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    BLOCKED = "BLOCKED"


class ScanStatus(str, enum.Enum):
    PENDING = "PENDING"
    CLEAN = "CLEAN"
    INFECTED = "INFECTED"
    FAILED = "FAILED"


class VideoProviderEnum(str, enum.Enum):
    LIVEKIT = "LIVEKIT"
    JITSI = "JITSI"


class MeetingStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    LIVE = "LIVE"
    ENDED = "ENDED"
    CANCELLED = "CANCELLED"


class ParticipantRole(str, enum.Enum):
    HOST = "HOST"
    GUEST = "GUEST"


class DraftStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    GENERATED = "GENERATED"
    FINALISED = "FINALISED"


class PaymentPurpose(str, enum.Enum):
    VERIFICATION_FEE = "VERIFICATION_FEE"
    CONSULTATION_FEE = "CONSULTATION_FEE"
    DOCUMENT_FEE = "DOCUMENT_FEE"


class PaymentMethod(str, enum.Enum):
    BKASH = "BKASH"
    NAGAD = "NAGAD"
    ROCKET = "ROCKET"
    SSLCOMMERZ = "SSLCOMMERZ"
    MOCK = "MOCK"


class PaymentStatus(str, enum.Enum):
    INITIATED = "INITIATED"
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"
    MISMATCH = "MISMATCH"
    REFUND_PENDING = "REFUND_PENDING"
    REFUNDED = "REFUNDED"


class LogDirection(str, enum.Enum):
    OUT = "OUT"
    IN = "IN"


class RefundStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    MANUAL_REQUIRED = "MANUAL_REQUIRED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class PayoutStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    PAID = "PAID"
    FAILED = "FAILED"


class PayoutSourceType(str, enum.Enum):
    VERIFICATION = "VERIFICATION"
    CONSULTATION = "CONSULTATION"


class FlaggedStatus(str, enum.Enum):
    OPEN = "OPEN"
    UNDER_REVIEW = "UNDER_REVIEW"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"


class ReportedAction(str, enum.Enum):
    NONE = "NONE"
    WARNING = "WARNING"
    THREAD_BLOCKED = "THREAD_BLOCKED"
    ACCOUNT_SUSPENDED = "ACCOUNT_SUSPENDED"
