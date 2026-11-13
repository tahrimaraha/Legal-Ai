"""Statute corpus, ingestion pipeline and RAG vector-store models."""
from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, ENUM, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config import settings
from app.models.base import Base, TimestampMixin, UUIDPkMixin
from app.models.enums import IngestStatus, Language

ingest_status_enum = ENUM(
    IngestStatus, name="ingest_status", values_callable=lambda e: [m.value for m in e]
)
chunk_language_enum = ENUM(
    Language, name="chunk_language", values_callable=lambda e: [m.value for m in e]
)


class Act(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "acts"

    title_bn: Mapped[str] = mapped_column(String(500), nullable=False)
    title_en: Mapped[str] = mapped_column(String(500), nullable=False)
    act_number: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    category: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    source_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    slug: Mapped[Optional[str]] = mapped_column(String(120), unique=True, nullable=True)
    description_bn: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    description_en: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    topics: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    topics_bn: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    # Frontend StatuteStatus: live | indexing | planned
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="live")
    # Total sections in the official Act (not just the ones seeded into `sections`).
    section_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_reviewed: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    amendment_notice_bn: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    amendment_notice_en: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    sections: Mapped[list["Section"]] = relationship(
        back_populates="act", cascade="all, delete-orphan"
    )


class Section(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "sections"

    act_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("acts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    section_number: Mapped[str] = mapped_column(String(40), nullable=False)
    heading_bn: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    heading_en: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    body_bn: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    body_en: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    plain_meaning_bn: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    plain_meaning_en: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ordinal: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    act: Mapped["Act"] = relationship(back_populates="sections")


class CorpusDocument(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "corpus_documents"

    act_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("acts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    uploaded_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    page_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    ingest_status: Mapped[IngestStatus] = mapped_column(
        ingest_status_enum, nullable=False, default=IngestStatus.UPLOADED
    )
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    chunk_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    indexed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    chunks: Mapped[list["Chunk"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


class Chunk(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "chunks"

    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("corpus_documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    act_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("acts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    section_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sections.id", ondelete="SET NULL"), nullable=True
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    language: Mapped[Language] = mapped_column(chunk_language_enum, nullable=False)
    chunk_metadata: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)

    document: Mapped["CorpusDocument"] = relationship(back_populates="chunks")
    embedding: Mapped[Optional["ChunkEmbedding"]] = relationship(
        back_populates="chunk", cascade="all, delete-orphan", uselist=False
    )


class ChunkEmbedding(Base):
    __tablename__ = "chunk_embeddings"

    chunk_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chunks.id", ondelete="CASCADE"), primary_key=True
    )
    vector: Mapped[list[float]] = mapped_column(Vector(settings.embedding_dim), nullable=False)
    model_name: Mapped[str] = mapped_column(String(120), nullable=False)
    embedded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    chunk: Mapped["Chunk"] = relationship(back_populates="embedding")


class GlossaryTerm(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "glossary_terms"

    term_bn: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    term_en: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    definition_bn: Mapped[str] = mapped_column(Text, nullable=False)
    definition_en: Mapped[str] = mapped_column(Text, nullable=False)
    related_act_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("acts.id", ondelete="SET NULL"), nullable=True
    )
    synonyms: Mapped[list[str]] = mapped_column(ARRAY(String(255)), nullable=False, default=list)
    section_ref: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    example_bn: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    example_en: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
