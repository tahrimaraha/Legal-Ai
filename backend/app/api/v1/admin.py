"""`/admin/*` — the admin console. Every route requires the ADMIN role."""
from __future__ import annotations

from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, Response, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import require_roles
from app.database import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.admin import (
    AdminStatsOut,
    CorpusDocumentOut,
    FlaggedAnswerOut,
    RejectLawyerRequest,
    ReindexResponse,
    ResolveFlagRequest,
)
from app.schemas.auth import UserOut
from app.schemas.common import OkResponse
from app.schemas.lawyers import LawyerOut
from app.schemas.messaging import MessageReportOut, ResolveReportRequest
from app.schemas.payments import AdminPaymentOut
from app.schemas.payouts import FinanceOverviewOut, PayLawyerRequest, PayoutOut
from app.services import admin_service, corpus_service, lawyer_service, messaging_service, payment_service, payout_service

admin_only = require_roles(UserRole.ADMIN)
router = APIRouter(dependencies=[Depends(admin_only)])


@router.get("/stats", response_model=AdminStatsOut)
async def stats(db: AsyncSession = Depends(get_db)) -> AdminStatsOut:
    return await admin_service.stats(db)


@router.get("/users", response_model=list[UserOut])
async def list_users(db: AsyncSession = Depends(get_db)) -> list[UserOut]:
    return await admin_service.list_users(db)


# --- lawyer approvals ---

@router.get("/lawyers", response_model=list[LawyerOut])
async def list_lawyers(db: AsyncSession = Depends(get_db)) -> list[LawyerOut]:
    return await lawyer_service.list_lawyers(db, approved_only=False)


@router.get("/lawyers/{lawyer_id}/license-document")
async def license_document(lawyer_id: str, db: AsyncSession = Depends(get_db)) -> Response:
    """Streams a lawyer's submitted ID / bar licence to the admin reviewing it."""
    data, mime_type, filename = await lawyer_service.get_license_document(db, lawyer_id)
    return Response(
        content=data,
        media_type=mime_type,
        headers={
            "Content-Disposition": f"inline; filename*=UTF-8''{quote(filename)}",
            # Personal document: never cache, and never let it run as a page (SVG/HTML).
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
        },
    )


@router.post("/lawyers/{lawyer_id}/approve", response_model=LawyerOut)
async def approve_lawyer(
    lawyer_id: str, admin: User = Depends(admin_only), db: AsyncSession = Depends(get_db)
) -> LawyerOut:
    return await lawyer_service.set_approval(db, admin, lawyer_id, approve=True)


@router.post("/lawyers/{lawyer_id}/reject", response_model=LawyerOut)
async def reject_lawyer(
    lawyer_id: str, payload: RejectLawyerRequest,
    admin: User = Depends(admin_only), db: AsyncSession = Depends(get_db),
) -> LawyerOut:
    return await lawyer_service.set_approval(db, admin, lawyer_id, approve=False, reason=payload.reason)


# --- payouts ---

@router.get("/finance", response_model=FinanceOverviewOut)
async def finance_overview(db: AsyncSession = Depends(get_db)) -> FinanceOverviewOut:
    """Totals, every lawyer's earnings (who did which job, how much is owed) and payout history."""
    return await payout_service.finance_overview(db)


@router.post("/payouts", response_model=PayoutOut, status_code=201)
async def pay_lawyer(
    payload: PayLawyerRequest, admin: User = Depends(admin_only), db: AsyncSession = Depends(get_db)
) -> PayoutOut:
    """Records a manual wallet payout (TrxID) settling the lawyer's selected or all owed jobs."""
    return await payout_service.pay_lawyer(db, admin, payload)


# --- corpus ---

@router.get("/corpus", response_model=list[CorpusDocumentOut])
async def list_corpus(db: AsyncSession = Depends(get_db)) -> list[CorpusDocumentOut]:
    return await corpus_service.list_documents(db)


@router.post("/corpus/upload", response_model=CorpusDocumentOut)
async def upload_corpus(
    file: UploadFile = File(...), statute_id: str = Form(..., alias="statuteId"),
    admin: User = Depends(admin_only), db: AsyncSession = Depends(get_db),
) -> CorpusDocumentOut:
    data = await file.read()
    return await corpus_service.upload(db, admin, statute_id, file.filename or "upload.pdf", file.content_type or "", data)


@router.post("/corpus/reindex", response_model=ReindexResponse)
async def reindex(db: AsyncSession = Depends(get_db)) -> ReindexResponse:
    return await corpus_service.reindex(db)


# --- moderation ---

@router.get("/flags", response_model=list[FlaggedAnswerOut])
async def list_flags(db: AsyncSession = Depends(get_db)) -> list[FlaggedAnswerOut]:
    return await admin_service.list_flags(db)


@router.post("/flags/{flag_id}/resolve", response_model=OkResponse)
async def resolve_flag(
    flag_id: str, payload: ResolveFlagRequest, admin: User = Depends(admin_only), db: AsyncSession = Depends(get_db)
) -> OkResponse:
    await admin_service.resolve_flag(db, admin, flag_id, payload.action)
    return OkResponse()


@router.get("/message-reports", response_model=list[MessageReportOut])
async def list_reports(db: AsyncSession = Depends(get_db)) -> list[MessageReportOut]:
    return await messaging_service.list_reports(db)


@router.post("/message-reports/{report_id}/resolve", response_model=OkResponse)
async def resolve_report(
    report_id: str, payload: ResolveReportRequest, admin: User = Depends(admin_only), db: AsyncSession = Depends(get_db)
) -> OkResponse:
    await messaging_service.resolve_report(db, admin, report_id, payload.action)
    return OkResponse()


@router.get("/payments", response_model=list[AdminPaymentOut])
async def list_payments(db: AsyncSession = Depends(get_db)) -> list[AdminPaymentOut]:
    """Citizen payments submitted with a wallet TrxID, newest first."""
    return await payment_service.list_admin_payments(db)


@router.post("/payments/{payment_id}/confirm", response_model=OkResponse)
async def confirm_payment(payment_id: str, db: AsyncSession = Depends(get_db)) -> OkResponse:
    await payment_service.set_status(db, payment_id, confirmed=True)
    return OkResponse(ok=True)


@router.post("/payments/{payment_id}/reject", response_model=OkResponse)
async def reject_payment(payment_id: str, db: AsyncSession = Depends(get_db)) -> OkResponse:
    await payment_service.set_status(db, payment_id, confirmed=False)
    return OkResponse(ok=True)
