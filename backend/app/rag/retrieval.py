"""Lexical retrieval over statute sections.

Stand-in until chunk embeddings are populated: scores every section by term
overlap with the question (both languages), boosted by topic hints that map
common everyday phrasings ("landlord", "ভাড়া", "blackmail" ...) to the Acts
that govern them. The corpus is small (tens of sections), so scoring in
Python is cheaper than a round of full-text-search setup.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.corpus import Act, Section

TOPIC_HINTS: list[tuple[re.Pattern[str], list[str]]] = [
    (re.compile(r"rent|landlord|tenant|evict|ভাড়া|বাড়িওয়ালা|বাড়ির মালিক|উচ্ছেদ", re.I), ["rent-control-1991"]),
    (re.compile(r"cyber|facebook|photo|blackmail|online|hack|হ্যাক|ছবি|ব্ল্যাকমেইল|সাইবার", re.I),
     ["cyber-ordinance-2025", "penal-code-1860"]),
    (re.compile(r"violence|abuse|wife|husband|dowry|মারধর|যৌতুক|নির্যাতন|পারিবারিক", re.I),
     ["domestic-violence-2010", "dowry-prohibition-2018"]),
    (re.compile(r"consumer|mrp|price|overcharg|দোকান|ভোক্তা|দাম|রসিদ", re.I), ["consumer-rights-2009"]),
    (re.compile(r"evidence|proof|সাক্ষ্য|প্রমাণ|দলিল", re.I), ["evidence-act-1872"]),
    (re.compile(r"fraud|cheat|threat|প্রতারণা|হুমকি|চাঁদা", re.I), ["penal-code-1860"]),
    (re.compile(r"constitution|fundamental|equal|speech|arrest|সংবিধান|অধিকার|সমতা|গ্রেফতার", re.I),
     ["constitution-1972"]),
]
HINT_BOOST = 6.0
FALLBACK_ACT = "constitution-1972"

_SPLIT = re.compile(r"[\s,.;:!?।()\[\]\"'/·\-–—*#]+")
_STOPWORDS = {
    "the", "a", "an", "of", "to", "in", "and", "or", "is", "are", "my", "me", "i", "can", "what",
    "for", "on", "by", "be", "it", "this", "that", "with", "without", "any", "do", "does", "how",
    "আমি", "আমার", "কি", "কী", "এবং", "ও", "করে", "করতে", "হবে", "না", "যে", "এই", "কোন", "কোনো",
}


def tokenize(text: str) -> set[str]:
    return {t for t in _SPLIT.split(text.lower()) if len(t) > 1 and t not in _STOPWORDS}


@dataclass
class RetrievedSection:
    act: Act
    section: Section
    score: float  # normalised to 0..1


def _section_text(act: Act, s: Section) -> str:
    return " ".join(filter(None, [
        act.title_bn, act.title_en, " ".join(act.topics), " ".join(act.topics_bn),
        s.section_number, s.heading_bn, s.heading_en, s.body_bn, s.body_en,
        s.plain_meaning_bn, s.plain_meaning_en,
    ]))


async def retrieve(db: AsyncSession, question: str, top_k: int = 3) -> list[RetrievedSection]:
    acts = (await db.scalars(
        select(Act).options(selectinload(Act.sections)).where(Act.is_active.is_(True))
    )).all()
    q_tokens = tokenize(question)
    hinted = {slug for pattern, slugs in TOPIC_HINTS if pattern.search(question) for slug in slugs}

    scored: list[tuple[float, Act, Section]] = []
    for act in acts:
        boost = HINT_BOOST if act.slug in hinted else 0.0
        for s in act.sections:
            overlap = len(q_tokens & tokenize(_section_text(act, s)))
            raw = overlap + boost
            if raw > 0:
                scored.append((raw, act, s))

    scored.sort(key=lambda t: (t[0], -t[2].ordinal), reverse=True)
    if not scored:
        fallback = next((a for a in acts if a.slug == FALLBACK_ACT and a.sections), None)
        if fallback is None:
            return []
        return [RetrievedSection(fallback, s, 0.5) for s in sorted(fallback.sections, key=lambda s: s.ordinal)[:2]]

    best = scored[0][0]
    return [
        RetrievedSection(act, s, round(0.6 + 0.39 * raw / best, 2))
        for raw, act, s in scored[:top_k]
        if raw >= best * 0.5
    ]


def best_sentence(text: str, question: str) -> str:
    """The sentence of `text` sharing most terms with the question — the citation's highlighted match."""
    sentences = [s.strip() for s in re.split(r"(?<=[।.;])\s+", text or "") if s.strip()]
    if not sentences:
        return text or ""
    q = tokenize(question)
    return max(sentences, key=lambda s: len(q & tokenize(s)))
