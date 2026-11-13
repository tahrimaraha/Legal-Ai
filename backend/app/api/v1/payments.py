"""`/payments/*` — what wallets citizens can pay with, and where to send money."""
from __future__ import annotations

from fastapi import APIRouter

from app.schemas.payments import PaymentMethodOut
from app.services import payment_service

router = APIRouter()


@router.get("/methods", response_model=list[PaymentMethodOut])
async def list_methods() -> list[PaymentMethodOut]:
    return payment_service.list_methods()
