"""Request/response schemas for `/auth/*`."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import EmailStr, Field

from app.schemas.common import CamelModel, OkResponse  # noqa: F401  (OkResponse re-exported)


class RegisterCitizenRequest(CamelModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    phone: Optional[str] = None
    district: Optional[str] = None
    password: str = Field(min_length=8, max_length=128)


class RegisterLawyerRequest(CamelModel):
    full_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    phone: str
    district: str
    password: str = Field(min_length=8, max_length=128)
    bar_enrolment_no: str = Field(min_length=1, max_length=64)
    enrolment_year: int
    practice_areas: list[str] = Field(default_factory=list)
    starting_fee_bdt: float = Field(gt=0)
    bio: Optional[str] = None
    license_document_url: Optional[str] = None
    license_document_name: Optional[str] = None


class LoginRequest(CamelModel):
    email: EmailStr
    password: str


class ConfirmEmailRequest(CamelModel):
    email: EmailStr
    code: str = Field(min_length=1, max_length=16)


class ForgotPasswordRequest(CamelModel):
    email: EmailStr


class ResetPasswordRequest(CamelModel):
    email: EmailStr
    code: str = Field(min_length=1, max_length=16)
    new_password: str = Field(min_length=8, max_length=128)


class ChangePasswordRequest(CamelModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ResendVerificationRequest(CamelModel):
    email: EmailStr


class ResendVerificationResponse(CamelModel):
    ok: bool = True
    # Only populated in local development with the console email provider.
    dev_verification_code: Optional[str] = None


class VerifyEmailRequest(CamelModel):
    code: str = Field(min_length=1, max_length=16)


class UserOut(CamelModel):
    id: str
    email: Optional[str]
    name: str
    phone: Optional[str]
    district: Optional[str]
    role: str
    avatar_url: Optional[str]
    is_verified: bool
    created_at: datetime
    # Lawyers only: "pending" | "approved" | "rejected" | "suspended". The lawyer
    # portal is closed until "approved".
    lawyer_status: Optional[str] = None
    lawyer_rejection_reason: Optional[str] = None


class LawyerProfileOut(CamelModel):
    user_id: str
    bar_enrolment_no: str
    enrolment_year: Optional[int]
    district: Optional[str]
    practice_areas: list[str]
    starting_fee_bdt: Optional[float]
    bio: Optional[str]
    approval_status: str
    years_of_experience: Optional[int]


class TokenResponse(CamelModel):
    user: UserOut
    token: str


class RegisterResponse(TokenResponse):
    # Only populated in local development with the console email provider.
    dev_verification_code: Optional[str] = None


class LawyerRegisterResponse(CamelModel):
    user: UserOut
    lawyer_profile: LawyerProfileOut
    token: str
    dev_verification_code: Optional[str] = None
