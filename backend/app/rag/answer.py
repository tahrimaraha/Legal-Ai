"""Turns retrieved sections into a bilingual, cited answer.

With `GEMINI_API_KEY` set, Gemini writes the answer constrained to the
retrieved sections. Without it (or if the call fails) the answer is composed
extractively from the sections' plain-language summaries, so the chat still
returns grounded, cited answers in development.
"""
from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass

from app.config import settings
from app.core.logging import get_logger
from app.rag.retrieval import RetrievedSection

logger = get_logger(__name__)

EXTRACTIVE_MODEL = "extractive-v1"

DISCLAIMER_BN = "_এটি আইনি তথ্য, আইনি পরামর্শ নয়। আপনার নির্দিষ্ট পরিস্থিতির জন্য একজন যাচাইকৃত আইনজীবীর মতামত নিন।_"
DISCLAIMER_EN = "_This is legal information, not legal advice. For your specific situation, consult a verified advocate._"

NO_MATCH_BN = (
    "দুঃখিত, আমাদের সংকলিত আইনের মধ্যে এই প্রশ্নের সাথে সরাসরি সম্পর্কিত কোনো ধারা পাওয়া যায়নি। "
    "প্রশ্নটি আরও নির্দিষ্টভাবে লিখুন অথবা একজন আইনজীবীর সাথে পরামর্শ করুন।"
)
NO_MATCH_EN = (
    "Sorry, no section in our curated statutes directly matches this question. "
    "Try rephrasing it more specifically, or consult an advocate."
)


@dataclass
class Answer:
    body_bn: str
    body_en: str
    model_name: str


def _section_label(r: RetrievedSection) -> tuple[str, str]:
    bn, _, en = r.section.section_number.partition(" / ")
    return f"{r.act.title_bn} · {bn}", f"{r.act.title_en} · {en or bn}"


def _extractive(question: str, sections: list[RetrievedSection]) -> Answer:
    if not sections:
        return Answer(NO_MATCH_BN, NO_MATCH_EN, EXTRACTIVE_MODEL)
    parts_bn = ["আপনার প্রশ্নের সাথে সম্পর্কিত আইনি বিধানগুলো নিচে দেওয়া হলো।"]
    parts_en = ["Here are the legal provisions relevant to your question."]
    for i, r in enumerate(sections, start=1):
        label_bn, label_en = _section_label(r)
        s = r.section
        parts_bn.append(f"### {i}. {s.heading_bn or label_bn}\n**{label_bn}** — {s.plain_meaning_bn or s.body_bn or ''}")
        parts_en.append(f"### {i}. {s.heading_en or label_en}\n**{label_en}** — {s.plain_meaning_en or s.body_en or ''}")
    parts_bn.append(DISCLAIMER_BN)
    parts_en.append(DISCLAIMER_EN)
    return Answer("\n\n".join(parts_bn), "\n\n".join(parts_en), EXTRACTIVE_MODEL)


_PROMPT = """You are a legal-information assistant for citizens of Bangladesh.
Answer the question using ONLY the statute sections below. Cite sections by
their label in bold (e.g. **Section 18**). Use short markdown headings and end
with one practical next step. If the sections do not answer the question, say so.
Do not give legal advice; give legal information.

Respond as JSON: {{"bodyBn": "<answer in Bangla>", "bodyEn": "<same answer in English>"}}

Question: {question}

Sections:
{context}
"""


def _gemini_sync(question: str, sections: list[RetrievedSection]) -> Answer:
    import google.generativeai as genai

    genai.configure(api_key=settings.gemini_api_key)
    context = "\n\n".join(
        f"[{_section_label(r)[1]}]\n{r.section.body_en or ''}\n{r.section.body_bn or ''}" for r in sections
    )
    model = genai.GenerativeModel(settings.gemini_model)
    response = model.generate_content(
        _PROMPT.format(question=question, context=context),
        generation_config={"response_mime_type": "application/json", "temperature": 0.2},
    )
    data = json.loads(response.text)
    return Answer(
        f"{data['bodyBn']}\n\n{DISCLAIMER_BN}", f"{data['bodyEn']}\n\n{DISCLAIMER_EN}", settings.gemini_model
    )


async def compose_answer(question: str, sections: list[RetrievedSection]) -> Answer:
    if settings.gemini_api_key and sections:
        try:
            return await asyncio.to_thread(_gemini_sync, question, sections)
        except Exception:
            logger.exception("gemini_answer_failed_falling_back")
    return _extractive(question, sections)
