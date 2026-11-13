"""Guided document drafting (legal notices, complaints, GD applications, etc.)."""
from __future__ import annotations

import uuid
from typing import Optional

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, ENUM, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import DraftStatus

draft_status_enum = ENUM(
    DraftStatus, name="draft_status", values_callable=lambda e: [m.value for m in e]
)


class DocumentTemplate(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "document_templates"

    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    title_bn: Mapped[str] = mapped_column(String(255), nullable=False)
    title_en: Mapped[str] = mapped_column(String(255), nullable=False)
    jurisdiction: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    category_bn: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    category_en: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    description_bn: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description_en: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    body_template: Mapped[str] = mapped_column(Text, nullable=False)
    field_schema: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    related_act_ids: Mapped[list[uuid.UUID]] = mapped_column(
        ARRAY(UUID(as_uuid=True)), nullable=False, default=list
    )

    drafts: Mapped[list["DraftDocument"]] = relationship(back_populates="template")


class DraftDocument(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "draft_documents"

    citizen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("document_templates.id", ondelete="RESTRICT"), nullable=False
    )
    conversation_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    answers: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    generated_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    generated_body_en: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[DraftStatus] = mapped_column(
        draft_status_enum, nullable=False, default=DraftStatus.DRAFT
    )
    pdf_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    lawyer_review_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    template: Mapped["DocumentTemplate"] = relationship(back_populates="drafts")
