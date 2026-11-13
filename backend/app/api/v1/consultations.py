"""`/consultations` — citizens book and review; lawyers accept, decline and complete.
`GET` is scoped to the caller (own / theirs / all for admins)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, require_roles, require_approved_lawyer
from app.database import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.common import OkResponse
from app.schemas.consultations import (
    AcceptConsultationRequest,
    CompleteConsultationRequest,
    ConsultationOut,
    CreateConsultationRequest,
    DeclineConsultationRequest,
    ReviewRequest,
    UpdateConsultationRequest,
)
from app.services import consultation_service

router = APIRouter()
citizen_only = require_roles(UserRole.CITIZEN)
lawyer_only = require_approved_lawyer


@router.get("", response_model=list[ConsultationOut])
async def list_consultations(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[ConsultationOut]:
    return await consultation_service.list_consultations(db, user)


@router.post("", response_model=ConsultationOut, status_code=status.HTTP_201_CREATED)
async def create(
    payload: CreateConsultationRequest, user: User = Depends(citizen_only), db: AsyncSession = Depends(get_db)
) -> ConsultationOut:
    return await consultation_service.create(db, user, payload)


@router.get("/{consultation_id}", response_model=ConsultationOut)
async def get_consultation(
    consultation_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> ConsultationOut:
    return await consultation_service.get_consultation(db, user, consultation_id)


@router.patch("/{consultation_id}", response_model=ConsultationOut)
async def update_details(
    consultation_id: str, payload: UpdateConsultationRequest,
    user: User = Depends(citizen_only), db: AsyncSession = Depends(get_db),
) -> ConsultationOut:
    return await consultation_service.update_details(db, user, consultation_id, payload.topic, payload.description)


@router.post("/{consultation_id}/accept", response_model=ConsultationOut)
async def accept(
    consultation_id: str, payload: AcceptConsultationRequest,
    user: User = Depends(lawyer_only), db: AsyncSession = Depends(get_db),
) -> ConsultationOut:
    return await consultation_service.accept(db, user, consultation_id, payload.slot)


@router.post("/{consultation_id}/decline", response_model=ConsultationOut)
async def decline(
    consultation_id: str, payload: DeclineConsultationRequest,
    user: User = Depends(lawyer_only), db: AsyncSession = Depends(get_db),
) -> ConsultationOut:
    return await consultation_service.decline(db, user, consultation_id, payload.reason)


@router.post("/{consultation_id}/complete", response_model=ConsultationOut)
async def complete(
    consultation_id: str, payload: CompleteConsultationRequest,
    user: User = Depends(lawyer_only), db: AsyncSession = Depends(get_db),
) -> ConsultationOut:
    return await consultation_service.complete(db, user, consultation_id, payload.private_notes)


@router.post("/{consultation_id}/review", response_model=OkResponse)
async def review(
    consultation_id: str, payload: ReviewRequest,
    user: User = Depends(citizen_only), db: AsyncSession = Depends(get_db),
) -> OkResponse:
    await consultation_service.review(db, user, consultation_id, payload.rating, payload.text)
    return OkResponse()
