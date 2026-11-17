"""Request/response schemas for `/auth/*`. JSON keys are camelCase to match the
frontend API contract; Python attributes stay snake_case."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class RegisterCitizenRequest(CamelModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    phone: Optional[str] = None
    district: Optional[str] = None
    password: str = Field(min_length=1, max_length=256)  # rules checked server-side with a clear message


class RegisterLawyerRequest(CamelModel):
    full_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    phone: str
    district: str
    password: str = Field(min_length=1, max_length=256)
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


class RegistrationPendingResponse(CamelModel):
    """Registration succeeded; the account works once the emailed link is opened."""
    status: str = "verification_required"
    email: str


class VerifyEmailLinkRequest(CamelModel):
    user_id: str = Field(min_length=1, max_length=64)
    token: str = Field(min_length=10, max_length=200)


class VerifyEmailLinkResponse(CamelModel):
    status: str  # "verified" | "already_verified"
    email: Optional[str]


class EmailOnlyRequest(CamelModel):
    email: EmailStr


class ResetCodeRequest(CamelModel):
    email: EmailStr
    code: str = Field(min_length=1, max_length=12)


class ResetCodeResponse(CamelModel):
    reset_token: str
    expires_in_minutes: int


class ResetPasswordRequest(CamelModel):
    reset_token: str = Field(min_length=10, max_length=200)
    new_password: str = Field(min_length=1, max_length=256)


class SessionRequest(CamelModel):
    user_id: str = Field(min_length=1, max_length=64)


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
    approval_status: Optional[str] = None  # For lawyers: 'pending', 'approved', 'rejected'


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


class LawyerRegisterResponse(CamelModel):
    user: UserOut
    lawyer_profile: LawyerProfileOut
    token: str


class OkResponse(CamelModel):
    ok: bool = True
