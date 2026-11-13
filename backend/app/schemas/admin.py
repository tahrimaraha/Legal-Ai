"""Schemas for `/admin/*` (frontend `AdminStats`, `FlaggedAnswer`, `CorpusDocument`)."""
from __future__ import annotations

from typing import Literal, Optional

from app.schemas.chat import CitationOut
from app.schemas.common import CamelModel


class DayCount(CamelModel):
    day: str
    count: int


class CategoryCount(CamelModel):
    category: str
    category_bn: str
    count: int


class AdminStatsOut(CamelModel):
    total_citizens: int
    total_lawyers: int
    pending_lawyers: int
    questions_asked_this_week: int
    questions_total: int
    unanswered_verifications_over48h: int
    corpus_health_pct: float
    indexed_statutes_count: int
    weekly_questions: list[DayCount]
    category_breakdown: list[CategoryCount]


class FlaggedAnswerOut(CamelModel):
    id: str
    message_id: str
    question_bn: str
    question_en: str
    answer_bn: str
    answer_en: str
    reason: str
    status: Literal["pending", "resolved", "escalated"]
    reported_at: str
    citations: list[CitationOut]


class ResolveFlagRequest(CamelModel):
    action: Literal["dismiss", "escalate", "corpus_issue"]


class RejectLawyerRequest(CamelModel):
    reason: Optional[str] = None


class CorpusDocumentOut(CamelModel):
    id: str
    file_name: str
    statute_id: str
    statute_title_bn: str
    statute_title_en: str
    chunks: int
    status: Literal["indexed", "processing", "failed"]
    file_size_mb: float
    last_indexed: str
    error: Optional[str] = None


class ReindexResponse(CamelModel):
    ok: bool
    message: str
