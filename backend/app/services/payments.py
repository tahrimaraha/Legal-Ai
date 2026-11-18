"""Manual mobile-wallet / bank payments (bKash, Nagad, Rocket, bank transfer).

Who gets paid:
  * consultation fee  -> the lawyer's own receiving accounts (set by the lawyer; the lawyer confirms)
  * verification fee  -> the platform's receiving accounts (set by an admin; an admin confirms)

The client sends money outside the app, then submits the number they paid from and the transaction ID.
That payment is stored on the consultation / verification record as ``data["payment"]`` with status
``submitted`` → ``confirmed`` | ``rejected``. A transaction ID can be used only once.
"""
from __future__ import annotations

import re
import uuid
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, ValidationAppError
from app.models.app_record import AppRecord
from app.services import records

Method = Literal["bkash", "nagad", "rocket", "bank"]
METHOD_LABEL = {"bkash": "bKash", "nagad": "Nagad", "rocket": "Rocket", "bank": "Bank transfer"}
MOBILE_RE = re.compile(r"^01[3-9]\d{8}$")
ROCKET_RE = re.compile(r"^01[3-9]\d{8}\d?$")  # Rocket accounts are the mobile number + an optional check digit
TRX_RE = re.compile(r"^[A-Z0-9-]{6,30}$")


def _digits(v: str) -> str:
    v = (v or "").strip().translate(str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789"))
    v = re.sub(r"[\s-]", "", v)
    return v[3:] if v.startswith("+88") else (v[2:] if v.startswith("88") and len(v) > 11 else v)


class BankAccount(BaseModel):
    bankName: str = Field(min_length=2, max_length=120)
    accountName: str = Field(min_length=2, max_length=120)
    accountNumber: str = Field(min_length=4, max_length=40)
    branch: str = Field(default="", max_length=120)
    routingNumber: str = Field(default="", max_length=20)


class PaymentAccounts(BaseModel):
    bkash: Optional[str] = None
    nagad: Optional[str] = None
    rocket: Optional[str] = None
    bank: Optional[BankAccount] = None

    @field_validator("bkash", "nagad")
    @classmethod
    def _wallet(cls, v: Optional[str]) -> Optional[str]:
        if v is None or not v.strip():
            return None
        d = _digits(v)
        if not MOBILE_RE.match(d):
            raise ValueError("Enter an 11-digit mobile number like 017XXXXXXXX.")
        return d

    @field_validator("rocket")
    @classmethod
    def _rocket(cls, v: Optional[str]) -> Optional[str]:
        if v is None or not v.strip():
            return None
        d = _digits(v)
        if not ROCKET_RE.match(d):
            raise ValueError("Enter the Rocket account number (11 or 12 digits).")
        return d


class PaymentIn(BaseModel):
    method: Method
    senderAccount: str = Field(min_length=3, max_length=60)
    trxId: str = Field(min_length=6, max_length=30)

    @field_validator("trxId")
    @classmethod
    def _trx(cls, v: str) -> str:
        v = v.strip().upper()
        if not TRX_RE.match(v):
            raise ValueError("Transaction ID: 6–30 letters or numbers.")
        return v


class PaymentReviewIn(BaseModel):
    action: Literal["confirm", "reject"]
    note: str = Field(default="", max_length=1000)


def methods(accounts: dict) -> list[str]:
    return [m for m in ("bkash", "nagad", "rocket", "bank") if accounts.get(m)]


async def lawyer_accounts(db: AsyncSession, lawyer_id: uuid.UUID) -> dict:
    extra = await db.scalar(select(AppRecord.data).where(AppRecord.kind == "lawyer_extra", AppRecord.lawyer_id == lawyer_id))
    return dict((extra or {}).get("paymentAccounts") or {})


async def save_lawyer_accounts(db: AsyncSession, lawyer_id: uuid.UUID, accounts: PaymentAccounts) -> dict:
    data = accounts.model_dump(exclude_none=True)
    rec = await db.scalar(select(AppRecord).where(AppRecord.kind == "lawyer_extra", AppRecord.lawyer_id == lawyer_id))
    if rec is None:
        await records.create(db, "lawyer_extra", {"paymentAccounts": data}, lawyer_id=lawyer_id)
    else:
        records.save(rec, {**rec.data, "paymentAccounts": data})
    return data


async def _platform_record(db: AsyncSession) -> Optional[AppRecord]:
    return await db.scalar(select(AppRecord).where(AppRecord.kind == "platform_settings").order_by(AppRecord.created_at))


async def platform_accounts(db: AsyncSession) -> dict:
    rec = await _platform_record(db)
    return dict((rec.data if rec else {}).get("paymentAccounts") or {})


async def save_platform_accounts(db: AsyncSession, accounts: PaymentAccounts) -> dict:
    data = accounts.model_dump(exclude_none=True)
    rec = await _platform_record(db)
    if rec is None:
        await records.create(db, "platform_settings", {"paymentAccounts": data})
    else:
        records.save(rec, {**rec.data, "paymentAccounts": data})
    return data


async def ensure_unused_trx(db: AsyncSession, trx_id: str, exclude: Optional[uuid.UUID] = None) -> None:
    q = select(AppRecord.id).where(
        AppRecord.kind.in_(["consultation", "verification"]),
        AppRecord.data["payment"]["trxId"].astext == trx_id,
        AppRecord.data["payment"]["status"].astext != "rejected",
    )
    if exclude is not None:
        q = q.where(AppRecord.id != exclude)
    if await db.scalar(q.limit(1)):
        raise ConflictError("This transaction ID has already been used for another payment.",
                            "এই লেনদেন আইডি আগেই অন্য একটি পেমেন্টে ব্যবহার করা হয়েছে।")


async def build_payment(db: AsyncSession, payload: PaymentIn, accounts: dict, payee_name: str, amount: float,
                        exclude: Optional[uuid.UUID] = None) -> dict:
    if payload.method not in methods(accounts):
        raise ValidationAppError(f"{METHOD_LABEL[payload.method]} is not available for this payment.",
                                 "এই পেমেন্ট পদ্ধতিটি এখানে নেই।")
    sender = payload.senderAccount.strip()
    if payload.method in ("bkash", "nagad"):
        sender = _digits(sender)
        if not MOBILE_RE.match(sender):
            raise ValidationAppError("Enter the 11-digit number you paid from (01XXXXXXXXX).",
                                     "যে নম্বর থেকে টাকা পাঠিয়েছেন সেটি ১১ সংখ্যায় লিখুন (01XXXXXXXXX)।")
    elif payload.method == "rocket":
        sender = _digits(sender)
        if not ROCKET_RE.match(sender):
            raise ValidationAppError("Enter the Rocket account you paid from.", "যে রকেট একাউন্ট থেকে পাঠিয়েছেন সেটি লিখুন।")
    await ensure_unused_trx(db, payload.trxId, exclude)
    return {
        "method": payload.method,
        "methodLabel": METHOD_LABEL[payload.method],
        "payeeName": payee_name,
        "payTo": accounts[payload.method],
        "amount": amount,
        "senderAccount": sender,
        "trxId": payload.trxId,
        "status": "submitted",
        "submittedAt": records.now_iso(),
    }


def review(payment: dict, body: PaymentReviewIn, reviewer: str) -> dict:
    if not payment:
        raise ValidationAppError("No payment has been submitted yet.", "এখনো কোনো পেমেন্ট জমা দেওয়া হয়নি।")
    return {**payment, "status": "confirmed" if body.action == "confirm" else "rejected",
            "reviewedAt": records.now_iso(), "reviewedBy": reviewer, "reviewNote": body.note.strip()}
