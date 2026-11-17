"""`/verifications/*` — Rung 2: a citizen asks a lawyer to verify an AI answer.

Flow: citizen creates (pending) → admin assigns an approved lawyer (claimed) → the lawyer issues a
verdict (completed). A lawyer who declines hands the request back to the admin queue; an admin
decline closes it (declined).
"""
from __future__ import annotations

from typing import Literal, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, ForbiddenError, ValidationAppError
from app.core.security import get_current_user, require_roles
from app.database import get_db
from app.models.enums import LawyerApprovalStatus, UserRole
from app.models.profile import LawyerProfile
from app.models.user import User
from app.services import records
from app.services.lawyer_directory import lawyer_name

router = APIRouter()

FEES = {"normal": 200, "urgent": 300}


class VerificationIn(BaseModel):
    conversationId: Optional[str] = None
    messageId: str = Field(max_length=100)
    questionText: str = Field(max_length=20000)
    answerText: str = Field(max_length=20000)
    citations: list[dict] = Field(default_factory=list, max_length=20)
    urgency: Literal["normal", "urgent"] = "normal"


class AssignIn(BaseModel):
    lawyerId: str


class ReasonIn(BaseModel):
    reason: str = Field(default="", max_length=2000)


class VerdictIn(BaseModel):
    verdict: Literal["accurate", "incomplete", "needs_correction", "incorrect"]
    correctedExplanationBn: str = Field(default="", max_length=20000)
    correctedExplanationEn: str = Field(default="", max_length=20000)
    addedStatuteCitations: list[str] = Field(default_factory=list)
    disputedStatuteCitations: list[str] = Field(default_factory=list)
    noteToCitizenBn: str = Field(default="", max_length=5000)
    noteToCitizenEn: str = Field(default="", max_length=5000)
    minutesSpent: int = Field(default=0, ge=0, le=100000)


@router.get("/verifications")
async def list_verifications(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> list[dict]:
    return [records.out(r) for r in await records.list_for(db, "verification", user)]


@router.get("/verifications/{request_id}")
async def get_verification(
    request_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    return records.out(await records.get_for(db, "verification", request_id, user))


@router.post("/verifications")
async def create_verification(
    payload: VerificationIn,
    user: User = Depends(require_roles(UserRole.CITIZEN)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    now = records.now_iso()
    rec = await records.create(
        db,
        "verification",
        {
            "citizenId": str(user.id),
            "citizenName": user.full_name,
            "conversationId": payload.conversationId or "",
            "messageId": payload.messageId,
            "questionExcerptBn": payload.questionText,
            "questionExcerptEn": payload.questionText,
            "aiAnswerExcerptBn": payload.answerText,
            "aiAnswerExcerptEn": payload.answerText,
            "citations": payload.citations,
            "status": "pending",
            "urgency": payload.urgency,
            "feeBdt": FEES[payload.urgency],
            "createdAt": now,
            "updatedAt": now,
        },
        owner_id=user.id,
    )
    await records.notify_admins(
        db, "system", "New verification request", "নতুন যাচাই অনুরোধ",
        f"{user.full_name} asked for an AI answer to be verified ({payload.urgency}).",
        f"{user.full_name} একটি এআই উত্তর যাচাইয়ের অনুরোধ করেছেন।",
        "/admin/verifications",
    )
    await db.commit()
    return records.out(rec)


@router.post("/verifications/{request_id}/assign")
async def assign_verification(
    request_id: str,
    payload: AssignIn,
    admin: User = Depends(require_roles(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    rec = await records.get(db, "verification", request_id)
    if rec.data.get("status") != "pending":
        raise ConflictError("Only pending requests can be assigned.", "শুধুমাত্র অপেক্ষমাণ অনুরোধ বরাদ্দ করা যায়।")
    lawyer_uid = records.parse_uuid(payload.lawyerId)
    profile = await db.get(LawyerProfile, lawyer_uid) if lawyer_uid else None
    if profile is None or profile.approval_status != LawyerApprovalStatus.APPROVED:
        raise ValidationAppError("Choose an approved lawyer.", "একজন অনুমোদিত আইনজীবী নির্বাচন করুন।")
    name, _, _ = await lawyer_name(db, lawyer_uid)
    now = records.now_iso()
    rec.lawyer_id = lawyer_uid
    records.save(rec, {**rec.data, "status": "claimed", "claimedByLawyerId": str(lawyer_uid),
                       "claimedByLawyerName": name, "assignedAt": now, "updatedAt": now})
    await records.notify(
        db, lawyer_uid, "system", "Verification assigned to you", "আপনাকে একটি যাচাই অনুরোধ দেওয়া হয়েছে",
        "An admin assigned you an AI answer to verify.", "অ্যাডমিন আপনাকে একটি এআই উত্তর যাচাইয়ের দায়িত্ব দিয়েছেন।",
        f"/lawyer/verifications/{rec.id}",
    )
    await db.commit()
    return records.out(rec)


@router.post("/verifications/{request_id}/decline")
async def decline_verification(
    request_id: str, payload: ReasonIn, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> dict:
    rec = await records.get_for(db, "verification", request_id, user)
    data = dict(rec.data)
    now = records.now_iso()
    if user.role == UserRole.LAWYER:
        if rec.lawyer_id != user.id or data.get("status") != "claimed":
            raise ForbiddenError()
        # Back to the admin queue so another lawyer can be assigned.
        rec.lawyer_id = None
        for key in ("claimedByLawyerId", "claimedByLawyerName", "assignedAt"):
            data.pop(key, None)
        data.update(status="pending", declineReason=payload.reason, updatedAt=now)
        await records.notify_admins(
            db, "system", "Lawyer declined a verification", "আইনজীবী যাচাই অনুরোধ প্রত্যাখ্যান করেছেন",
            f"{user.full_name} declined: {payload.reason or 'no reason given'}. Please reassign.",
            f"{user.full_name} প্রত্যাখ্যান করেছেন। অনুগ্রহ করে পুনরায় বরাদ্দ করুন।",
            "/admin/verifications",
        )
    elif user.role == UserRole.ADMIN:
        if data.get("status") == "completed":
            raise ConflictError("This request is already completed.", "এই অনুরোধটি ইতিমধ্যে সম্পন্ন হয়েছে।")
        data.update(status="declined", declineReason=payload.reason, updatedAt=now)
        await records.notify(
            db, rec.owner_id, "system", "Verification request declined", "যাচাই অনুরোধ প্রত্যাখ্যাত",
            payload.reason or "Your verification request could not be processed.",
            payload.reason or "আপনার যাচাই অনুরোধটি প্রক্রিয়া করা যায়নি।",
            f"/app/verifications/{rec.id}",
        )
    else:
        raise ForbiddenError()
    records.save(rec, data)
    await db.commit()
    return records.out(rec)


@router.post("/verifications/{request_id}/verdict")
async def submit_verdict(
    request_id: str,
    payload: VerdictIn,
    user: User = Depends(require_roles(UserRole.LAWYER)),
    db: AsyncSession = Depends(get_db),
) -> dict:
    rec = await records.get_for(db, "verification", request_id, user)
    if rec.lawyer_id != user.id or rec.data.get("status") != "claimed":
        raise ForbiddenError("This request is not assigned to you.", "এই অনুরোধটি আপনাকে দেওয়া হয়নি।")
    profile = await db.get(LawyerProfile, user.id)
    name, name_bn, avatar = await lawyer_name(db, user.id)
    now = records.now_iso()
    verdict = {
        "id": f"verdict-{rec.id}",
        "requestId": str(rec.id),
        "lawyerId": str(user.id),
        "lawyerName": name,
        "lawyerNameBn": name_bn,
        "lawyerAvatar": avatar,
        "lawyerEnrolmentNo": profile.bar_council_enrollment_no if profile else "",
        **payload.model_dump(),
        "createdAt": now,
    }
    records.save(rec, {**rec.data, "status": "completed", "verdict": verdict, "updatedAt": now})
    await records.notify(
        db, rec.owner_id, "verification_completed", "Your answer has been verified", "আপনার উত্তর যাচাই সম্পন্ন হয়েছে",
        f"{name} issued a verdict on your AI answer.", f"{name_bn} আপনার এআই উত্তরের উপর মতামত দিয়েছেন।",
        f"/app/verifications/{rec.id}",
    )
    await db.commit()
    return verdict
