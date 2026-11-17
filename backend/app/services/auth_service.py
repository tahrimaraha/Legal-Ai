"""Business logic behind `/auth/*`: registration, email verification, login sessions (access +
rotating refresh tokens), and password reset by emailed 6-digit code."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from slugify import slugify
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import (
    AccountLockedError,
    BarEnrolmentAlreadyRegisteredError,
    EmailAlreadyRegisteredError,
    EmailNotVerifiedError,
    InvalidCredentialsError,
    InvalidOtpError,
    OtpExpiredError,
    PhoneAlreadyRegisteredError,
    UnauthorizedError,
    ValidationAppError,
)
from app.core.security import (
    check_password_policy,
    generate_otp,
    hash_otp,
    hash_password,
    hash_secret_token,
    is_suspended,
    new_secret_token,
    verify_otp,
    verify_password,
)
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
from app.models.user import OtpCode, PasswordReset, RefreshToken, User
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


def _parse_data_url_metadata(data_url: str) -> tuple[str, int]:
    if data_url.startswith("data:") and ";base64," in data_url:
        header, payload = data_url.split(";base64,", 1)
        mime_type = header[len("data:") :] or "application/octet-stream"
        size_bytes = (len(payload) * 3) // 4
        return mime_type, size_bytes
    return "application/octet-stream", 0


async def register_citizen(db: AsyncSession, data: RegisterCitizenRequest) -> tuple[User, str]:
    """Create an unverified citizen; returns the user and the raw verification token to email."""
    email = data.email.strip().lower()
    check_password_policy(data.password, email)
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
        is_active=True,
        email_verified_at=None,  # set when the emailed link is opened
    )
    db.add(user)
    await db.flush()

    db.add(CitizenProfile(user_id=user.id, district=data.district))
    token = await issue_email_verification(db, user)

    await db.commit()
    await db.refresh(user)
    return user, token


async def register_lawyer(
    db: AsyncSession, data: RegisterLawyerRequest
) -> tuple[User, LawyerProfile, list[str], str]:
    email = data.email.strip().lower()
    check_password_policy(data.password, email)
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
        is_active=True,
        email_verified_at=None,  # set when the emailed link is opened
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
        mime_type, size_bytes = _parse_data_url_metadata(data.license_document_url)
        db.add(
            LawyerCredential(
                lawyer_id=user.id,
                doc_type=CredentialDocType.BAR_LICENSE,
                # No object storage backend is wired up yet — the upload is accepted and its
                # metadata recorded for the admin approval queue, but the bytes are not persisted.
                file_url="unstored://pending-storage-integration",
                original_filename=data.license_document_name or "bar_license",
                mime_type=mime_type,
                size_bytes=size_bytes,
                status=CredentialStatus.PENDING,
            )
        )

    token = await issue_email_verification(db, user)

    await db.commit()
    await db.refresh(user)
    await db.refresh(profile)
    return user, profile, [spec.name_en for spec in specializations], token


async def authenticate(db: AsyncSession, data: LoginRequest) -> User:
    email = data.email.strip().lower()
    user = await db.scalar(select(User).where(User.email == email, User.deleted_at.is_(None)))
    if user is None:
        raise InvalidCredentialsError()

    now = datetime.now(timezone.utc)
    if is_suspended(user):
        raise AccountLockedError(
            "This account has been suspended. Please contact support.",
            "এই অ্যাকাউন্টটি স্থগিত করা হয়েছে। সহায়তার জন্য যোগাযোগ করুন।",
        )
    if user.locked_until and user.locked_until > now:
        raise AccountLockedError()

    if not verify_password(data.password, user.password_hash):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= settings.rate_limit_login_attempts:
            user.locked_until = now + timedelta(minutes=settings.rate_limit_login_lockout_minutes)
        await db.commit()
        raise InvalidCredentialsError()

    if user.email_verified_at is None:
        # Correct password, so telling them to verify reveals nothing to an attacker.
        raise EmailNotVerifiedError(details={"email": user.email})
    if not user.is_active:
        raise AccountLockedError(
            "This account is disabled. Please contact support.",
            "এই অ্যাকাউন্টটি নিষ্ক্রিয়। সহায়তার জন্য যোগাযোগ করুন।",
        )

    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login_at = now
    await db.commit()
    await db.refresh(user)
    return user


# --- Email verification (single-use link) ------------------------------------------------

def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _retire_codes(db: AsyncSession, user_id, purpose: OtpPurpose) -> None:
    """Make every still-usable code of this kind unusable (only the newest one ever works)."""
    await db.execute(
        update(OtpCode)
        .where(OtpCode.user_id == user_id, OtpCode.purpose == purpose, OtpCode.consumed_at.is_(None))
        .values(consumed_at=_now())
    )


async def issue_email_verification(db: AsyncSession, user: User) -> str:
    """Create a fresh verification token (older links stop working); returns the raw token."""
    await _retire_codes(db, user.id, OtpPurpose.SIGNUP)
    raw, token_hash = new_secret_token()
    db.add(
        OtpCode(
            user_id=user.id,
            channel=OtpChannel.EMAIL,
            purpose=OtpPurpose.SIGNUP,
            code_hash=token_hash,
            expires_at=_now() + timedelta(hours=settings.email_verification_ttl_hours),
            max_attempts=1,
        )
    )
    return raw


def verification_link(user: User, raw_token: str) -> str:
    return f"{settings.frontend_url.rstrip('/')}/verify-email?uid={user.id}&token={raw_token}"


class VerificationLinkError(ValidationAppError):
    code = "VERIFICATION_LINK_INVALID"


async def confirm_email_verification(db: AsyncSession, user_id: str, raw_token: str) -> tuple[User, bool]:
    """Verify an email from its link. Returns (user, already_verified)."""
    invalid = VerificationLinkError(
        "This verification link is invalid. Request a new one below.",
        "এই যাচাই লিংকটি সঠিক নয়। নিচে থেকে নতুন লিংক চান।",
    )
    try:
        uid = uuid.UUID(user_id)
    except (ValueError, TypeError):
        raise invalid
    user = await db.scalar(select(User).where(User.id == uid, User.deleted_at.is_(None)))
    if user is None:
        raise invalid
    # The token must be genuinely theirs before we say anything about the account (user ids are
    # public, e.g. in lawyer profile URLs).
    otp = await db.scalar(
        select(OtpCode).where(
            OtpCode.user_id == user.id,
            OtpCode.purpose == OtpPurpose.SIGNUP,
            OtpCode.code_hash == hash_secret_token(raw_token),
        )
    )
    if otp is None:
        raise invalid
    if user.email_verified_at is not None:
        return user, True  # e.g. the link was opened twice
    if otp.consumed_at is not None:
        raise VerificationLinkError(
            "This link has already been used or replaced by a newer one. Request a new link below.",
            "এই লিংকটি আগেই ব্যবহৃত হয়েছে বা নতুন লিংক পাঠানো হয়েছে। নিচে থেকে নতুন লিংক চান।",
            code="VERIFICATION_LINK_USED",
        )
    if otp.expires_at < _now():
        raise VerificationLinkError(
            "This verification link has expired. Request a new one below.",
            "এই যাচাই লিংকের মেয়াদ শেষ। নিচে থেকে নতুন লিংক চান।",
            code="VERIFICATION_LINK_EXPIRED",
        )
    now = _now()
    otp.consumed_at = now
    user.email_verified_at = now
    user.is_active = True
    await _retire_codes(db, user.id, OtpPurpose.SIGNUP)
    await db.commit()
    await db.refresh(user)
    return user, False


async def find_unverified_user(db: AsyncSession, email: str) -> Optional[User]:
    user = await db.scalar(select(User).where(User.email == email.strip().lower(), User.deleted_at.is_(None)))
    if user is None or user.email_verified_at is not None or is_suspended(user):
        return None
    return user


# --- Password reset (6-digit emailed code → short-lived reset pass) -------------------------

_DUMMY_OTP_HASH = hash_otp("not-a-real-code")

async def start_password_reset(db: AsyncSession, email: str) -> Optional[tuple[User, str]]:
    """Issue a reset code if the account exists. Returns (user, code) or None — callers must answer
    the same way either way so the response never reveals whether an email is registered."""
    user = await db.scalar(select(User).where(User.email == email.strip().lower(), User.deleted_at.is_(None)))
    if user is None or is_suspended(user):
        return None
    await _retire_codes(db, user.id, OtpPurpose.RESET_PASSWORD)
    code = generate_otp(6)  # secrets-based, 000000–999999
    db.add(
        OtpCode(
            user_id=user.id,
            channel=OtpChannel.EMAIL,
            purpose=OtpPurpose.RESET_PASSWORD,
            code_hash=hash_otp(code),  # bcrypt — never stored in plain text
            expires_at=_now() + timedelta(minutes=settings.otp_ttl_minutes),
            max_attempts=settings.otp_max_attempts,
        )
    )
    await db.commit()
    return user, code


async def verify_password_reset_code(db: AsyncSession, email: str, code: str) -> str:
    """Check the code; on success burn it and return a single-use reset pass (raw token)."""
    generic = InvalidOtpError(
        "That code is invalid or has expired. Check the latest email or request a new code.",
        "কোডটি সঠিক নয় বা মেয়াদ শেষ। সর্বশেষ ইমেইল দেখুন বা নতুন কোড চান।",
    )
    code = (code or "").strip()
    user = await db.scalar(select(User).where(User.email == email.strip().lower(), User.deleted_at.is_(None)))
    otp = None
    if user is not None:
        otp = await db.scalar(
            select(OtpCode)
            .where(
                OtpCode.user_id == user.id,
                OtpCode.purpose == OtpPurpose.RESET_PASSWORD,
                OtpCode.consumed_at.is_(None),
            )
            .order_by(OtpCode.created_at.desc())
        )
    if user is None or otp is None or otp.expires_at < _now() or otp.attempt_count >= otp.max_attempts:
        verify_otp(code or "000000", _DUMMY_OTP_HASH)  # same bcrypt cost as a real check: no timing hint
        raise generic
    if not (len(code) == 6 and code.isdigit() and verify_otp(code, otp.code_hash)):
        otp.attempt_count += 1
        left = otp.max_attempts - otp.attempt_count
        if left <= 0:
            otp.consumed_at = _now()
        await db.commit()
        if left <= 0:
            raise OtpExpiredError(
                "Too many incorrect attempts. Please request a new code.",
                "অনেকবার ভুল কোড দেওয়া হয়েছে। নতুন কোড চান।",
            )
        raise InvalidOtpError(
            f"Incorrect code. {left} attempt{'s' if left != 1 else ''} left.",
            f"ভুল কোড। আর {left} বার চেষ্টা করতে পারবেন।",
            details={"attemptsLeft": left},
        )
    now = _now()
    otp.consumed_at = now
    # Proving control of the inbox also verifies the email.
    if user.email_verified_at is None:
        user.email_verified_at = now
        user.is_active = True
    await db.execute(
        update(PasswordReset)
        .where(PasswordReset.user_id == user.id, PasswordReset.consumed_at.is_(None))
        .values(consumed_at=now)
    )
    raw, token_hash = new_secret_token()
    db.add(
        PasswordReset(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=now + timedelta(minutes=settings.password_reset_grant_minutes),
        )
    )
    await db.commit()
    return raw


async def complete_password_reset(db: AsyncSession, raw_token: str, new_password: str) -> User:
    expired = ValidationAppError(
        "This reset session has expired or was already used. Please start again.",
        "রিসেট সেশনের মেয়াদ শেষ বা আগেই ব্যবহৃত হয়েছে। আবার শুরু করুন।",
        code="RESET_SESSION_EXPIRED",
    )
    grant = await db.scalar(select(PasswordReset).where(PasswordReset.token_hash == hash_secret_token(raw_token or "")))
    if grant is None or grant.consumed_at is not None or grant.expires_at < _now():
        raise expired
    user = await db.scalar(select(User).where(User.id == grant.user_id, User.deleted_at.is_(None)))
    if user is None or is_suspended(user):
        raise expired
    check_password_policy(new_password, user.email)
    now = _now()
    grant.consumed_at = now
    user.password_hash = hash_password(new_password)
    user.failed_login_attempts = 0
    user.locked_until = None
    await _retire_codes(db, user.id, OtpPurpose.RESET_PASSWORD)
    await revoke_all_sessions(db, user.id)  # sign out everywhere
    await db.commit()
    await db.refresh(user)
    return user


# --- Sessions: rotating refresh tokens ------------------------------------------------------

async def issue_refresh_token(db: AsyncSession, user: User, user_agent: Optional[str], ip: Optional[str]) -> str:
    raw, token_hash = new_secret_token()
    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=_now() + timedelta(days=settings.refresh_token_expire_days),
            user_agent=(user_agent or "")[:500] or None,
            ip=ip if ip and ip != "unknown" else None,
        )
    )
    await db.commit()
    return raw


async def rotate_refresh_token(
    db: AsyncSession, raw_token: str, user_id: str, user_agent: Optional[str], ip: Optional[str]
) -> tuple[User, str]:
    """Swap a refresh token for a new one. A revoked token being replayed means it leaked, so the
    whole family is revoked."""
    denied = UnauthorizedError(
        message_en="Your session has ended. Please sign in again.",
        message_bn="আপনার সেশন শেষ হয়েছে। আবার সাইন ইন করুন।",
        code="SESSION_ENDED",
    )
    rec = await db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_secret_token(raw_token or "")))
    if rec is None or str(rec.user_id) != str(user_id):
        raise denied
    if rec.revoked_at is not None:
        # Two tabs refreshing at once replay the just-rotated token: allow a short grace period
        # (the caller retries with the new cookie). An older replay means the token leaked.
        if rec.revoked_at < _now() - timedelta(seconds=60):
            await revoke_all_sessions(db, rec.user_id)
            await db.commit()
        raise denied
    if rec.expires_at < _now():
        raise denied
    user = await db.scalar(select(User).where(User.id == rec.user_id, User.deleted_at.is_(None)))
    if user is None or is_suspended(user) or user.email_verified_at is None:
        raise denied
    rec.revoked_at = _now()
    new_raw = await issue_refresh_token(db, user, user_agent, ip)  # commits both changes
    return user, new_raw


async def revoke_refresh_token(db: AsyncSession, raw_token: str) -> None:
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.token_hash == hash_secret_token(raw_token or ""), RefreshToken.revoked_at.is_(None))
        .values(revoked_at=_now())
    )
    await db.commit()


async def revoke_all_sessions(db: AsyncSession, user_id) -> None:
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=_now())
    )


async def get_district_for_user(db: AsyncSession, user: User) -> Optional[str]:
    if user.role == UserRole.CITIZEN:
        return await db.scalar(select(CitizenProfile.district).where(CitizenProfile.user_id == user.id))
    if user.role == UserRole.LAWYER:
        return await db.scalar(select(LawyerProfile.district).where(LawyerProfile.user_id == user.id))
    return None


def to_user_out(user: User, district: Optional[str] = None, approval_status: Optional[str] = None) -> UserOut:
    return UserOut(
        id=str(user.id),
        email=user.email,
        name=user.full_name,
        phone=user.phone,
        district=district,
        role=user.role.value.lower(),
        avatar_url=user.avatar_url,
        is_verified=user.email_verified_at is not None,
        created_at=user.created_at,
        approval_status=approval_status,
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
