"""Schemas for `/statutes` and `/glossary` (frontend `Statute`, `GlossaryTerm`)."""
from __future__ import annotations

from typing import Optional

from app.schemas.common import CamelModel


class StatuteSectionOut(CamelModel):
    id: str
    section_number: str
    title_bn: str
    title_en: str
    content_bn: str
    content_en: str
    plain_meaning_bn: str
    plain_meaning_en: str


class StatuteOut(CamelModel):
    # `id` is the Act's slug: the frontend treats statute ids as readable slugs.
    id: str
    slug: str
    title_bn: str
    title_en: str
    year: str
    description_bn: str
    description_en: str
    topics: list[str]
    topics_bn: list[str]
    section_count: int
    status: str
    last_reviewed: str
    amendment_notice_bn: Optional[str] = None
    amendment_notice_en: Optional[str] = None
    sections: list[StatuteSectionOut] = []
    chunks: Optional[int] = None


class GlossaryTermOut(CamelModel):
    id: str
    term_bn: str
    term_en: str
    plain_bn: str
    plain_en: str
    source_id: str
    source_title_bn: str
    source_title_en: str
    section: str
    example_bn: Optional[str] = None
    example_en: Optional[str] = None
