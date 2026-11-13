"""`/verifications` — citizens request, admins assign or decline, lawyers issue verdicts.
What `GET` returns depends on the caller's role (own / assigned / all)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, require_roles, require_approved_lawyer
from app.database import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.verifications import (
    AssignVerificationRequest,
    CreateVerificationRequest,
    DeclineRequest,
    SubmitVerdictRequest,
    VerdictOut,
    VerificationOut,
)
from app.services import verification_service

router = APIRouter()


@router.get("", response_model=list[VerificationOut])
async def list_requests(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[VerificationOut]:
    return await verification_service.list_requests(db, user)


@router.post("", response_model=VerificationOut, status_code=status.HTTP_201_CREATED)
async def create_request(
    payload: CreateVerificationRequest,
    user: User = Depends(require_roles(UserRole.CITIZEN)), db: AsyncSession = Depends(get_db),
) -> VerificationOut:
    return await verification_service.create_request(db, user, payload)


@router.get("/{request_id}", response_model=VerificationOut)
async def get_request(
    request_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> VerificationOut:
    return await verification_service.get_request(db, user, request_id)


@router.post("/{request_id}/assign", response_model=VerificationOut)
async def assign(
    request_id: str, payload: AssignVerificationRequest,
    user: User = Depends(require_roles(UserRole.ADMIN)), db: AsyncSession = Depends(get_db),
) -> VerificationOut:
    return await verification_service.assign(db, user, request_id, payload.lawyer_id)


@router.post("/{request_id}/decline", response_model=VerificationOut)
async def decline(
    request_id: str, payload: DeclineRequest,
    user: User = Depends(require_roles(UserRole.ADMIN)), db: AsyncSession = Depends(get_db),
) -> VerificationOut:
    return await verification_service.decline(db, user, request_id, payload.reason)


@router.post("/{request_id}/verdict", response_model=VerdictOut)
async def submit_verdict(
    request_id: str, payload: SubmitVerdictRequest,
    user: User = Depends(require_approved_lawyer), db: AsyncSession = Depends(get_db),
) -> VerdictOut:
    return await verification_service.submit_verdict(db, user, request_id, payload)
