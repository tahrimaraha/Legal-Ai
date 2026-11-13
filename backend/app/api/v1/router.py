"""Aggregates all `/api/v1` routers.

Each domain router is added here as it is implemented in later delivery
blocks (see project README, "Delivery order"). Keeping the aggregation in
one place means `main.py` never needs to change as routers are added.
"""
from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import (
    admin,
    auth,
    chat,
    consultations,
    content,
    documents,
    lawyers,
    messaging,
    notifications,
    payments,
    verifications,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(content.router, tags=["statutes"])
api_router.include_router(chat.router, tags=["chat"])
api_router.include_router(lawyers.router, prefix="/lawyers", tags=["lawyers"])
api_router.include_router(verifications.router, prefix="/verifications", tags=["verifications"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(consultations.router, prefix="/consultations", tags=["consultations"])
api_router.include_router(messaging.router, tags=["messaging"])
api_router.include_router(documents.router, tags=["documents"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
