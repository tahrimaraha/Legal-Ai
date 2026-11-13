"""Business logic behind `/auth/*`: registration, login, and email verification."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from slugify import slugify
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import (
    AccountLockedError,
    BarEnrolmentAlreadyRegisteredError,
    EmailAlreadyRegisteredError,
    AlreadyVerifiedError,
    EmailNotVerifiedError,
    InvalidCredentialsError,
    InvalidOtpError,
    OtpExpiredError,
    PhoneAlreadyRegisteredError,
    RateLimitedError,
    SamePasswordError,
    WrongPasswordError,
)
from app.core.security import generate_otp, hash_otp, hash_password, verify_otp, verify_password
from app.models.enums import (
    ConsultationMode,
    CredentialDocType,
    CredentialStatus,
    LawyerApprovalStatus,
    OtpChannel,
    OtpPurpose,
    UserRole,
)
from app.models.profile import (
    CitizenProfile,
    LawyerCredential,
    LawyerFee,
    LawyerProfile,
    LawyerSpecialization,
    Specialization,
)
from app.models.user import OtpCode, User
from app.providers.email import send_otp_email
from app.providers.storage import save_data_url
from app.schemas.auth import (
    LawyerProfileOut,
    LoginRequest,
    RegisterCitizenRequest,
    RegisterLawyerRequest,
    UserOut,
)


async def _ensure_email_available(db: AsyncSession, email: str) -> None:
    existing = await db.scalar(select(User.id).where(User.email == email))
    if existing is not None:
        raise EmailAlreadyRegisteredError()


async def _ensure_phone_available(db: AsyncSession, phone: str) -> None:
    existing = await db.scalar(select(User.id).where(User.phone == phone))
    if existing is not None:
        raise PhoneAlreadyRegisteredError()


def dev_visible_code(code: Optional[str]) -> Optional[str]:
    """In local dev no real email is sent (console provider), so the code is
    handed back to the client to display. Never exposed in other environments."""
    if code and settings.app_env == "development" and settings.email_provider == "console":
        return code
    return None


async def _otps_in_window(db: AsyncSession, user: User, purpose: OtpPurpose = OtpPurpose.SIGNUP) -> int:
    since = datetime.now(timezone.utc) - timedelta(minutes=settings.otp_resend_window_minutes)
    count = await db.scalar(
        select(func.count(OtpCode.id)).where(
            OtpCode.user_id == user.id,
            OtpCode.purpose == purpose,
            OtpCode.created_at >= since,
        )
    )
    return count or 0


async def _signup_otps_in_window(db: AsyncSession, user: User) -> int:
    return await _otps_in_window(db, user, OtpPurpose.SIGNUP)


async def _issue_signup_otp(db: AsyncSession, user: User) -> str:
    return await _issue_otp(db, user, OtpPurpose.SIGNUP)


async def _issue_otp(db: AsyncSession, user: User, purpose: OtpPurpose) -> str:
    """Creates a fresh OTP for `purpose` (older unconsumed ones are superseded, since
    checks always use the newest) and emails it. Returns the code."""
    code = generate_otp()
    otp = OtpCode(
        user_id=user.id,
        channel=OtpChannel.EMAIL,
        purpose=purpose,
        code_hash=hash_otp(code),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.otp_ttl_minutes),
        max_attempts=settings.otp_max_attempts,
    )
    db.add(otp)
    if user.email:
        send_otp_email(user.email, code, purpose=purpose.value)
    return code


async def _get_or_create_specializations(db: AsyncSession, area_names: list[str]) -> list[Specialization]:
    specializations: list[Specialization] = []
    seen_slugs: set[str] = set()
    for name in area_names:
        slug = slugify(name)
        if not slug or slug in seen_slugs:
            continue
        seen_slugs.add(slug)
        spec = await db.scalar(select(Specialization).where(Specialization.slug == slug))
        if spec is None:
            spec = Specialization(slug=slug, name_en=name, name_bn=name)
            db.add(spec)
            await db.flush()
        specializations.append(spec)
    return specializations


async def register_citizen(db: AsyncSession, data: RegisterCitizenRequest) -> tuple[User, str]:
    email = data.email.strip().lower()
    await _ensure_email_available(db, email)
    phone = data.phone.strip() if data.phone else None
    if phone:
        await _ensure_phone_available(db, phone)

    user = User(
        email=email,
        phone=phone,
        password_hash=hash_password(data.password),
        role=UserRole.CITIZEN,
        full_name=data.name.strip(),
        is_active=False,
    )
    db.add(user)
    await db.flush()

    db.add(CitizenProfile(user_id=user.id, district=data.district))
    code = await _issue_signup_otp(db, user)

    await db.commit()
    await db.refresh(user)
    return user, code


async def register_lawyer(
    db: AsyncSession, data: RegisterLawyerRequest
) -> tuple[User, LawyerProfile, list[str], str]:
    email = data.email.strip().lower()
    await _ensure_email_available(db, email)
    phone = data.phone.strip()
    await _ensure_phone_available(db, phone)

    existing_bar = await db.scalar(
        select(LawyerProfile.user_id).where(
            LawyerProfile.bar_council_enrollment_no == data.bar_enrolment_no
        )
    )
    if existing_bar is not None:
        raise BarEnrolmentAlreadyRegisteredError()

    user = User(
        email=email,
        phone=phone,
        password_hash=hash_password(data.password),
        role=UserRole.LAWYER,
        full_name=data.full_name.strip(),
        is_active=False,
    )
    db.add(user)
    await db.flush()

    current_year = datetime.now(timezone.utc).year
    years_of_experience = max(1, current_year - data.enrolment_year)

    profile = LawyerProfile(
        user_id=user.id,
        bar_council_enrollment_no=data.bar_enrolment_no,
        enrollment_year=data.enrolment_year,
        district=data.district,
        years_of_experience=years_of_experience,
        bio_bn=data.bio,
        bio_en=data.bio,
        languages=["bn", "en"],
        approval_status=LawyerApprovalStatus.PENDING,
    )
    db.add(profile)
    await db.flush()

    specializations = await _get_or_create_specializations(db, data.practice_areas)
    for spec in specializations:
        db.add(LawyerSpecialization(lawyer_id=user.id, specialization_id=spec.id))

    db.add(
        LawyerFee(
            lawyer_id=user.id,
            mode=ConsultationMode.CHAT,
            amount=Decimal(str(data.starting_fee_bdt)),
            currency="BDT",
            duration_minutes=20,
        )
    )

    if data.license_document_url:
        filename = data.license_document_name or "bar_license"
        file_url, mime_type, size_bytes = save_data_url("licenses", filename, data.license_document_url)
        db.add(
            LawyerCredential(
                lawyer_id=user.id,
                doc_type=CredentialDocType.BAR_LICENSE,
                file_url=file_url,
                original_filename=filename,
                mime_type=mime_type,
                size_bytes=size_bytes,
                status=CredentialStatus.PENDING,
            )
        )

    code = await _issue_signup_otp(db, user)

    await db.commit()
    await db.refresh(user)
    await db.refresh(profile)
    return user, profile, [spec.name_en for spec in specializations], code


async def authenticate(db: AsyncSession, data: LoginRequest) -> User:
    email = data.email.strip().lower()
    user = await db.scalar(select(User).where(User.email == email, User.deleted_at.is_(None)))
    if user is None:
        raise InvalidCredentialsError()

    now = datetime.now(timezone.utc)
    if user.locked_until and user.locked_until > now:
        raise AccountLockedError()

    if not verify_password(data.password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= settings.rate_limit_login_attempts:
            user.locked_until = now + timedelta(minutes=settings.rate_limit_login_lockout_minutes)
        await db.commit()
        raise InvalidCredentialsError()

    if not user.is_active:
        # The password was right, so send a fresh code (within the resend limit)
        # and tell the client where to go to finish verification.
        code: Optional[str] = None
        if await _signup_otps_in_window(db, user) < settings.otp_resend_limit_per_window:
            code = await _issue_signup_otp(db, user)
        user.failed_login_attempts = 0
        await db.commit()
        details: dict = {"email": user.email}
        if dev_visible_code(code):
            details["devVerificationCode"] = code
        raise EmailNotVerifiedError(details=details)

    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = now
    await db.commit()
    await db.refresh(user)
    return user


async def resend_verification(db: AsyncSession, email: str) -> Optional[str]:
    """Issues a new signup code. Silently does nothing for unknown or already
    verified emails so the endpoint can't be used to probe for accounts."""
    email = email.strip().lower()
    user = await db.scalar(select(User).where(User.email == email, User.deleted_at.is_(None)))
    if user is None or user.is_active:
        return None
    if await _signup_otps_in_window(db, user) >= settings.otp_resend_limit_per_window:
        raise RateLimitedError(
            message_en=f"Too many codes requested. Please wait {settings.otp_resend_window_minutes} minutes and try again.",
            message_bn=f"অনেকবার কোড চাওয়া হয়েছে। {settings.otp_resend_window_minutes} মিনিট পর আবার চেষ্টা করুন।",
        )
    code = await _issue_signup_otp(db, user)
    await db.commit()
    return code


async def confirm_email(db: AsyncSession, email: str, code: str) -> User:
    """Verifies by email + code (no token needed) and returns the now-active user."""
    email = email.strip().lower()
    user = await db.scalar(select(User).where(User.email == email, User.deleted_at.is_(None)))
    if user is None:
        raise InvalidOtpError()
    if user.is_active:
        raise AlreadyVerifiedError()
    await verify_email(db, user, code)
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)
    return user


async def _consume_otp(db: AsyncSession, user: User, purpose: OtpPurpose, code: str) -> datetime:
    """Checks `code` against the user's newest unconsumed OTP for `purpose` and marks
    it used. Wrong guesses count toward its attempt limit. Returns the time used."""
    otp = await db.scalar(
        select(OtpCode)
        .where(OtpCode.user_id == user.id, OtpCode.purpose == purpose, OtpCode.consumed_at.is_(None))
        .order_by(OtpCode.created_at.desc())
    )
    if otp is None:
        raise InvalidOtpError()

    now = datetime.now(timezone.utc)
    if otp.expires_at < now or otp.attempt_count >= otp.max_attempts:
        raise OtpExpiredError()

    if not verify_otp(code.strip(), otp.code_hash):
        otp.attempt_count += 1
        await db.commit()
        raise InvalidOtpError()

    otp.consumed_at = now
    return now


async def request_password_reset(db: AsyncSession, email: str) -> Optional[str]:
    """Emails a reset code. Silently does nothing for unknown emails so the endpoint
    can't be used to find out who has an account. Returns the code (for dev display)."""
    email = email.strip().lower()
    user = await db.scalar(select(User).where(User.email == email, User.deleted_at.is_(None)))
    if user is None:
        return None
    if await _otps_in_window(db, user, OtpPurpose.RESET_PASSWORD) >= settings.otp_resend_limit_per_window:
        raise RateLimitedError(
            message_en=f"Too many reset codes requested. Please wait {settings.otp_resend_window_minutes} minutes and try again.",
            message_bn=f"অনেকবার রিসেট কোড চাওয়া হয়েছে। {settings.otp_resend_window_minutes} মিনিট পর আবার চেষ্টা করুন।",
        )
    code = await _issue_otp(db, user, OtpPurpose.RESET_PASSWORD)
    await db.commit()
    return code


async def reset_password(db: AsyncSession, email: str, code: str, new_password: str) -> None:
    email = email.strip().lower()
    user = await db.scalar(select(User).where(User.email == email, User.deleted_at.is_(None)))
    if user is None:
        raise InvalidOtpError()
    now = await _consume_otp(db, user, OtpPurpose.RESET_PASSWORD, code)
    user.password_hash = hash_password(new_password)
    user.failed_login_attempts = 0
    user.locked_until = None
    # The code reached their inbox, which also proves they own the email.
    if not user.is_active:
        user.is_active = True
        user.email_verified_at = user.email_verified_at or now
    await db.commit()


async def change_password(db: AsyncSession, user: User, current_password: str, new_password: str) -> None:
    if not verify_password(current_password, user.password_hash):
        raise WrongPasswordError()
    if current_password == new_password:
        raise SamePasswordError()
    user.password_hash = hash_password(new_password)
    await db.commit()


async def verify_email(db: AsyncSession, user: User, code: str) -> None:
    now = await _consume_otp(db, user, OtpPurpose.SIGNUP, code)
    user.is_active = True
    user.email_verified_at = now
    await db.commit()


async def get_district_for_user(db: AsyncSession, user: User) -> Optional[str]:
    if user.role == UserRole.CITIZEN:
        return await db.scalar(select(CitizenProfile.district).where(CitizenProfile.user_id == user.id))
    if user.role == UserRole.LAWYER:
        return await db.scalar(select(LawyerProfile.district).where(LawyerProfile.user_id == user.id))
    return None


def lawyer_status_out(status: LawyerApprovalStatus) -> str:
    """DRAFT / PENDING / UNDER_REVIEW all read as "pending" to the client."""
    if status == LawyerApprovalStatus.APPROVED:
        return "approved"
    if status == LawyerApprovalStatus.REJECTED:
        return "rejected"
    if status == LawyerApprovalStatus.SUSPENDED:
        return "suspended"
    return "pending"


async def user_out_for(db: AsyncSession, user: User) -> UserOut:
    """UserOut with district and, for lawyers, the current approval status."""
    if user.role == UserRole.LAWYER:
        profile = await db.get(LawyerProfile, user.id)
        if profile is not None:
            status = lawyer_status_out(profile.approval_status)
            return to_user_out(
                user, district=profile.district, lawyer_status=status,
                lawyer_rejection_reason=profile.rejection_reason if status == "rejected" else None,
            )
    return to_user_out(user, district=await get_district_for_user(db, user))


def to_user_out(
    user: User, district: Optional[str] = None,
    lawyer_status: Optional[str] = None, lawyer_rejection_reason: Optional[str] = None,
) -> UserOut:
    return UserOut(
        id=str(user.id),
        email=user.email,
        name=user.full_name,
        phone=user.phone,
        district=district,
        role=user.role.value.lower(),
        avatar_url=user.avatar_url,
        is_verified=user.is_active,
        created_at=user.created_at,
        lawyer_status=lawyer_status,
        lawyer_rejection_reason=lawyer_rejection_reason,
    )


def to_lawyer_profile_out(
    profile: LawyerProfile, practice_areas: list[str], starting_fee_bdt: float
) -> LawyerProfileOut:
    return LawyerProfileOut(
        user_id=str(profile.user_id),
        bar_enrolment_no=profile.bar_council_enrollment_no,
        enrolment_year=profile.enrollment_year,
        district=profile.district,
        practice_areas=practice_areas,
        starting_fee_bdt=starting_fee_bdt,
        bio=profile.bio_en,
        approval_status=profile.approval_status.value.lower(),
        years_of_experience=profile.years_of_experience,
    )
