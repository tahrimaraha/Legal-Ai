"""Aggregates all `/api/v1` routers.

Each domain router is added here as it is implemented in later delivery
blocks (see project README, "Delivery order"). Keeping the aggregation in
one place means `main.py` never needs to change as routers are added.
"""
from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import admin, auth, chat, consultations, conversations, lawyers, meeting_signal, messaging, payments, user_data, verifications

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

api_router.include_router(chat.router, tags=["ai"])
api_router.include_router(conversations.router, tags=["conversations"])
api_router.include_router(lawyers.router, tags=["lawyers"])
api_router.include_router(verifications.router, tags=["verifications"])
api_router.include_router(consultations.router, tags=["consultations"])
api_router.include_router(meeting_signal.router, tags=["meetings"])
api_router.include_router(messaging.router, tags=["messaging"])
api_router.include_router(user_data.router, tags=["documents", "notifications"])
api_router.include_router(payments.router, tags=["payments"])
api_router.include_router(admin.router, tags=["admin"])

# Further routers are registered here as they are implemented.
