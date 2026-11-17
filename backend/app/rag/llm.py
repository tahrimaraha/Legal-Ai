"""Optional Gemini rewrite of the answer text. Retrieval, citations and the safety notes never depend on it.

Enabled only when GEMINI_API_KEY is set. Uses the public REST endpoint through httpx (no extra SDK needed).
Any failure returns None and the caller keeps the offline, extractive answer.
"""
from __future__ import annotations

import json
import re
from typing import Optional

import httpx

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)
URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

SYSTEM = (
    "You are a careful legal-information assistant for ordinary citizens of Bangladesh. "
    "Answer ONLY from the numbered statute sections provided; never invent sections, penalties or numbers. "
    "If the sections do not answer the question, say so. Write short plain-language paragraphs separated by a blank "
    "line, with NO markdown symbols (no asterisks, no #). Refer to sources as (Source 1), (Source 2). "
    "End with one sentence saying this is legal information, not legal advice, and to consult a lawyer. "
    "Return JSON: {\"bodyEn\": \"...\", \"bodyBn\": \"...\"} with the same content in English and in natural Bengali."
)


def _clean(s: str) -> str:
    s = re.sub(r"[*#`_]{1,3}", "", s or "")
    return re.sub(r"\n{3,}", "\n\n", s).strip()


async def rewrite(question: str, cites: list[dict], steps_en: list[str], history: list[dict]) -> Optional[tuple[str, str]]:
    if not settings.gemini_api_key or not cites:
        return None
    sources = "\n\n".join(
        f"Source {i}: {c['labelEn']}\nBengali/official text: {c['textBn']}\nEnglish text: {c['textEn']}"
        for i, c in enumerate(cites, 1)
    )
    ctx = "\n".join(f"{m['role']}: {m['text']}" for m in history[-4:])
    prompt = f"Conversation so far:\n{ctx}\n\nQuestion: {question}\n\nSections:\n{sources}\n\nGeneral next steps you may mention: {' | '.join(steps_en)}"
    body = {
        "systemInstruction": {"parts": [{"text": SYSTEM}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"},
    }
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            r = await client.post(URL.format(model=settings.gemini_model), params={"key": settings.gemini_api_key}, json=body)
            r.raise_for_status()
        text = r.json()["candidates"][0]["content"]["parts"][0]["text"]
        data = json.loads(re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip())
        en, bn = _clean(data["bodyEn"]), _clean(data["bodyBn"])
        return (en, bn) if en and bn else None
    except Exception as exc:  # network, quota, bad JSON ... -> fall back to the offline answer
        logger.warning("gemini_rewrite_failed", error=str(exc)[:200])
        return None
