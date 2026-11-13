"""Lawyer earnings and manual wallet payouts.

A lawyer earns from every verification verdict they issue and every consultation
they complete. The admin sends the money with bKash/Nagad/Rocket "Send Money" to
the lawyer's payout wallet and records the TrxID here as a `Payout`, whose
`PayoutItem`s say exactly which jobs it settled (each job can be paid only once).
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.core.exceptions import ConflictError, NotFoundError, ValidationAppError
from app.models.consultation import Consultation
from app.models.enums import (
    ConsultationStatus,
    PaymentMethod,
    PaymentStatus,
    PayoutSourceType,
    PayoutStatus,
    VerificationStatus,
)
from app.models.payment import Payment, Payout, PayoutItem
from app.models.profile import LawyerProfile
from app.models.user import User
from app.models.verification import VerificationAssignment, VerificationRequest
from app.schemas.payouts import (
    EarningItemOut,
    FinanceOverviewOut,
    FinanceSummaryOut,
    LawyerLedgerOut,
    MyEarningsOut,
    PayLawyerRequest,
    PayoutAccountIn,
    PayoutAccountOut,
    PayoutOut,
)
from app.services.mappers import as_uuid, iso
from app.services.notification_service import notify
from app.services.verification_service import HONORARIUM_SHARE

_TO_DB = {"bkash": PaymentMethod.BKASH, "nagad": PaymentMethod.NAGAD, "rocket": PaymentMethod.ROCKET}
_FROM_DB = {v: k for k, v in _TO_DB.items()}
_NAMES = {"bkash": "bKash", "nagad": "Nagad", "rocket": "Rocket"}
_CITIZEN_STATUS = {PaymentStatus.SUCCESS: "confirmed", PaymentStatus.PENDING: "pending", PaymentStatus.FAILED: "rejected"}
_EARNED_VERIFICATION = (VerificationStatus.VERDICT_ISSUED, VerificationStatus.CLOSED)
_CENT = Decimal("0.01")


def consultation_share() -> Decimal:
    """The lawyer's share of a consultation fee (what's left after platform commission)."""
    return (Decimal(100) - Decimal(settings.platform_commission_percent)) / Decimal(100)


@dataclass
class _Item:
    out: EarningItemOut
    lawyer_id: uuid.UUID
    source_type: PayoutSourceType
    share: Decimal
    fee: Decimal
    completed_at: Optional[datetime]
    record: object  # VerificationAssignment | Consultation


# --- earnings ----------------------------------------------------------------

async def _earning_items(db: AsyncSession, lawyer_id: Optional[uuid.UUID] = None) -> list[_Item]:
    paid_sources = {
        (pi.source_type, pi.source_id): pi.payout_id
        for pi in (await db.scalars(select(PayoutItem))).all()
    }

    v_stmt = (
        select(VerificationAssignment, VerificationRequest)
        .join(VerificationRequest, VerificationRequest.id == VerificationAssignment.request_id)
        .options(selectinload(VerificationAssignment.verdict))
        .where(
            VerificationAssignment.declined_at.is_(None),
            VerificationRequest.status.in_(_EARNED_VERIFICATION),
        )
    )
    c_stmt = select(Consultation).where(Consultation.status == ConsultationStatus.COMPLETED)
    if lawyer_id is not None:
        v_stmt = v_stmt.where(VerificationAssignment.lawyer_id == lawyer_id)
        c_stmt = c_stmt.where(Consultation.lawyer_id == lawyer_id)
    verifications = [(a, r) for a, r in (await db.execute(v_stmt)).all() if a.verdict is not None]
    consultations = list((await db.scalars(c_stmt)).all())

    payment_ids = [r.payment_id for _, r in verifications if r.payment_id] + [c.payment_id for c in consultations if c.payment_id]
    payment_status = {
        p.id: p.status for p in (await db.scalars(select(Payment).where(Payment.id.in_(payment_ids)))).all()
    } if payment_ids else {}
    citizen_ids = {r.citizen_id for _, r in verifications} | {c.citizen_id for c in consultations}
    names = {
        u.id: u.full_name for u in (await db.scalars(select(User).where(User.id.in_(citizen_ids)))).all()
    } if citizen_ids else {}

    def citizen_status(payment_id) -> str:
        if payment_id is None:
            return "none"
        return _CITIZEN_STATUS.get(payment_status.get(payment_id), "pending")

    items: list[_Item] = []
    for a, r in verifications:
        share = (a.honorarium_amount if a.honorarium_amount is not None else r.fee_amount * HONORARIUM_SHARE).quantize(_CENT)
        payout_id = paid_sources.get((PayoutSourceType.VERIFICATION, a.id)) or a.payout_id
        done = a.verdict.issued_at
        items.append(_Item(
            out=EarningItemOut(
                id=str(a.id), type="verification", reference_id=str(r.id),
                title=(r.question_excerpt_en or r.issue_summary or "")[:160],
                citizen_name=names.get(r.citizen_id, ""), completed_at=iso(done),
                fee_bdt=float(r.fee_amount), lawyer_share_bdt=float(share),
                citizen_payment_status=citizen_status(r.payment_id),
                # `payment_processed` alone = marked paid before payouts were recorded.
                paid=payout_id is not None or a.payment_processed,
                payout_id=str(payout_id) if payout_id else None,
            ),
            lawyer_id=a.lawyer_id, source_type=PayoutSourceType.VERIFICATION, share=share,
            fee=r.fee_amount, completed_at=done, record=a,
        ))
    for c in consultations:
        share = (c.fee_amount * consultation_share()).quantize(_CENT)
        payout_id = paid_sources.get((PayoutSourceType.CONSULTATION, c.id))
        items.append(_Item(
            out=EarningItemOut(
                id=str(c.id), type="consultation", reference_id=str(c.id), title=c.subject,
                citizen_name=names.get(c.citizen_id, ""), completed_at=iso(c.completed_at),
                fee_bdt=float(c.fee_amount), lawyer_share_bdt=float(share),
                citizen_payment_status=citizen_status(c.payment_id),
                paid=payout_id is not None or c.payment_processed,
                payout_id=str(payout_id) if payout_id else None,
            ),
            lawyer_id=c.lawyer_id, source_type=PayoutSourceType.CONSULTATION, share=share,
            fee=c.fee_amount, completed_at=c.completed_at, record=c,
        ))
    items.sort(key=lambda i: i.completed_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return items


def _account(profile: Optional[LawyerProfile]) -> PayoutAccountOut:
    if profile is None or not profile.payout_msisdn:
        return PayoutAccountOut()
    return PayoutAccountOut(method=_FROM_DB.get(profile.payout_method), number=profile.payout_msisdn)


async def _payout_outs(db: AsyncSession, payouts: list[Payout]) -> list[PayoutOut]:
    user_ids = {p.lawyer_id for p in payouts} | {p.approved_by for p in payouts if p.approved_by}
    names = {
        u.id: u.full_name for u in (await db.scalars(select(User).where(User.id.in_(user_ids)))).all()
    } if user_ids else {}
    counts = dict((await db.execute(
        select(PayoutItem.payout_id, func.count(PayoutItem.id))
        .where(PayoutItem.payout_id.in_([p.id for p in payouts])).group_by(PayoutItem.payout_id)
    )).all()) if payouts else {}
    return [
        PayoutOut(
            id=str(p.id), lawyer_id=str(p.lawyer_id), lawyer_name=names.get(p.lawyer_id, ""),
            amount_bdt=float(p.net_amount), method=_FROM_DB.get(p.method), receiver_number=p.receiver_number,
            trx_id=p.external_reference, item_count=counts.get(p.id, 0),
            paid_by_name=names.get(p.approved_by) if p.approved_by else None,
            paid_at=iso(p.paid_at), note=p.note,
        )
        for p in payouts
    ]


async def finance_overview(db: AsyncSession) -> FinanceOverviewOut:
    items = await _earning_items(db)
    payouts = list((await db.scalars(
        select(Payout).where(Payout.status == PayoutStatus.PAID).order_by(Payout.paid_at.desc())
    )).all())

    lawyer_ids = {i.lawyer_id for i in items} | {p.lawyer_id for p in payouts}
    profiles = {
        p.user_id: p for p in (await db.scalars(select(LawyerProfile).where(LawyerProfile.user_id.in_(lawyer_ids)))).all()
    } if lawyer_ids else {}
    names = {
        u.id: u.full_name for u in (await db.scalars(select(User).where(User.id.in_(lawyer_ids)))).all()
    } if lawyer_ids else {}

    ledgers = []
    for lid in lawyer_ids:
        mine = [i for i in items if i.lawyer_id == lid]
        ledgers.append(LawyerLedgerOut(
            lawyer_id=str(lid), lawyer_name=names.get(lid, ""), payout_account=_account(profiles.get(lid)),
            owed_bdt=float(sum((i.share for i in mine if not i.out.paid), Decimal(0))),
            paid_bdt=float(sum((i.share for i in mine if i.out.paid), Decimal(0))),
            items=[i.out for i in mine],
        ))
    # Most owed first, then by name.
    ledgers.sort(key=lambda l: (-l.owed_bdt, l.lawyer_name.lower()))

    citizen = (await db.execute(
        select(Payment.status, func.coalesce(func.sum(Payment.amount), 0), func.count(Payment.id))
        .where(Payment.status.in_([PaymentStatus.SUCCESS, PaymentStatus.PENDING]))
        .group_by(Payment.status)
    )).all()
    by_status = {s: (Decimal(total), n) for s, total, n in citizen}
    confirmed = by_status.get(PaymentStatus.SUCCESS, (Decimal(0), 0))[0]
    pending, pending_n = by_status.get(PaymentStatus.PENDING, (Decimal(0), 0))
    earned = sum((i.share for i in items), Decimal(0))
    owed = sum((i.share for i in items if not i.out.paid), Decimal(0))

    return FinanceOverviewOut(
        summary=FinanceSummaryOut(
            citizen_confirmed_bdt=float(confirmed), citizen_pending_bdt=float(pending),
            citizen_pending_count=pending_n, lawyer_earned_bdt=float(earned),
            lawyer_owed_bdt=float(owed), lawyer_paid_bdt=float(earned - owed),
            platform_net_bdt=float(confirmed - earned),
            verification_share_percent=int(HONORARIUM_SHARE * 100),
            consultation_share_percent=int(consultation_share() * 100),
        ),
        lawyers=ledgers,
        payouts=await _payout_outs(db, payouts),
    )


# --- paying a lawyer ---------------------------------------------------------

async def pay_lawyer(db: AsyncSession, admin: User, data: PayLawyerRequest) -> PayoutOut:
    lawyer_uuid = as_uuid(data.lawyer_id, "Lawyer")
    profile = await db.get(LawyerProfile, lawyer_uuid)
    if profile is None:
        raise NotFoundError("Lawyer not found.", "আইনজীবী পাওয়া যায়নি।")
    if not profile.payout_msisdn or profile.payout_method not in _FROM_DB:
        raise ConflictError(
            "This lawyer hasn't added a payout wallet yet. Ask them to add it in Account Settings.",
            "এই আইনজীবী এখনো পেমেন্ট গ্রহণের ওয়ালেট যোগ করেননি। তাঁকে অ্যাকাউন্ট সেটিংসে যোগ করতে বলুন।",
            code="NO_PAYOUT_ACCOUNT",
        )

    owed = [i for i in await _earning_items(db, lawyer_uuid) if not i.out.paid]
    if data.item_ids is not None:
        wanted = set(data.item_ids)
        selected = [i for i in owed if i.out.id in wanted]
        if len(selected) != len(wanted):
            raise ConflictError(
                "Some selected items are already paid or don't belong to this lawyer. Refresh and try again.",
                "নির্বাচিত কিছু কাজ আগেই পরিশোধিত বা এই আইনজীবীর নয়। রিফ্রেশ করে আবার চেষ্টা করুন।",
                code="PAYOUT_ITEMS_CHANGED",
            )
    else:
        selected = owed
    if not selected:
        raise ValidationAppError("Nothing is owed to this lawyer.", "এই আইনজীবীর কোনো পাওনা নেই।", code="NOTHING_OWED")

    used = await db.scalar(select(Payout.id).where(
        Payout.method == profile.payout_method, Payout.external_reference == data.trx_id,
    ))
    if used is not None:
        raise ConflictError(
            "This transaction ID is already recorded for another payout.",
            "এই ট্রানজেকশন আইডি আগেই অন্য একটি পেমেন্টে ব্যবহার হয়েছে।",
            code="TRX_ID_ALREADY_USED",
        )

    now = datetime.now(timezone.utc)
    net = sum((i.share for i in selected), Decimal(0))
    gross = sum((i.fee for i in selected), Decimal(0))
    dates = [i.completed_at for i in selected if i.completed_at] or [now]
    payout = Payout(
        lawyer_id=lawyer_uuid, period_start=min(dates), period_end=max(dates),
        gross_amount=gross, platform_commission=gross - net, net_amount=net,
        status=PayoutStatus.PAID, external_reference=data.trx_id, approved_by=admin.id, paid_at=now,
        note=data.note, method=profile.payout_method, receiver_number=profile.payout_msisdn,
    )
    db.add(payout)
    await db.flush()
    for i in selected:
        db.add(PayoutItem(payout_id=payout.id, source_type=i.source_type, source_id=uuid.UUID(i.out.id), amount=i.share))
        if isinstance(i.record, VerificationAssignment):
            i.record.payout_id = payout.id
        i.record.payment_processed = True

    method = _FROM_DB[profile.payout_method]
    notify(db, lawyer_uuid, "system",
           title_bn="আপনার পারিশ্রমিক পাঠানো হয়েছে", title_en="Your earnings have been paid",
           body_bn=f"৳{net} আপনার {_NAMES[method]} ({profile.payout_msisdn}) নম্বরে পাঠানো হয়েছে। TrxID: {data.trx_id}",
           body_en=f"৳{net} was sent to your {_NAMES[method]} ({profile.payout_msisdn}). TrxID: {data.trx_id}",
           link="/lawyer/settings")
    await db.commit()
    return (await _payout_outs(db, [payout]))[0]


# --- the lawyer's own view ---------------------------------------------------

async def get_account(db: AsyncSession, lawyer: User) -> PayoutAccountOut:
    return _account(await db.get(LawyerProfile, lawyer.id))


async def set_account(db: AsyncSession, lawyer: User, data: PayoutAccountIn) -> PayoutAccountOut:
    profile = await db.get(LawyerProfile, lawyer.id)
    if profile is None:
        raise NotFoundError("Lawyer profile not found.", "আইনজীবী প্রোফাইল পাওয়া যায়নি।")
    profile.payout_method = _TO_DB[data.method]
    profile.payout_msisdn = data.number
    await db.commit()
    return _account(profile)


async def my_earnings(db: AsyncSession, lawyer: User) -> MyEarningsOut:
    items = await _earning_items(db, lawyer.id)
    payouts = list((await db.scalars(
        select(Payout).where(Payout.lawyer_id == lawyer.id, Payout.status == PayoutStatus.PAID)
        .order_by(Payout.paid_at.desc())
    )).all())
    return MyEarningsOut(
        payout_account=await get_account(db, lawyer),
        owed_bdt=float(sum((i.share for i in items if not i.out.paid), Decimal(0))),
        paid_bdt=float(sum((i.share for i in items if i.out.paid), Decimal(0))),
        items=[i.out for i in items],
        payouts=await _payout_outs(db, payouts),
    )
