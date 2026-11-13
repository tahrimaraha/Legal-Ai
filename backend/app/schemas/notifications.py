"""Schemas for `/notifications` (frontend `AppNotification`)."""
from __future__ import annotations

from app.schemas.common import CamelModel


class NotificationOut(CamelModel):
    id: str
    user_id: str
    type: str
    title_bn: str
    title_en: str
    body_bn: str
    body_en: str
    link: str
    is_read: bool
    created_at: str
