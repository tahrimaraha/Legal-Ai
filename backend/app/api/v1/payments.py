"""`/payments/*` — manual bKash / Nagad / Rocket / bank payments (see app/services/payments.py).

* Lawyers set where clients pay consultation fees; admins set where clients pay verification fees.
* Clients see those accounts only when signed in, then submit the number they paid from + transaction ID.
* The payee confirms or rejects: the lawyer for a consultation, an admin for a verification.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, ValidationAppError
from app.core.security import get_current_user, require_roles
from app.database import get_db
from app.models.enums import UserRole
from app.models.profile import LawyerProfile
from app.models.user import User
from app.services import payments, records
from app.services.lawyer_directory import load_lawyer

router = APIRouter()
PLATFORM_NAME = "LEGAL AI"


# --- Receiving accounts -----------------------------------------------------------------------------

@router.get("/payments/lawyers/{lawyer_id}/accounts")
async def lawyer_payment_accounts(lawyer_id: str, _: User = Depends(get_current_user),
                                  db: AsyncSession = Depends(get_db)) -> dict:
    uid = records.parse_uuid(lawyer_id)
    lawyer = await load_lawyer(db, uid) if uid and await db.get(LawyerProfile, uid) else None
    if lawyer is None:
        raise records.not_found("Lawyer")
    accounts = await payments.lawyer_accounts(db, uid)
    return {"payeeName": lawyer["fullName"], "accounts": accounts, "methods": payments.methods(accounts)}


@router.get("/payments/platform-accounts")
async def platform_payment_accounts(_: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> dict:
    accounts = await payments.platform_accounts(db)
    return {"payeeName": PLATFORM_NAME, "accounts": accounts, "methods": payments.methods(accounts)}


@router.get("/payments/my-accounts")
async def my_payment_accounts(user: User = Depends(require_roles(UserRole.LAWYER)), db: AsyncSession = Depends(get_db)) -> dict:
    return await payments.lawyer_accounts(db, user.id)


@router.put("/payments/my-accounts")
async def save_my_payment_accounts(body: payments.PaymentAccounts, user: User = Depends(require_roles(UserRole.LAWYER)),
                                   db: AsyncSession = Depends(get_db)) -> dict:
    data = await payments.save_lawyer_accounts(db, user.id, body)
    await db.commit()
    return data


@router.put("/admin/payment-accounts")
async def save_platform_payment_accounts(body: payments.PaymentAccounts, _: User = Depends(require_roles(UserRole.ADMIN)),
                                         db: AsyncSession = Depends(get_db)) -> dict:
    data = await payments.save_platform_accounts(db, body)
    await db.commit()
    return data


# --- Client submits (or re-submits after a rejection) -------------------------------------------------

async def _submit(db: AsyncSession, kind: str, record_id: str, user: User, body: payments.PaymentIn) -> dict:
    rec = await records.get_for(db, kind, record_id, user)
    if rec.owner_id != user.id:
        raise ForbiddenError()
    current = rec.data.get("payment") or {}
    if current.get("status") in ("submitted", "confirmed"):
        raise ValidationAppError("A payment is already waiting for confirmation.", "একটি পেমেন্ট ইতিমধ্যে যাচাইয়ের অপেক্ষায় আছে।")
    if kind == "consultation":
        accounts, payee = await payments.lawyer_accounts(db, rec.lawyer_id), rec.data.get("lawyerName", "")
    else:
        accounts, payee = await payments.platform_accounts(db), PLATFORM_NAME
    payment = await payments.build_payment(db, body, accounts, payee, float(rec.data.get("feeBdt") or 0), exclude=rec.id)
    records.save(rec, {**rec.data, "payment": payment})
    if kind == "consultation":
        await records.notify(db, rec.lawyer_id, "system", "Payment submitted", "পেমেন্ট জমা হয়েছে",
                             f"{user.full_name} paid ৳{payment['amount']:.0f} by {payment['methodLabel']} (TrxID {payment['trxId']}).",
                             f"{user.full_name} {payment['methodLabel']}-এ ৳{payment['amount']:.0f} পাঠিয়েছেন (TrxID {payment['trxId']})।",
                             f"/lawyer/consultations/{rec.id}")
    else:
        await records.notify_admins(db, "system", "Verification fee submitted", "যাচাই ফি জমা হয়েছে",
                                    f"{user.full_name} paid ৳{payment['amount']:.0f} by {payment['methodLabel']} (TrxID {payment['trxId']}).",
                                    f"{user.full_name} ৳{payment['amount']:.0f} পাঠিয়েছেন (TrxID {payment['trxId']})।",
                                    "/admin/payments")
    await db.commit()
    return records.out(rec)


@router.post("/consultations/{consultation_id}/payment")
async def submit_consultation_payment(consultation_id: str, body: payments.PaymentIn,
                                      user: User = Depends(require_roles(UserRole.CITIZEN)), db: AsyncSession = Depends(get_db)) -> dict:
    return await _submit(db, "consultation", consultation_id, user, body)


@router.post("/verifications/{request_id}/payment")
async def submit_verification_payment(request_id: str, body: payments.PaymentIn,
                                      user: User = Depends(require_roles(UserRole.CITIZEN)), db: AsyncSession = Depends(get_db)) -> dict:
    return await _submit(db, "verification", request_id, user, body)


# --- Payee confirms / rejects ---------------------------------------------------------------------------

@router.post("/consultations/{consultation_id}/payment/review")
async def review_consultation_payment(consultation_id: str, body: payments.PaymentReviewIn,
                                      user: User = Depends(require_roles(UserRole.LAWYER)), db: AsyncSession = Depends(get_db)) -> dict:
    rec = await records.get_for(db, "consultation", consultation_id, user)
    if rec.lawyer_id != user.id:
        raise ForbiddenError()
    payment = payments.review(rec.data.get("payment") or {}, body, user.full_name)
    records.save(rec, {**rec.data, "payment": payment})
    ok = payment["status"] == "confirmed"
    await records.notify(
        db, rec.owner_id, "system",
        "Payment confirmed" if ok else "Payment not received", "পেমেন্ট নিশ্চিত হয়েছে" if ok else "পেমেন্ট পাওয়া যায়নি",
        f"{rec.data.get('lawyerName', 'The lawyer')} {'confirmed' if ok else 'could not find'} your payment (TrxID {payment['trxId']})."
        + ("" if ok or not payment["reviewNote"] else f" Note: {payment['reviewNote']}"),
        f"আইনজীবী আপনার পেমেন্ট {'নিশ্চিত করেছেন' if ok else 'খুঁজে পাননি'} (TrxID {payment['trxId']})।",
        f"/app/consultations/{rec.id}",
    )
    await db.commit()
    return records.out(rec)


@router.post("/verifications/{request_id}/payment/review")
async def review_verification_payment(request_id: str, body: payments.PaymentReviewIn,
                                      user: User = Depends(require_roles(UserRole.ADMIN)), db: AsyncSession = Depends(get_db)) -> dict:
    rec = await records.get(db, "verification", request_id)
    payment = payments.review(rec.data.get("payment") or {}, body, user.full_name)
    records.save(rec, {**rec.data, "payment": payment})
    ok = payment["status"] == "confirmed"
    await records.notify(
        db, rec.owner_id, "system",
        "Payment confirmed" if ok else "Payment not received", "পেমেন্ট নিশ্চিত হয়েছে" if ok else "পেমেন্ট পাওয়া যায়নি",
        f"Your verification fee (TrxID {payment['trxId']}) was {'confirmed' if ok else 'not found'}."
        + ("" if ok or not payment["reviewNote"] else f" Note: {payment['reviewNote']}"),
        f"আপনার যাচাই ফি (TrxID {payment['trxId']}) {'নিশ্চিত হয়েছে' if ok else 'পাওয়া যায়নি'}।",
        f"/app/verifications/{rec.id}",
    )
    await db.commit()
    return records.out(rec)
