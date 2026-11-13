"""Seed the reference content the frontend renders: statutes and sections, the
glossary, the lawyer directory, drafting templates and corpus documents.

Data lives in `scripts/seed_data/*.json` (exported from the frontend's original
mock fixtures). Idempotent — rows are upserted by slug / email, so it is safe
to re-run after editing the JSON. Run after `seed_demo_users`:
    python -m scripts.seed_demo_users && python -m scripts.seed_content
"""
from __future__ import annotations

import asyncio
import json
import re
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any

from slugify import slugify
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.database import AsyncSessionLocal
from app.models.corpus import Act, CorpusDocument, GlossaryTerm, Section
from app.models.document import DocumentTemplate
from app.models.enums import (
    ConsultationMode,
    CredentialDocType,
    CredentialStatus,
    IngestStatus,
    LawyerApprovalStatus,
    UserRole,
)
from app.models.profile import (
    LawyerCredential,
    LawyerFee,
    LawyerProfile,
    LawyerSpecialization,
    Specialization,
)
from app.models.user import User
from app.providers.storage import save_data_url
from app.services.mappers import LANGUAGE_CODES, MODE_TO_DB
from scripts.seed_demo_users import DEMO_PASSWORD

DATA_DIR = Path(__file__).parent / "seed_data"

# The sample directory's "Advocate Md. Rafiqul Islam" is the demo lawyer login.
DEMO_LAWYER_FIXTURE_IDS = {"lawyer-3": "advocate.rafiq@example.com"}

LAWYER_STATUS = {
    "verified": LawyerApprovalStatus.APPROVED,
    "pending": LawyerApprovalStatus.PENDING,
    "rejected": LawyerApprovalStatus.REJECTED,
}
INGEST_STATUS = {
    "indexed": IngestStatus.READY,
    "processing": IngestStatus.EMBEDDING,
    "failed": IngestStatus.FAILED,
}


def _load(name: str) -> list[dict[str, Any]]:
    return json.loads((DATA_DIR / f"{name}.json").read_text(encoding="utf-8"))


def _citation_section_number(citation: dict[str, Any]) -> str:
    """"House Rent Control Act 1991 · Section 7" -> "ধারা ৭ / Section 7"."""
    bn = citation["labelBn"].split("·")[-1].strip()
    en = citation["labelEn"].split("·")[-1].strip()
    return f"{bn} / {en}"


async def seed_statutes(db: AsyncSession) -> dict[str, Act]:
    acts: dict[str, Act] = {}
    for ordinal_base, s in enumerate(_load("statutes")):
        act = await db.scalar(select(Act).where(Act.slug == s["slug"]))
        if act is None:
            act = Act(slug=s["slug"], title_bn=s["titleBn"], title_en=s["titleEn"])
            db.add(act)
        act.title_bn = s["titleBn"]
        act.title_en = s["titleEn"]
        act.year = int(s["year"]) if re.fullmatch(r"\d{4}", s["year"]) else None
        act.description_bn = s["descriptionBn"]
        act.description_en = s["descriptionEn"]
        act.topics = s["topics"]
        act.topics_bn = s["topicsBn"]
        act.status = s["status"]
        act.section_count = s["sectionCount"]
        act.last_reviewed = date.fromisoformat(s["lastReviewed"])
        act.amendment_notice_bn = s.get("amendmentNoticeBn")
        act.amendment_notice_en = s.get("amendmentNoticeEn")
        act.is_active = s["status"] != "planned"
        await db.flush()
        acts[s["slug"]] = act

        for i, sec in enumerate(s.get("sections") or []):
            await _upsert_section(
                db, act, sec["sectionNumber"], ordinal=i,
                heading_bn=sec["titleBn"], heading_en=sec["titleEn"],
                body_bn=sec["contentBn"], body_en=sec["contentEn"],
                plain_bn=sec["plainMeaningBn"], plain_en=sec["plainMeaningEn"],
            )

    # Citation fixtures quote a few sections the statute list doesn't carry.
    for c in _load("citations"):
        act = acts[c["statuteId"]]
        number = _citation_section_number(c)
        existing = await db.scalar(
            select(Section).where(Section.act_id == act.id, Section.section_number == number)
        )
        if existing is None:
            await _upsert_section(
                db, act, number, ordinal=100,
                heading_bn=number.split(" / ")[0], heading_en=number.split(" / ")[1],
                body_bn=c["textBn"], body_en=c["textEn"], plain_bn=None, plain_en=None,
            )
    print(f"statutes: {len(acts)}")
    return acts


async def _upsert_section(
    db: AsyncSession, act: Act, number: str, *, ordinal: int,
    heading_bn: str, heading_en: str, body_bn: str, body_en: str,
    plain_bn: str | None, plain_en: str | None,
) -> None:
    section = await db.scalar(
        select(Section).where(Section.act_id == act.id, Section.section_number == number)
    )
    if section is None:
        section = Section(act_id=act.id, section_number=number)
        db.add(section)
    section.ordinal = ordinal
    section.heading_bn, section.heading_en = heading_bn, heading_en
    section.body_bn, section.body_en = body_bn, body_en
    section.plain_meaning_bn, section.plain_meaning_en = plain_bn, plain_en


async def seed_glossary(db: AsyncSession, acts: dict[str, Act]) -> None:
    for g in _load("glossary"):
        term = await db.scalar(select(GlossaryTerm).where(GlossaryTerm.term_en == g["termEn"]))
        if term is None:
            term = GlossaryTerm(term_en=g["termEn"])
            db.add(term)
        term.term_bn = g["termBn"]
        term.definition_bn = g["plainBn"]
        term.definition_en = g["plainEn"]
        act = acts.get(g["sourceId"])
        term.related_act_id = act.id if act else None
        term.section_ref = g["section"]
        term.example_bn = g.get("exampleBn")
        term.example_en = g.get("exampleEn")
        term.synonyms = term.synonyms or []
    print(f"glossary terms: {len(_load('glossary'))}")


async def _specialization(db: AsyncSession, name_en: str, name_bn: str) -> Specialization:
    slug = slugify(name_en)
    spec = await db.scalar(select(Specialization).where(Specialization.slug == slug))
    if spec is None:
        spec = Specialization(slug=slug, name_en=name_en, name_bn=name_bn)
        db.add(spec)
        await db.flush()
    return spec


async def seed_lawyers(db: AsyncSession) -> None:
    password_hash = hash_password(DEMO_PASSWORD)
    now = datetime.now(timezone.utc)
    for l in _load("lawyers"):
        email = DEMO_LAWYER_FIXTURE_IDS.get(l["id"], f"{l['id']}@lawyers.legalai.bd")
        user = await db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(
                email=email, password_hash=password_hash, role=UserRole.LAWYER,
                full_name=l["fullName"], is_active=True, email_verified_at=now,
            )
            db.add(user)
            await db.flush()
        user.full_name = l["fullName"]
        user.avatar_url = l.get("avatarUrl")

        profile = await db.get(LawyerProfile, user.id)
        if profile is None:
            profile = LawyerProfile(user_id=user.id, bar_council_enrollment_no=l["barEnrolmentNo"])
            db.add(profile)
        profile.bar_council_enrollment_no = l["barEnrolmentNo"]
        profile.enrollment_year = l["enrolmentYear"]
        profile.full_name_bn = l["fullNameBn"]
        profile.title_en, profile.title_bn = l["title"], l["titleBn"]
        profile.district, profile.district_bn = l["district"], l["districtBn"]
        profile.courts, profile.courts_bn = l["courts"], l["courtsBn"]
        profile.education, profile.education_bn = l["education"], l["educationBn"]
        profile.languages = [LANGUAGE_CODES.get(x, x[:8].lower()) for x in l["languages"]]
        profile.bio_bn, profile.bio_en = l["bioBn"], l["bioEn"]
        profile.years_of_experience = l["experienceYears"]
        profile.rating_avg = Decimal(str(l["rating"]))
        profile.rating_count = l["reviewCount"]
        profile.response_time_en = l["responseTimeCommitment"]
        profile.response_time_bn = l["responseTimeCommitmentBn"]
        profile.is_available_today = bool(l.get("isAvailableToday"))
        profile.away_notice = l.get("awayNotice")
        profile.approval_status = LAWYER_STATUS[l["verificationStatus"]]
        profile.approved_at = now if profile.approval_status == LawyerApprovalStatus.APPROVED else None
        await db.flush()

        await db.execute(delete(LawyerSpecialization).where(LawyerSpecialization.lawyer_id == user.id))
        for name_en, name_bn in zip(l["practiceAreas"], l["practiceAreasBn"]):
            spec = await _specialization(db, name_en, name_bn)
            db.add(LawyerSpecialization(lawyer_id=user.id, specialization_id=spec.id))

        await db.execute(delete(LawyerFee).where(LawyerFee.lawyer_id == user.id))
        for fee in l["fees"]:
            db.add(LawyerFee(
                lawyer_id=user.id, mode=MODE_TO_DB[fee["mode"]],
                amount=Decimal(str(fee["feeBdt"])), duration_minutes=fee["durationMinutes"],
            ))

        if l.get("licenseDocumentName"):
            has_license = await db.scalar(select(LawyerCredential.id).where(
                LawyerCredential.lawyer_id == user.id,
                LawyerCredential.doc_type == CredentialDocType.BAR_LICENSE,
            ))
            if has_license is None:
                file_url, mime_type, size_bytes = save_data_url(
                    "licenses", l["licenseDocumentName"], l["licenseDocumentUrl"]
                )
                db.add(LawyerCredential(
                    lawyer_id=user.id, doc_type=CredentialDocType.BAR_LICENSE,
                    file_url=file_url, original_filename=l["licenseDocumentName"],
                    mime_type=mime_type, size_bytes=size_bytes, status=CredentialStatus.PENDING,
                ))
    print(f"lawyers: {len(_load('lawyers'))} (password {DEMO_PASSWORD})")


async def seed_templates(db: AsyncSession) -> None:
    for t in _load("templates"):
        tmpl = await db.scalar(select(DocumentTemplate).where(DocumentTemplate.slug == t["slug"]))
        if tmpl is None:
            tmpl = DocumentTemplate(slug=t["slug"], body_template="")
            db.add(tmpl)
        tmpl.title_bn, tmpl.title_en = t["titleBn"], t["titleEn"]
        tmpl.category_bn, tmpl.category_en = t["categoryBn"], t["categoryEn"]
        tmpl.description_bn, tmpl.description_en = t["descriptionBn"], t["descriptionEn"]
        tmpl.field_schema = {"steps": t["steps"]}
    print(f"templates: {len(_load('templates'))}")


async def seed_corpus(db: AsyncSession, acts: dict[str, Act]) -> None:
    for c in _load("corpus"):
        act = acts[c["statuteId"]]
        doc = await db.scalar(select(CorpusDocument).where(CorpusDocument.filename == c["fileName"]))
        if doc is None:
            doc = CorpusDocument(act_id=act.id, filename=c["fileName"], file_url=f"corpus/{c['fileName']}")
            db.add(doc)
        doc.act_id = act.id
        doc.chunk_count = c["chunks"]
        doc.size_bytes = int(c["fileSizeMb"] * 1024 * 1024)
        doc.ingest_status = INGEST_STATUS[c["status"]]
        doc.indexed_at = datetime.fromisoformat(c["lastIndexed"].replace("Z", "+00:00"))
        doc.error_message = c.get("error")
    print(f"corpus documents: {len(_load('corpus'))}")


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        acts = await seed_statutes(db)
        await seed_glossary(db, acts)
        await seed_lawyers(db)
        await seed_templates(db)
        await seed_corpus(db, acts)
        await db.commit()


if __name__ == "__main__":
    asyncio.run(seed())
