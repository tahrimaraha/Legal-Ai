"""Generic per-user application record.

Holds the citizen/lawyer workflow objects the web app works with (AI conversations, verification
requests, consultations, message threads, meetings, draft documents, notifications, reviews,
reports and flags) as JSON in exactly the shape the frontend uses, while access control relies on
the indexed `owner_id` / `lawyer_id` columns. Identity and the lawyer directory stay in the
relational `users` / `lawyer_profiles` tables.
"""
from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPkMixin


class AppRecord(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "app_records"
    __table_args__ = (
        Index("ix_app_records_kind_owner", "kind", "owner_id"),
        Index("ix_app_records_kind_lawyer", "kind", "lawyer_id"),
    )

    # conversation | verification | consultation | review | thread | meeting | document |
    # notification | message_report | flag | license
    kind: Mapped[str] = mapped_column(String(40), nullable=False)
    # The citizen who owns the record (or the recipient, for notifications).
    owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    # The lawyer (users.id) the record is shared with, if any.
    lawyer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    data: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
