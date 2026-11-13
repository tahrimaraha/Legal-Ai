"""`/conversations`, `/chat` and `/messages/{id}/feedback` — the citizen AI chat."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse, ConversationOut, FeedbackRequest, FeedbackResponse
from app.schemas.common import OkResponse
from app.services import chat_service

router = APIRouter()


@router.get("/conversations", response_model=list[ConversationOut])
async def list_conversations(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[ConversationOut]:
    return await chat_service.list_conversations(db, user)


@router.get("/conversations/{conversation_id}", response_model=ConversationOut)
async def get_conversation(
    conversation_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> ConversationOut:
    return await chat_service.get_conversation(db, user, conversation_id)


@router.delete("/conversations/{conversation_id}", response_model=OkResponse)
async def delete_conversation(
    conversation_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> OkResponse:
    await chat_service.delete_conversation(db, user, conversation_id)
    return OkResponse()


@router.post("/chat", response_model=ChatResponse)
async def ask(
    payload: ChatRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> ChatResponse:
    return await chat_service.ask(db, user, payload.question, payload.conversation_id)


@router.post("/messages/{message_id}/feedback", response_model=FeedbackResponse)
async def send_feedback(
    message_id: str, payload: FeedbackRequest,
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
) -> FeedbackResponse:
    await chat_service.send_feedback(db, user, message_id, payload.value, payload.reason)
    return FeedbackResponse(message_id=message_id)
