"""Schemas for manual mobile-wallet payments (citizen sends money, then submits the TrxID)."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import Field, field_validator

from app.schemas.common import CamelModel

WalletMethod = Literal["bkash", "nagad", "rocket"]


class ManualPaymentIn(CamelModel):
    method: WalletMethod
    # Bangladeshi mobile number the money was sent from, e.g. 01712345678.
    payer_number: str = Field(pattern=r"^01[3-9]\d{8}$")
    # Wallet transaction ID from the confirmation SMS (bKash 10, Nagad 8, Rocket 10 chars).
    trx_id: str = Field(min_length=6, max_length=20, pattern=r"^[A-Za-z0-9]+$")

    @field_validator("payer_number", "trx_id", mode="before")
    @classmethod
    def _strip(cls, v: object) -> object:
        return v.strip().replace(" ", "").replace("-", "") if isinstance(v, str) else v

    @field_validator("trx_id")
    @classmethod
    def _upper(cls, v: str) -> str:
        return v.upper()


class PaymentMethodOut(CamelModel):
    id: WalletMethod
    name: str
    # The platform's wallet number the citizen sends money to.
    receiver_number: str


class AdminPaymentOut(CamelModel):
    id: str
    purpose: Literal["verification", "consultation", "document"]
    reference_id: str
    payer_id: str
    payer_name: str
    amount_bdt: float
    method: str
    payer_number: Optional[str]
    trx_id: Optional[str]
    status: Literal["pending", "confirmed", "rejected"]
    created_at: str
