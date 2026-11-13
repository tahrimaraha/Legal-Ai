"""Schemas for conversations, `/chat` and message feedback (frontend `Message`, `Citation`, `Conversation`)."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import Field

from app.schemas.common import CamelModel


class CitationOut(CamelModel):
    id: str
    statute_id: str
    statute_slug: Optional[str] = None
    label_bn: str
    label_en: str
    section: str
    text_bn: str
    text_en: str
    match_bn: str
    match_en: str
    score: float


class MessageOut(CamelModel):
    id: str
    role: Literal["user", "assistant"]
    body_bn: str
    body_en: str
    citations: list[CitationOut] = []
    created_at: str
    rating: Optional[Literal["up", "down"]] = None
    flagged: Optional[bool] = None
    verification_id: Optional[str] = None


class ConversationOut(CamelModel):
    id: str
    title_bn: str
    title_en: str
    updated_at: str
    messages: list[MessageOut] = []
    status: Literal["active", "archived"] = "active"
    cited_statute_ids: list[str] = []
    verification_requested: bool = False


class ChatRequest(CamelModel):
    question: str = Field(min_length=1, max_length=4000)
    conversation_id: Optional[str] = None


class ChatResponse(CamelModel):
    message: MessageOut
    conversation_id: str


class FeedbackRequest(CamelModel):
    value: Literal["up", "down", "flag"]
    reason: Optional[str] = None


class FeedbackResponse(CamelModel):
    ok: bool = True
    message_id: str
