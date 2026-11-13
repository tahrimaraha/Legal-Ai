"""Schemas for lawyer earnings and manual wallet payouts."""
from __future__ import annotations

from typing import Literal, Optional

from pydantic import Field, field_validator

from app.schemas.common import CamelModel
from app.schemas.payments import WalletMethod

ItemType = Literal["verification", "consultation"]
CitizenPaymentStatus = Literal["confirmed", "pending", "rejected", "none"]


class PayoutAccountIn(CamelModel):
    method: WalletMethod
    number: str = Field(pattern=r"^01[3-9]\d{8}$")

    @field_validator("number", mode="before")
    @classmethod
    def _strip(cls, v: object) -> object:
        return v.strip().replace(" ", "").replace("-", "") if isinstance(v, str) else v


class PayoutAccountOut(CamelModel):
    method: Optional[WalletMethod] = None
    number: Optional[str] = None


class EarningItemOut(CamelModel):
    # Verification: the assignment id. Consultation: the consultation id.
    id: str
    type: ItemType
    # The verification request / consultation it belongs to, for linking.
    reference_id: str
    title: str
    citizen_name: str
    completed_at: Optional[str]
    fee_bdt: float
    lawyer_share_bdt: float
    citizen_payment_status: CitizenPaymentStatus
    paid: bool
    payout_id: Optional[str] = None


class PayoutOut(CamelModel):
    id: str
    lawyer_id: str
    lawyer_name: str
    amount_bdt: float
    method: Optional[WalletMethod]
    receiver_number: Optional[str]
    trx_id: Optional[str]
    item_count: int
    paid_by_name: Optional[str]
    paid_at: Optional[str]
    note: Optional[str] = None


class LawyerLedgerOut(CamelModel):
    lawyer_id: str
    lawyer_name: str
    payout_account: PayoutAccountOut
    owed_bdt: float
    paid_bdt: float
    items: list[EarningItemOut]


class FinanceSummaryOut(CamelModel):
    citizen_confirmed_bdt: float
    citizen_pending_bdt: float
    citizen_pending_count: int
    lawyer_earned_bdt: float
    lawyer_owed_bdt: float
    lawyer_paid_bdt: float
    # Confirmed citizen money minus everything earned by lawyers.
    platform_net_bdt: float
    verification_share_percent: int
    consultation_share_percent: int


class FinanceOverviewOut(CamelModel):
    summary: FinanceSummaryOut
    lawyers: list[LawyerLedgerOut]
    payouts: list[PayoutOut]


class PayLawyerRequest(CamelModel):
    lawyer_id: str
    trx_id: str = Field(min_length=6, max_length=20, pattern=r"^[A-Za-z0-9]+$")
    # Earning item ids to settle; omitted = everything currently owed.
    item_ids: Optional[list[str]] = None
    note: Optional[str] = Field(default=None, max_length=500)

    @field_validator("trx_id", mode="before")
    @classmethod
    def _clean(cls, v: object) -> object:
        return v.strip().replace(" ", "").upper() if isinstance(v, str) else v


class MyEarningsOut(CamelModel):
    payout_account: PayoutAccountOut
    owed_bdt: float
    paid_bdt: float
    items: list[EarningItemOut]
    payouts: list[PayoutOut]
