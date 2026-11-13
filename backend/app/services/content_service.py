"""Read-side of the statute corpus and glossary."""
from __future__ import annotations

from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError
from app.models.corpus import Act, CorpusDocument, GlossaryTerm, Section
from app.schemas.content import GlossaryTermOut, StatuteOut, StatuteSectionOut


def to_section_out(section: Section) -> StatuteSectionOut:
    return StatuteSectionOut(
        id=str(section.id),
        section_number=section.section_number,
        title_bn=section.heading_bn or "",
        title_en=section.heading_en or "",
        content_bn=section.body_bn or "",
        content_en=section.body_en or "",
        plain_meaning_bn=section.plain_meaning_bn or "",
        plain_meaning_en=section.plain_meaning_en or "",
    )


def to_statute_out(act: Act, chunks: Optional[int]) -> StatuteOut:
    return StatuteOut(
        id=act.slug or str(act.id),
        slug=act.slug or str(act.id),
        title_bn=act.title_bn,
        title_en=act.title_en,
        year=str(act.year) if act.year else "—",
        description_bn=act.description_bn or "",
        description_en=act.description_en or "",
        topics=act.topics,
        topics_bn=act.topics_bn,
        section_count=act.section_count,
        status=act.status,
        last_reviewed=act.last_reviewed.isoformat() if act.last_reviewed else "",
        amendment_notice_bn=act.amendment_notice_bn,
        amendment_notice_en=act.amendment_notice_en,
        sections=[to_section_out(s) for s in sorted(act.sections, key=lambda s: s.ordinal)],
        chunks=chunks,
    )


async def _chunk_counts(db: AsyncSession) -> dict:
    rows = await db.execute(
        select(CorpusDocument.act_id, func.sum(CorpusDocument.chunk_count)).group_by(CorpusDocument.act_id)
    )
    return {act_id: int(total) for act_id, total in rows if total}


async def list_statutes(db: AsyncSession) -> list[StatuteOut]:
    acts = (await db.scalars(
        select(Act).options(selectinload(Act.sections)).order_by(Act.created_at)
    )).all()
    counts = await _chunk_counts(db)
    return [to_statute_out(a, counts.get(a.id)) for a in acts]


async def get_act_by_slug(db: AsyncSession, slug: str) -> Act:
    act = await db.scalar(select(Act).options(selectinload(Act.sections)).where(Act.slug == slug))
    if act is None:
        raise NotFoundError("Statute not found.", "আইনটি পাওয়া যায়নি।")
    return act


async def get_statute(db: AsyncSession, slug: str) -> StatuteOut:
    act = await get_act_by_slug(db, slug)
    return to_statute_out(act, (await _chunk_counts(db)).get(act.id))


async def search_glossary(db: AsyncSession, query: Optional[str]) -> list[GlossaryTermOut]:
    stmt = select(GlossaryTerm, Act).outerjoin(Act, Act.id == GlossaryTerm.related_act_id)
    q = (query or "").strip()
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(
            GlossaryTerm.term_bn.ilike(like), GlossaryTerm.term_en.ilike(like),
            GlossaryTerm.definition_bn.ilike(like), GlossaryTerm.definition_en.ilike(like),
            GlossaryTerm.section_ref.ilike(like),
        ))
    rows = await db.execute(stmt.order_by(GlossaryTerm.created_at))
    return [
        GlossaryTermOut(
            id=str(term.id),
            term_bn=term.term_bn,
            term_en=term.term_en,
            plain_bn=term.definition_bn,
            plain_en=term.definition_en,
            source_id=act.slug if act else "",
            source_title_bn=act.title_bn if act else "",
            source_title_en=act.title_en if act else "",
            section=term.section_ref or "",
            example_bn=term.example_bn,
            example_en=term.example_en,
        )
        for term, act in rows
    ]
