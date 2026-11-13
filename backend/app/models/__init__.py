"""Import every model module so Base.metadata is fully populated for Alembic and create_all."""
from app.models.base import Base  # noqa: F401
from app.models.chat import (  # noqa: F401
    Conversation,
    Message,
    MessageCitation,
    MessageFeedback,
)
from app.models.consultation import (  # noqa: F401
    Attachment,
    Consultation,
    MessageThread,
    ThreadMessage,
)
from app.models.corpus import (  # noqa: F401
    Act,
    Chunk,
    ChunkEmbedding,
    CorpusDocument,
    GlossaryTerm,
    Section,
)
from app.models.document import DocumentTemplate, DraftDocument  # noqa: F401
from app.models.moderation import (  # noqa: F401
    DailyMetric,
    FlaggedAnswer,
    Notification,
    ReportedMessage,
    SystemSetting,
)
from app.models.payment import (  # noqa: F401
    Payment,
    PaymentGatewayLog,
    Payout,
    PayoutItem,
    Refund,
)
from app.models.profile import (  # noqa: F401
    AvailabilityException,
    AvailabilityRule,
    CitizenProfile,
    LawyerCredential,
    LawyerFee,
    LawyerProfile,
    LawyerSpecialization,
    Specialization,
)
from app.models.user import AuditLog, OtpCode, PasswordReset, RefreshToken, User  # noqa: F401
from app.models.verification import (  # noqa: F401
    VerificationAssignment,
    VerificationRequest,
    VerificationVerdict,
)
from app.models.video import MeetingParticipant, VideoMeeting  # noqa: F401

__all__ = [
    "Base",
    "User",
    "OtpCode",
    "RefreshToken",
    "PasswordReset",
    "AuditLog",
    "CitizenProfile",
    "LawyerProfile",
    "Specialization",
    "LawyerSpecialization",
    "LawyerCredential",
    "LawyerFee",
    "AvailabilityRule",
    "AvailabilityException",
    "Act",
    "Section",
    "CorpusDocument",
    "Chunk",
    "ChunkEmbedding",
    "GlossaryTerm",
    "Conversation",
    "Message",
    "MessageCitation",
    "MessageFeedback",
    "VerificationRequest",
    "VerificationAssignment",
    "VerificationVerdict",
    "Consultation",
    "MessageThread",
    "ThreadMessage",
    "Attachment",
    "VideoMeeting",
    "MeetingParticipant",
    "DocumentTemplate",
    "DraftDocument",
    "Payment",
    "PaymentGatewayLog",
    "Refund",
    "Payout",
    "PayoutItem",
    "FlaggedAnswer",
    "ReportedMessage",
    "Notification",
    "SystemSetting",
    "DailyMetric",
]
