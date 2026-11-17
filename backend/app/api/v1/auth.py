"""`/auth/*` — registration with email verification, login sessions, password reset, and the
current-user lookup.

Sessions: a short-lived JWT access token (sent as a Bearer header) plus a rotating refresh token in
an HttpOnly cookie. Each account gets its own cookie (``lai_rt_<user id>``) so a browser can keep a
lawyer tab and a citizen tab signed in side by side; the tab says which account it is refreshing.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core import rate_limit
from app.core.exceptions import ForbiddenError, InvalidCredentialsError, PhoneAlreadyRegisteredError, UnauthorizedError
from app.core.security import (
    check_password_policy,
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.models.enums import UserRole
from app.models.app_record import AppRecord
from app.models.profile import CitizenProfile, LawyerProfile
from app.models.user import User
from app.providers.email import deliver
from app.providers.email.templates import password_changed_email, reset_code_email, verification_email
from app.schemas.auth import (
    EmailOnlyRequest,
    LoginRequest,
    OkResponse,
    RegisterCitizenRequest,
    RegisterLawyerRequest,
    RegistrationPendingResponse,
    ResetCodeRequest,
    ResetCodeResponse,
    ResetPasswordRequest,
    SessionRequest,
    TokenResponse,
    UserOut,
    VerifyEmailLinkRequest,
    VerifyEmailLinkResponse,
)
from app.services import auth_service, records

router = APIRouter()

COOKIE_PATH = "/api/v1/auth"
GENERIC_SENT_EN = "If an account exists for that email, we've sent a message to it."
GENERIC_SENT_BN = "এই ইমেইলে কোনো অ্যাকাউন্ট থাকলে সেখানে একটি বার্তা পাঠানো হয়েছে।"


async def _approval_status(db: AsyncSession, user: User) -> Optional[str]:
    if user.role != UserRole.LAWYER:
        return None
    value = await db.scalar(select(LawyerProfile.approval_status).where(LawyerProfile.user_id == user.id))
    return value.value.lower() if value else None


# --- helpers -------------------------------------------------------------------

def _cookie_name(user_id) -> str:
    return f"lai_rt_{str(user_id).replace('-', '')}"


def _set_refresh_cookie(response: Response, user: User, raw: str) -> None:
    response.set_cookie(
        _cookie_name(user.id),
        raw,
        max_age=settings.refresh_token_expire_days * 86400,
        path=COOKIE_PATH,
        httponly=True,  # never readable by page scripts
        secure=settings.refresh_cookie_secure,
        samesite="lax",
    )


def _clear_refresh_cookie(response: Response, user_id) -> None:
    response.delete_cookie(_cookie_name(user_id), path=COOKIE_PATH, secure=settings.refresh_cookie_secure, samesite="lax")


async def _session_response(db: AsyncSession, user: User) -> TokenResponse:
    district = await auth_service.get_district_for_user(db, user)
    return TokenResponse(
        user=auth_service.to_user_out(user, district=district, approval_status=await _approval_status(db, user)),
        token=create_access_token(user.id, user.role),
    )


def _send_verification(tasks: BackgroundTasks, user: User, raw_token: str) -> None:
    subject, text, html = verification_email(
        user.full_name, auth_service.verification_link(user, raw_token), settings.email_verification_ttl_hours
    )
    tasks.add_task(deliver, user.email, subject, text, html)


# --- registration & email verification ------------------------------------------

@router.post("/register/citizen", response_model=RegistrationPendingResponse, status_code=status.HTTP_201_CREATED)
async def register_citizen(
    payload: RegisterCitizenRequest, request: Request, tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)
) -> RegistrationPendingResponse:
    await rate_limit.limit(request, "register", rate_limit.client_ip(request), 10, 3600)
    user, raw = await auth_service.register_citizen(db, payload)
    _send_verification(tasks, user, raw)
    return RegistrationPendingResponse(email=user.email)


@router.post("/register/lawyer", response_model=RegistrationPendingResponse, status_code=status.HTTP_201_CREATED)
async def register_lawyer(
    payload: RegisterLawyerRequest, request: Request, tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)
) -> RegistrationPendingResponse:
    await rate_limit.limit(request, "register", rate_limit.client_ip(request), 10, 3600)
    user, profile, practice_areas, raw = await auth_service.register_lawyer(db, payload)
    if payload.license_document_url and payload.license_document_url.startswith("data:"):
        # Keep the uploaded licence so admins can inspect it in the approval queue.
        await records.create(
            db,
            "license",
            {"url": payload.license_document_url, "name": payload.license_document_name or "bar_license"},
            lawyer_id=user.id,
        )
    await records.notify_admins(
        db,
        "system",
        "New lawyer awaiting approval",
        "নতুন আইনজীবী অনুমোদনের অপেক্ষায়",
        f"{user.full_name} registered and is waiting for credential review.",
        f"{user.full_name} নিবন্ধন করেছেন এবং যাচাইয়ের অপেক্ষায় আছেন।",
        "/admin/lawyers",
    )
    await db.commit()
    _send_verification(tasks, user, raw)
    return RegistrationPendingResponse(email=user.email)


@router.post("/verify-email/confirm", response_model=VerifyEmailLinkResponse)
async def confirm_email(
    payload: VerifyEmailLinkRequest, request: Request, db: AsyncSession = Depends(get_db)
) -> VerifyEmailLinkResponse:
    await rate_limit.limit(request, "verify-link", rate_limit.client_ip(request), 30, 900)
    user, already = await auth_service.confirm_email_verification(db, payload.user_id, payload.token)
    return VerifyEmailLinkResponse(status="already_verified" if already else "verified", email=user.email)


@router.post("/verify-email/resend", response_model=OkResponse)
async def resend_verification(
    payload: EmailOnlyRequest, request: Request, tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)
) -> OkResponse:
    """Always answers the same way, so it can't be used to discover which emails are registered."""
    email = payload.email.strip().lower()
    await rate_limit.limit(request, "resend-ip", rate_limit.client_ip(request), 20, 3600)
    await rate_limit.cooldown(request, "resend", email, settings.email_resend_cooldown_seconds)
    await rate_limit.limit(request, "resend-email", email, 5, 3600)
    user = await auth_service.find_unverified_user(db, email)
    if user is not None:
        raw = await auth_service.issue_email_verification(db, user)
        await db.commit()
        _send_verification(tasks, user, raw)
    return OkResponse(ok=True)


# --- login sessions --------------------------------------------------------------

@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    await rate_limit.limit(request, "login-ip", rate_limit.client_ip(request), 30, 300)
    user = await auth_service.authenticate(db, payload)  # also enforces lockout + verified email
    raw = await auth_service.issue_refresh_token(
        db, user, request.headers.get("user-agent"), rate_limit.client_ip(request)
    )
    _set_refresh_cookie(response, user, raw)
    return await _session_response(db, user)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_session(
    payload: SessionRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """New access token for the tab's account, rotating its refresh cookie."""
    raw = request.cookies.get(_cookie_name(payload.user_id))
    if not raw:
        raise UnauthorizedError(
            message_en="Your session has ended. Please sign in again.",
            message_bn="আপনার সেশন শেষ হয়েছে। আবার সাইন ইন করুন।",
            code="SESSION_ENDED",
        )
    user, new_raw = await auth_service.rotate_refresh_token(
        db, raw, payload.user_id, request.headers.get("user-agent"), rate_limit.client_ip(request)
    )
    _set_refresh_cookie(response, user, new_raw)
    return await _session_response(db, user)


@router.post("/logout", response_model=OkResponse)
async def logout(
    payload: SessionRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)
) -> OkResponse:
    raw = request.cookies.get(_cookie_name(payload.user_id))
    if raw:
        await auth_service.revoke_refresh_token(db, raw)
    _clear_refresh_cookie(response, payload.user_id)
    return OkResponse(ok=True)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> UserOut:
    district = await auth_service.get_district_for_user(db, current_user)
    return auth_service.to_user_out(
        current_user, district=district, approval_status=await _approval_status(db, current_user)
    )


# --- forgot / reset password (6-digit code) ---------------------------------------

@router.post("/password/forgot", response_model=OkResponse)
async def forgot_password(
    payload: EmailOnlyRequest, request: Request, tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)
) -> OkResponse:
    """Email a 6-digit code. Same answer whether or not the email is registered; the email is sent
    in the background so response time doesn't reveal it either."""
    email = payload.email.strip().lower()
    await rate_limit.limit(request, "forgot-ip", rate_limit.client_ip(request), 20, 3600)
    await rate_limit.cooldown(request, "forgot", email, settings.email_resend_cooldown_seconds)
    await rate_limit.limit(request, "forgot-email", email, 5, 3600)
    issued = await auth_service.start_password_reset(db, email)
    if issued is not None:
        user, code = issued
        subject, text, html = reset_code_email(user.full_name, code, settings.otp_ttl_minutes)
        tasks.add_task(deliver, user.email, subject, text, html)
    return OkResponse(ok=True)


@router.post("/password/verify-code", response_model=ResetCodeResponse)
async def verify_reset_code(
    payload: ResetCodeRequest, request: Request, db: AsyncSession = Depends(get_db)
) -> ResetCodeResponse:
    email = payload.email.strip().lower()
    await rate_limit.limit(request, "reset-code-ip", rate_limit.client_ip(request), 30, 900)
    await rate_limit.limit(request, "reset-code-email", email, 10, 900)
    token = await auth_service.verify_password_reset_code(db, email, payload.code)
    return ResetCodeResponse(reset_token=token, expires_in_minutes=settings.password_reset_grant_minutes)


@router.post("/password/reset", response_model=OkResponse)
async def reset_password(
    payload: ResetPasswordRequest, request: Request, tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)
) -> OkResponse:
    await rate_limit.limit(request, "reset-ip", rate_limit.client_ip(request), 30, 900)
    user = await auth_service.complete_password_reset(db, payload.reset_token, payload.new_password)
    subject, text, html = password_changed_email(user.full_name, f"{settings.frontend_url.rstrip('/')}/signin")
    tasks.add_task(deliver, user.email, subject, text, html)
    return OkResponse(ok=True)


# --- Account self-service -----------------------------------------------------

class UpdateMeIn(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    phone: Optional[str] = Field(default=None, max_length=32)
    district: Optional[str] = Field(default=None, max_length=100)


class ChangePasswordIn(BaseModel):
    currentPassword: str
    newPassword: str = Field(min_length=1, max_length=256)


@router.put("/me", response_model=UserOut)
async def update_me(
    payload: UpdateMeIn, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> UserOut:
    if payload.name:
        current_user.full_name = payload.name.strip()
    if payload.phone is not None:
        phone = payload.phone.strip() or None
        if phone and phone != current_user.phone:
            taken = await db.scalar(select(User.id).where(User.phone == phone, User.id != current_user.id))
            if taken:
                raise PhoneAlreadyRegisteredError()
        current_user.phone = phone
    if payload.district is not None:
        district = payload.district.strip() or None
        if current_user.role == UserRole.CITIZEN:
            profile = await db.get(CitizenProfile, current_user.id)
            if profile is None:
                db.add(CitizenProfile(user_id=current_user.id, district=district))
            else:
                profile.district = district
        elif current_user.role == UserRole.LAWYER:
            lawyer = await db.get(LawyerProfile, current_user.id)
            if lawyer is not None:
                lawyer.district = district
    await db.commit()
    await db.refresh(current_user)
    return await me(current_user, db)


@router.post("/change-password", response_model=OkResponse)
async def change_password(
    payload: ChangePasswordIn,
    request: Request,
    response: Response,
    tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OkResponse:
    if not verify_password(payload.currentPassword, current_user.password_hash):
        raise InvalidCredentialsError("Your current password is incorrect.", "বর্তমান পাসওয়ার্ড সঠিক নয়।")
    check_password_policy(payload.newPassword, current_user.email)
    current_user.password_hash = hash_password(payload.newPassword)
    await auth_service.revoke_all_sessions(db, current_user.id)  # other devices must sign in again
    await db.commit()
    raw = await auth_service.issue_refresh_token(
        db, current_user, request.headers.get("user-agent"), rate_limit.client_ip(request)
    )
    _set_refresh_cookie(response, current_user, raw)  # keep this device signed in
    subject, text, html = password_changed_email(current_user.full_name, f"{settings.frontend_url.rstrip('/')}/signin")
    tasks.add_task(deliver, current_user.email, subject, text, html)
    return OkResponse(ok=True)


@router.get("/me/export")
async def export_my_data(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> dict:
    """Everything stored about the signed-in user, as one JSON document."""
    rows = (await db.scalars(
        select(AppRecord)
        .where(AppRecord.owner_id == current_user.id, AppRecord.kind != "license")
        .order_by(AppRecord.created_at)
    )).all()
    grouped: dict[str, list[dict]] = {}
    for rec in rows:
        grouped.setdefault(rec.kind, []).append(records.out(rec))
    return {
        "exportedAt": records.now_iso(),
        "account": (await me(current_user, db)).model_dump(by_alias=True, mode="json"),
        "data": grouped,
    }


@router.delete("/me", response_model=OkResponse)
async def delete_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> OkResponse:
    """Permanently delete a citizen account and everything it owns (lawyers and admins go through support,
    because their records are shared with clients)."""
    if current_user.role != UserRole.CITIZEN:
        raise ForbiddenError(
            "Lawyer and admin accounts can only be closed by an administrator.",
            "আইনজীবী ও অ্যাডমিন অ্যাকাউন্ট শুধু অ্যাডমিন বন্ধ করতে পারেন।",
        )
    await db.delete(current_user)
    await db.commit()
    return OkResponse(ok=True)
