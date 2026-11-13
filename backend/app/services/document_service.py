"""Guided drafting: templates are a list of questions; a draft renders the
answers into a bilingual document."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.document import DocumentTemplate, DraftDocument
from app.models.enums import DraftStatus
from app.models.user import User
from app.schemas.documents import DraftDocumentOut, DraftTemplateOut
from app.services.mappers import as_uuid, iso

DISCLAIMER_BN = "এই খসড়াটি স্বয়ংক্রিয়ভাবে তৈরি। দাখিলের আগে একজন আইনজীবী দিয়ে যাচাই করিয়ে নিন।"
DISCLAIMER_EN = "This draft was generated automatically. Have an advocate review it before filing."


def _template_out(t: DocumentTemplate) -> DraftTemplateOut:
    return DraftTemplateOut(
        id=t.slug, slug=t.slug, title_bn=t.title_bn, title_en=t.title_en,
        category_bn=t.category_bn or "", category_en=t.category_en or "",
        description_bn=t.description_bn or "", description_en=t.description_en or "",
        steps=t.field_schema.get("steps", []),
    )


async def list_templates(db: AsyncSession) -> list[DraftTemplateOut]:
    return [_template_out(t) for t in (await db.scalars(select(DocumentTemplate).order_by(DocumentTemplate.created_at))).all()]


async def _template(db: AsyncSession, slug_or_id: str) -> DocumentTemplate:
    clauses = [DocumentTemplate.slug == slug_or_id]
    try:
        clauses.append(DocumentTemplate.id == uuid.UUID(slug_or_id))
    except ValueError:
        pass
    t = await db.scalar(select(DocumentTemplate).where(or_(*clauses)))
    if t is None:
        raise NotFoundError("Template not found.", "টেমপ্লেটটি পাওয়া যায়নি।")
    return t


async def get_template(db: AsyncSession, slug: str) -> DraftTemplateOut:
    return _template_out(await _template(db, slug))


def render(t: DocumentTemplate, answers: dict[str, str], now: datetime) -> tuple[str, str]:
    """Each step becomes a heading (its question) followed by the citizen's answer."""
    steps = t.field_schema.get("steps", [])
    bn = [t.title_bn, f"তারিখ: {now.strftime('%d/%m/%Y')}", ""]
    en = [t.title_en.upper(), f"Date: {now.strftime('%d %B %Y')}", ""]
    for step in steps:
        answer = (answers.get(step["id"]) or "").strip()
        if not answer:
            continue
        options = {o["value"]: o for o in step.get("options") or []}
        bn += [step["questionBn"], options[answer]["labelBn"] if answer in options else answer, ""]
        en += [step["questionEn"], options[answer]["labelEn"] if answer in options else answer, ""]
    bn.append(DISCLAIMER_BN)
    en.append(DISCLAIMER_EN)
    return "\n".join(bn), "\n".join(en)


def _status(status: DraftStatus) -> str:
    return "final" if status == DraftStatus.FINALISED else "draft"


async def _documents_out(db: AsyncSession, docs: list[DraftDocument]) -> list[DraftDocumentOut]:
    templates = {t.id: t for t in (await db.scalars(
        select(DocumentTemplate).where(DocumentTemplate.id.in_({d.template_id for d in docs}))
    )).all()} if docs else {}
    out = []
    for d in docs:
        t = templates[d.template_id]
        out.append(DraftDocumentOut(
            id=str(d.id), user_id=str(d.citizen_id), template_id=t.slug,
            template_title_bn=t.title_bn, template_title_en=t.title_en, title=d.title,
            status=_status(d.status), answers=d.answers,
            generated_text_bn=d.generated_body or "", generated_text_en=d.generated_body_en or "",
            created_at=iso(d.created_at), updated_at=iso(d.updated_at),
        ))
    return out


async def list_documents(db: AsyncSession, user: User) -> list[DraftDocumentOut]:
    docs = (await db.scalars(
        select(DraftDocument).where(DraftDocument.citizen_id == user.id).order_by(DraftDocument.created_at.desc())
    )).all()
    return await _documents_out(db, list(docs))


async def get_document(db: AsyncSession, user: User, document_id: str) -> DraftDocumentOut:
    d = await db.scalar(select(DraftDocument).where(
        DraftDocument.id == as_uuid(document_id, "Document"), DraftDocument.citizen_id == user.id
    ))
    if d is None:
        raise NotFoundError("Document not found.", "নথিটি পাওয়া যায়নি।")
    return (await _documents_out(db, [d]))[0]


async def create_document(db: AsyncSession, user: User, template_id: str, title: str | None, answers: dict[str, str]) -> DraftDocumentOut:
    t = await _template(db, template_id)
    now = datetime.now(timezone.utc)
    text_bn, text_en = render(t, answers, now)
    d = DraftDocument(
        citizen_id=user.id, template_id=t.id, title=(title or "").strip() or t.title_bn,
        answers=answers, generated_body=text_bn, generated_body_en=text_en, status=DraftStatus.GENERATED,
    )
    db.add(d)
    await db.commit()
    await db.refresh(d)
    return (await _documents_out(db, [d]))[0]
