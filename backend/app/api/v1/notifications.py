"""`/notifications` — the signed-in user's in-app notifications."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.common import OkResponse
from app.schemas.notifications import NotificationOut
from app.services import notification_service

router = APIRouter()


@router.get("", response_model=list[NotificationOut])
async def list_notifications(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> list[NotificationOut]:
    return await notification_service.list_notifications(db, user)


@router.post("/read", response_model=OkResponse)
async def mark_all_read(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> OkResponse:
    await notification_service.mark_all_read(db, user)
    return OkResponse()
