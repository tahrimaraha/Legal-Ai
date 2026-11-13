"""`/statutes` and `/glossary` — public, read-only reference content."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.content import GlossaryTermOut, StatuteOut
from app.services import content_service

router = APIRouter()


@router.get("/statutes", response_model=list[StatuteOut])
async def list_statutes(db: AsyncSession = Depends(get_db)) -> list[StatuteOut]:
    return await content_service.list_statutes(db)


@router.get("/statutes/{slug}", response_model=StatuteOut)
async def get_statute(slug: str, db: AsyncSession = Depends(get_db)) -> StatuteOut:
    return await content_service.get_statute(db, slug)


@router.get("/glossary", response_model=list[GlossaryTermOut])
async def search_glossary(q: Optional[str] = None, db: AsyncSession = Depends(get_db)) -> list[GlossaryTermOut]:
    return await content_service.search_glossary(db, q)
