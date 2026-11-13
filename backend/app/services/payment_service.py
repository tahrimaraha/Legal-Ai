"""Manual wallet payments: the citizen sends money with bKash/Nagad/Rocket "Send
Money" and submits the TrxID; an admin checks it against the wallet statement."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import ConflictError, IllegalStateTransitionError, NotFoundError
from app.models.enums import PaymentMethod, PaymentPurpose, PaymentStatus
from app.models.payment import Payment
from app.models.user import User
from app.schemas.payments import AdminPaymentOut, ManualPaymentIn, PaymentMethodOut
from app.services.mappers import as_uuid, iso

_METHOD_TO_DB = {"bkash": PaymentMethod.BKASH, "nagad": PaymentMethod.NAGAD, "rocket": PaymentMethod.ROCKET}
_METHOD_NAMES = {"bkash": "bKash", "nagad": "Nagad", "rocket": "Rocket"}
_PURPOSE_OUT = {
    PaymentPurpose.VERIFICATION_FEE: "verification",
    PaymentPurpose.CONSULTATION_FEE: "consultation",
    PaymentPurpose.DOCUMENT_FEE: "document",
}
_STATUS_OUT = {PaymentStatus.PENDING: "pending", PaymentStatus.SUCCESS: "confirmed", PaymentStatus.FAILED: "rejected"}


def _receiver_numbers() -> dict[str, str]:
    return {
        "bkash": settings.manual_payment_bkash_number,
        "nagad": settings.manual_payment_nagad_number,
        "rocket": settings.manual_payment_rocket_number,
    }


def list_methods() -> list[PaymentMethodOut]:
    """Only wallets with a configured receiving number are offered."""
    return [
        PaymentMethodOut(id=m, name=_METHOD_NAMES[m], receiver_number=n.strip())
        for m, n in _receiver_numbers().items()
        if n.strip()
    ]


async def ensure_payment_usable(db: AsyncSession, data: ManualPaymentIn) -> None:
    """Call before creating the paid-for request, so a bad TrxID leaves nothing behind."""
    if not _receiver_numbers()[data.method].strip():
        raise ConflictError(
            f"{_METHOD_NAMES[data.method]} payments are not available right now.",
            f"এই মুহূর্তে {_METHOD_NAMES[data.method]} পেমেন্ট গ্রহণ করা হচ্ছে না।",
            code="PAYMENT_METHOD_UNAVAILABLE",
        )
    used = await db.scalar(select(Payment.id).where(
        Payment.method == _METHOD_TO_DB[data.method],
        Payment.provider_txn_id == data.trx_id,
        Payment.status != PaymentStatus.FAILED,
    ))
    if used is not None:
        raise ConflictError(
            "This transaction ID has already been used. Please check it and try again.",
            "এই ট্রানজেকশন আইডি আগেই ব্যবহার করা হয়েছে। অনুগ্রহ করে যাচাই করে আবার চেষ্টা করুন।",
            code="TRX_ID_ALREADY_USED",
        )


def add_manual_payment(
    db: AsyncSession, payer: User, purpose: PaymentPurpose, reference_type: str,
    reference_id: uuid.UUID, amount: Decimal, data: ManualPaymentIn,
) -> Payment:
    """Adds a PENDING payment to the session; the caller commits with its request."""
    payment = Payment(
        payer_id=payer.id,
        purpose=purpose,
        reference_type=reference_type,
        reference_id=reference_id,
        amount=amount,
        currency="BDT",
        method=_METHOD_TO_DB[data.method],
        provider_txn_id=data.trx_id,
        payer_msisdn_masked=data.payer_number,
        status=PaymentStatus.PENDING,
        idempotency_key=f"manual:{reference_type}:{reference_id}",
        raw_payload={
            "kind": "manual_send_money",
            "payerNumber": data.payer_number,
            "receiverNumber": _receiver_numbers()[data.method].strip(),
        },
    )
    db.add(payment)
    return payment


async def list_admin_payments(db: AsyncSession) -> list[AdminPaymentOut]:
    payments = (await db.scalars(select(Payment).order_by(Payment.created_at.desc()))).all()
    payer_ids = {p.payer_id for p in payments}
    names = {u.id: u.full_name for u in (await db.scalars(select(User).where(User.id.in_(payer_ids)))).all()} if payer_ids else {}
    return [
        AdminPaymentOut(
            id=str(p.id),
            purpose=_PURPOSE_OUT[p.purpose],
            reference_id=str(p.reference_id),
            payer_id=str(p.payer_id),
            payer_name=names.get(p.payer_id, ""),
            amount_bdt=float(p.amount),
            method=p.method.value.lower(),
            payer_number=p.payer_msisdn_masked,
            trx_id=p.provider_txn_id,
            status=_STATUS_OUT.get(p.status, "pending"),
            created_at=iso(p.created_at),
        )
        for p in payments
    ]


async def set_status(db: AsyncSession, payment_id: str, confirmed: bool) -> None:
    payment = await db.get(Payment, as_uuid(payment_id, "Payment"))
    if payment is None:
        raise NotFoundError("Payment not found.", "পেমেন্ট পাওয়া যায়নি।")
    if payment.status != PaymentStatus.PENDING:
        raise IllegalStateTransitionError("This payment has already been reviewed.", "এই পেমেন্টটি আগেই পর্যালোচনা করা হয়েছে।")
    now = datetime.now(timezone.utc)
    payment.verified_at = now
    if confirmed:
        payment.status = PaymentStatus.SUCCESS
        payment.paid_at = now
    else:
        payment.status = PaymentStatus.FAILED
    await db.commit()
