"""Request/response schemas for the AI chat and recommendation endpoints."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class HistoryItem(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    text: str = Field(max_length=4000)


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    conversationId: Optional[str] = None
    history: list[HistoryItem] = Field(default_factory=list, max_length=12)


class RecommendRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
