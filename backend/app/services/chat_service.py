"""Conversations, the `/chat` question → grounded answer flow, and feedback."""
from __future__ import annotations

import re
import time
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError
from app.models.chat import Conversation, Message, MessageCitation, MessageFeedback
from app.models.corpus import Act, Section
from app.models.enums import FeedbackRating, Language, MessageRole
from app.models.moderation import FlaggedAnswer
from app.models.user import User
from app.models.verification import VerificationRequest
from app.rag.answer import compose_answer
from app.rag.retrieval import best_sentence, retrieve
from app.schemas.chat import ChatResponse, CitationOut, ConversationOut, MessageOut
from app.services.mappers import as_uuid, iso

_BENGALI = re.compile(r"[ঀ-৿]")
TITLE_LENGTH = 45


def detect_language(text: str) -> Language:
    return Language.BN if _BENGALI.search(text) else Language.EN


def _title(question: str) -> str:
    return question[:TITLE_LENGTH] + ("..." if len(question) > TITLE_LENGTH else "")


def citation_out(act: Act, section: Section, c: Optional[MessageCitation] = None,
                 *, match_bn: str = "", match_en: str = "", score: float = 0.0) -> CitationOut:
    bn, _, en = section.section_number.partition(" / ")
    return CitationOut(
        id=str(section.id),
        statute_id=act.slug or str(act.id),
        statute_slug=act.slug,
        label_bn=f"{act.title_bn} · {bn}",
        label_en=f"{act.title_en} · {en or bn}",
        section=bn,
        text_bn=section.body_bn or "",
        text_en=section.body_en or "",
        match_bn=(c.quoted_span if c else match_bn) or "",
        match_en=(c.quoted_span_en if c else match_en) or "",
        score=float(c.relevance_score or 0) if c else score,
    )


# --- loading ---------------------------------------------------------------

async def citations_by_message(db: AsyncSession, message_ids: list) -> dict:
    if not message_ids:
        return {}
    rows = await db.execute(
        select(MessageCitation, Act, Section)
        .join(Act, Act.id == MessageCitation.act_id)
        .join(Section, Section.id == MessageCitation.section_id)
        .where(MessageCitation.message_id.in_(message_ids))
        .order_by(MessageCitation.relevance_score.desc())
    )
    out: dict = {}
    for c, act, section in rows:
        out.setdefault(c.message_id, []).append(citation_out(act, section, c))
    return out


async def _verifications_by_message(db: AsyncSession, message_ids: list) -> dict:
    if not message_ids:
        return {}
    rows = await db.execute(
        select(VerificationRequest.message_id, VerificationRequest.id)
        .where(VerificationRequest.message_id.in_(message_ids))
        .order_by(VerificationRequest.created_at)
    )
    return {mid: vid for mid, vid in rows}


def _message_out(m: Message, citations: dict, verifications: dict, citizen_id) -> MessageOut:
    rating = None
    for f in m.feedback:
        if f.citizen_id == citizen_id:
            rating = "up" if f.rating == FeedbackRating.HELPFUL else "down"
    verification_id = verifications.get(m.id)
    return MessageOut(
        id=str(m.id),
        role="user" if m.role == MessageRole.USER else "assistant",
        body_bn=m.body_bn or m.content,
        body_en=m.body_en or m.content,
        citations=citations.get(m.id, []),
        created_at=iso(m.created_at),
        rating=rating,
        flagged=m.is_flagged or None,
        verification_id=str(verification_id) if verification_id else None,
    )


async def _conversations_out(db: AsyncSession, convs: list[Conversation]) -> list[ConversationOut]:
    message_ids = [m.id for c in convs for m in c.messages]
    citations = await citations_by_message(db, message_ids)
    verifications = await _verifications_by_message(db, message_ids)
    out = []
    for c in convs:
        messages = [_message_out(m, citations, verifications, c.citizen_id) for m in c.messages]
        cited = list(dict.fromkeys(ci.statute_id for m in messages for ci in m.citations))
        out.append(ConversationOut(
            id=str(c.id),
            title_bn=c.title or "",
            title_en=c.title or "",
            updated_at=iso(c.last_message_at or c.updated_at),
            messages=messages,
            status="archived" if c.is_archived else "active",
            cited_statute_ids=cited,
            verification_requested=any(m.verification_id for m in messages),
        ))
    return out


def _conversation_query():
    return select(Conversation).options(
        selectinload(Conversation.messages).selectinload(Message.feedback)
    ).where(Conversation.deleted_at.is_(None))


async def list_conversations(db: AsyncSession, user: User) -> list[ConversationOut]:
    convs = (await db.scalars(
        _conversation_query().where(Conversation.citizen_id == user.id)
        .order_by(Conversation.last_message_at.desc().nullslast(), Conversation.created_at.desc())
    )).all()
    return await _conversations_out(db, list(convs))


async def _owned_conversation(db: AsyncSession, user: User, conversation_id: str) -> Conversation:
    conv = await db.scalar(_conversation_query().where(
        Conversation.id == as_uuid(conversation_id, "Conversation"), Conversation.citizen_id == user.id
    ))
    if conv is None:
        raise NotFoundError("Conversation not found.", "কথোপকথনটি পাওয়া যায়নি।")
    return conv


async def get_conversation(db: AsyncSession, user: User, conversation_id: str) -> ConversationOut:
    conv = await _owned_conversation(db, user, conversation_id)
    return (await _conversations_out(db, [conv]))[0]


async def delete_conversation(db: AsyncSession, user: User, conversation_id: str) -> None:
    conv = await _owned_conversation(db, user, conversation_id)
    conv.deleted_at = datetime.now(timezone.utc)
    await db.commit()


# --- asking ----------------------------------------------------------------

async def ask(db: AsyncSession, user: User, question: str, conversation_id: Optional[str]) -> ChatResponse:
    question = question.strip()
    language = detect_language(question)
    now = datetime.now(timezone.utc)

    if conversation_id:
        conv = await _owned_conversation(db, user, conversation_id)
    else:
        conv = Conversation(citizen_id=user.id, title=_title(question), language=language)
        db.add(conv)
        await db.flush()

    db.add(Message(
        conversation_id=conv.id, role=MessageRole.USER, content=question,
        body_bn=question, body_en=question, language=language,
    ))

    started = time.perf_counter()
    retrieved = await retrieve(db, question)
    answer = await compose_answer(question, retrieved)
    latency_ms = int((time.perf_counter() - started) * 1000)

    assistant = Message(
        conversation_id=conv.id,
        role=MessageRole.ASSISTANT,
        content=answer.body_bn if language == Language.BN else answer.body_en,
        body_bn=answer.body_bn,
        body_en=answer.body_en,
        language=language,
        model_name=answer.model_name,
        latency_ms=latency_ms,
        retrieval_trace={"sections": [
            {"sectionId": str(r.section.id), "act": r.act.slug, "score": r.score} for r in retrieved
        ]},
        confidence_score=max((r.score for r in retrieved), default=0.0),
    )
    db.add(assistant)
    await db.flush()

    citations = []
    for r in retrieved:
        match_bn = best_sentence(r.section.body_bn or "", question)
        match_en = best_sentence(r.section.body_en or "", question)
        db.add(MessageCitation(
            message_id=assistant.id, act_id=r.act.id, section_id=r.section.id,
            quoted_span=match_bn, quoted_span_en=match_en, relevance_score=r.score,
            display_label=r.section.section_number,
        ))
        citations.append(citation_out(r.act, r.section, match_bn=match_bn, match_en=match_en, score=r.score))

    conv.last_message_at = now
    conv.message_count = (conv.message_count or 0) + 2
    await db.commit()
    await db.refresh(assistant)

    return ChatResponse(
        message=MessageOut(
            id=str(assistant.id), role="assistant", body_bn=answer.body_bn, body_en=answer.body_en,
            citations=citations, created_at=iso(assistant.created_at),
        ),
        conversation_id=str(conv.id),
    )


# --- feedback --------------------------------------------------------------

async def send_feedback(db: AsyncSession, user: User, message_id: str, value: str, reason: Optional[str]) -> None:
    message = await db.scalar(
        select(Message).join(Conversation, Conversation.id == Message.conversation_id).where(
            Message.id == as_uuid(message_id, "Message"), Conversation.citizen_id == user.id
        )
    )
    if message is None:
        raise NotFoundError("Message not found.", "বার্তাটি পাওয়া যায়নি।")

    if value == "flag":
        message.is_flagged = True
        db.add(FlaggedAnswer(
            message_id=message.id, reporter_id=user.id, reason_code="citizen_flag",
            description=reason or "Flagged by citizen as incorrect",
        ))
    else:
        rating = FeedbackRating.HELPFUL if value == "up" else FeedbackRating.NOT_HELPFUL
        existing = await db.scalar(select(MessageFeedback).where(
            MessageFeedback.message_id == message.id, MessageFeedback.citizen_id == user.id
        ))
        await db.execute(delete(MessageFeedback).where(
            MessageFeedback.message_id == message.id, MessageFeedback.citizen_id == user.id
        ))
        # Sending the current rating again clears it (the UI's toggle).
        if existing is None or existing.rating != rating:
            db.add(MessageFeedback(message_id=message.id, citizen_id=user.id, rating=rating, comment=reason))
    await db.commit()
