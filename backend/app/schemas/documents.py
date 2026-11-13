"""Schemas for `/draft/templates` and `/documents` (frontend `DraftTemplate`, `DraftDocument`)."""
from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import Field

from app.schemas.common import CamelModel


class DraftTemplateOut(CamelModel):
    id: str
    slug: str
    title_bn: str
    title_en: str
    category_bn: str
    category_en: str
    description_bn: str
    description_en: str
    # DraftStep objects exactly as authored (they already use the frontend's keys).
    steps: list[dict[str, Any]]


class DraftDocumentOut(CamelModel):
    id: str
    user_id: str
    template_id: str
    template_title_bn: str
    template_title_en: str
    title: str
    status: Literal["draft", "final", "shared"]
    answers: dict[str, str]
    generated_text_bn: str
    generated_text_en: str
    created_at: str
    updated_at: str


class CreateDocumentRequest(CamelModel):
    template_id: str
    title: Optional[str] = Field(default=None, max_length=255)
    answers: dict[str, str] = {}
