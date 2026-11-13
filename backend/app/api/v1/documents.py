"""`/draft/templates` (public) and `/documents` (the citizen's own drafts)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import require_roles
from app.database import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.documents import CreateDocumentRequest, DraftDocumentOut, DraftTemplateOut
from app.services import document_service

router = APIRouter()
citizen_only = require_roles(UserRole.CITIZEN)


@router.get("/draft/templates", response_model=list[DraftTemplateOut])
async def list_templates(db: AsyncSession = Depends(get_db)) -> list[DraftTemplateOut]:
    return await document_service.list_templates(db)


@router.get("/draft/templates/{slug}", response_model=DraftTemplateOut)
async def get_template(slug: str, db: AsyncSession = Depends(get_db)) -> DraftTemplateOut:
    return await document_service.get_template(db, slug)


@router.get("/documents", response_model=list[DraftDocumentOut])
async def list_documents(user: User = Depends(citizen_only), db: AsyncSession = Depends(get_db)) -> list[DraftDocumentOut]:
    return await document_service.list_documents(db, user)


@router.post("/documents", response_model=DraftDocumentOut, status_code=status.HTTP_201_CREATED)
async def create_document(
    payload: CreateDocumentRequest, user: User = Depends(citizen_only), db: AsyncSession = Depends(get_db)
) -> DraftDocumentOut:
    return await document_service.create_document(db, user, payload.template_id, payload.title, payload.answers)


@router.get("/documents/{document_id}", response_model=DraftDocumentOut)
async def get_document(
    document_id: str, user: User = Depends(citizen_only), db: AsyncSession = Depends(get_db)
) -> DraftDocumentOut:
    return await document_service.get_document(db, user, document_id)
