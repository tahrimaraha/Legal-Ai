"""Statute corpus ingestion: store an uploaded PDF, extract its text and split
it into `chunks` rows. Embedding the chunks is a later step; retrieval still
runs over curated sections (see app/rag/retrieval.py)."""
from __future__ import annotations

import io
import re
from datetime import datetime, timezone

from pypdf import PdfReader
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import ValidationAppError
from app.models.corpus import Act, Chunk, CorpusDocument
from app.models.enums import IngestStatus
from app.models.user import User
from app.providers.storage import local_path, save_bytes
from app.schemas.admin import CorpusDocumentOut, ReindexResponse
from app.services.chat_service import detect_language
from app.services.content_service import get_act_by_slug
from app.services.mappers import corpus_status, iso

CHUNK_CHARS = 1200


def _out(doc: CorpusDocument, act: Act) -> CorpusDocumentOut:
    return CorpusDocumentOut(
        id=str(doc.id), file_name=doc.filename, statute_id=act.slug or str(act.id),
        statute_title_bn=act.title_bn, statute_title_en=act.title_en, chunks=doc.chunk_count,
        status=corpus_status(doc.ingest_status), file_size_mb=round(doc.size_bytes / (1024 * 1024), 2),
        last_indexed=iso(doc.indexed_at or doc.updated_at), error=doc.error_message,
    )


async def list_documents(db: AsyncSession) -> list[CorpusDocumentOut]:
    rows = await db.execute(
        select(CorpusDocument, Act).join(Act, Act.id == CorpusDocument.act_id).order_by(CorpusDocument.created_at.desc())
    )
    return [_out(d, a) for d, a in rows]


def split_text(text: str, size: int = CHUNK_CHARS) -> list[str]:
    """Greedy paragraph packing, hard-splitting paragraphs longer than `size`."""
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks, current = [], ""
    for p in paragraphs:
        while len(p) > size:
            chunks.append(p[:size])
            p = p[size:]
        if current and len(current) + len(p) + 2 > size:
            chunks.append(current)
            current = p
        else:
            current = f"{current}\n\n{p}" if current else p
    if current:
        chunks.append(current)
    return chunks


async def _ingest(db: AsyncSession, doc: CorpusDocument, data: bytes) -> None:
    await db.execute(delete(Chunk).where(Chunk.document_id == doc.id))
    try:
        reader = PdfReader(io.BytesIO(data))
        pages = [page.extract_text() or "" for page in reader.pages]
    except Exception as exc:  # pypdf raises a variety of parse errors
        doc.ingest_status, doc.error_message, doc.chunk_count = IngestStatus.FAILED, f"Could not read PDF: {exc}", 0
        return
    doc.page_count = len(pages)
    index = 0
    for page_no, page_text in enumerate(pages, start=1):
        for content in split_text(page_text):
            db.add(Chunk(
                document_id=doc.id, act_id=doc.act_id, chunk_index=index, content=content,
                token_count=len(content.split()), language=detect_language(content),
                chunk_metadata={"page": page_no},
            ))
            index += 1
    if index == 0:
        doc.ingest_status, doc.error_message = IngestStatus.FAILED, "No extractable text (scanned PDF?)"
    else:
        doc.ingest_status, doc.error_message = IngestStatus.READY, None
    doc.chunk_count = index
    doc.indexed_at = datetime.now(timezone.utc)


async def upload(db: AsyncSession, admin: User, statute_slug: str, filename: str, content_type: str, data: bytes) -> CorpusDocumentOut:
    if content_type != "application/pdf" and not filename.lower().endswith(".pdf"):
        raise ValidationAppError("Only PDF files can be ingested.", "শুধু পিডিএফ ফাইল আপলোড করা যাবে।")
    if len(data) > settings.max_upload_size_mb * 1024 * 1024:
        raise ValidationAppError(
            f"File is larger than {settings.max_upload_size_mb} MB.", f"ফাইলটি {settings.max_upload_size_mb} MB এর বেশি।"
        )
    act = await get_act_by_slug(db, statute_slug)
    doc = CorpusDocument(
        act_id=act.id, uploaded_by=admin.id, filename=filename, size_bytes=len(data),
        file_url=save_bytes("corpus", filename, data), ingest_status=IngestStatus.PARSING,
    )
    db.add(doc)
    await db.flush()
    await _ingest(db, doc, data)
    await db.commit()
    await db.refresh(doc)
    return _out(doc, act)


async def reindex(db: AsyncSession) -> ReindexResponse:
    docs = (await db.scalars(select(CorpusDocument))).all()
    done = chunks = skipped = 0
    for doc in docs:
        path = local_path(doc.file_url)
        if path is None:
            skipped += 1
            continue
        await _ingest(db, doc, path.read_bytes())
        done += 1
        chunks += doc.chunk_count
    await db.commit()
    message = f"Re-indexed {done} uploaded document(s) into {chunks} text chunks."
    if skipped:
        message += f" {skipped} record(s) without a stored PDF were left unchanged."
    return ReindexResponse(ok=True, message=message)
