"""`/auth/*` — registration, login, email verification and the current-user lookup."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ConfirmEmailRequest,
    ForgotPasswordRequest,
    LawyerRegisterResponse,
    LoginRequest,
    OkResponse,
    RegisterCitizenRequest,
    RegisterLawyerRequest,
    RegisterResponse,
    ResendVerificationRequest,
    ResendVerificationResponse,
    ResetPasswordRequest,
    TokenResponse,
    UserOut,
    VerifyEmailRequest,
)
from app.services import auth_service

router = APIRouter()


@router.post("/register/citizen", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register_citizen(
    payload: RegisterCitizenRequest, db: AsyncSession = Depends(get_db)
) -> RegisterResponse:
    user, code = await auth_service.register_citizen(db, payload)
    token = create_access_token(user.id, user.role)
    return RegisterResponse(
        user=auth_service.to_user_out(user, district=payload.district),
        token=token,
        dev_verification_code=auth_service.dev_visible_code(code),
    )


@router.post("/register/lawyer", response_model=LawyerRegisterResponse, status_code=status.HTTP_201_CREATED)
async def register_lawyer(
    payload: RegisterLawyerRequest, db: AsyncSession = Depends(get_db)
) -> LawyerRegisterResponse:
    user, profile, practice_areas, code = await auth_service.register_lawyer(db, payload)
    token = create_access_token(user.id, user.role)
    return LawyerRegisterResponse(
        user=auth_service.to_user_out(user, district=payload.district, lawyer_status="pending"),
        lawyer_profile=auth_service.to_lawyer_profile_out(
            profile, practice_areas, payload.starting_fee_bdt
        ),
        token=token,
        dev_verification_code=auth_service.dev_visible_code(code),
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    user = await auth_service.authenticate(db, payload)
    token = create_access_token(user.id, user.role)
    return TokenResponse(user=await auth_service.user_out_for(db, user), token=token)


@router.get("/me", response_model=UserOut)
async def me(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> UserOut:
    return await auth_service.user_out_for(db, current_user)


@router.post("/verify-email", response_model=OkResponse)
async def verify_email(
    payload: VerifyEmailRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OkResponse:
    await auth_service.verify_email(db, current_user, payload.code)
    return OkResponse(ok=True)


@router.post("/verify-email/confirm", response_model=TokenResponse)
async def confirm_email(payload: ConfirmEmailRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    """Public: verify with email + code and sign in. Works after a refresh or
    from the sign-in page, where the client has no token yet."""
    user = await auth_service.confirm_email(db, payload.email, payload.code)
    token = create_access_token(user.id, user.role)
    return TokenResponse(user=await auth_service.user_out_for(db, user), token=token)


@router.post("/resend-verification", response_model=ResendVerificationResponse)
async def resend_verification(
    payload: ResendVerificationRequest, db: AsyncSession = Depends(get_db)
) -> ResendVerificationResponse:
    code = await auth_service.resend_verification(db, payload.email)
    return ResendVerificationResponse(dev_verification_code=auth_service.dev_visible_code(code))


@router.post("/forgot-password", response_model=ResendVerificationResponse)
async def forgot_password(
    payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)
) -> ResendVerificationResponse:
    """Emails a 6-digit reset code. Always answers ok, whether or not the email has an account."""
    code = await auth_service.request_password_reset(db, payload.email)
    return ResendVerificationResponse(dev_verification_code=auth_service.dev_visible_code(code))


@router.post("/reset-password", response_model=OkResponse)
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)) -> OkResponse:
    await auth_service.reset_password(db, payload.email, payload.code, payload.new_password)
    return OkResponse(ok=True)


@router.post("/change-password", response_model=OkResponse)
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OkResponse:
    await auth_service.change_password(db, current_user, payload.current_password, payload.new_password)
    return OkResponse(ok=True)
