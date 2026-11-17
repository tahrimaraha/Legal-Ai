"""Password hashing, JWT issuance/verification, and auth dependencies."""
from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import EmailNotVerifiedError, ForbiddenError, UnauthorizedError, ValidationAppError
from app.database import get_db
from app.models.enums import UserRole
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], bcrypt__rounds=settings.bcrypt_rounds)
_bearer_scheme = HTTPBearer(auto_error=False)

TOKEN_TYPE = "access"

# An admin suspension is stored as a lock that never expires (see /admin/users/{id}/suspend).
SUSPENDED_UNTIL = datetime(9999, 12, 31, tzinfo=timezone.utc)


def is_suspended(user: User) -> bool:
    return user.locked_until is not None and user.locked_until.year >= 9000


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)


def hash_otp(code: str) -> str:
    return pwd_context.hash(code)


def verify_otp(code: str, code_hash: str) -> bool:
    return pwd_context.verify(code, code_hash)


def generate_otp(length: int | None = None) -> str:
    digits = length or settings.otp_length
    return "".join(str(secrets.randbelow(10)) for _ in range(digits))


def new_secret_token() -> tuple[str, str]:
    """A high-entropy single-use token for links / sessions: (raw value for the user, hash to store)."""
    raw = secrets.token_urlsafe(32)
    return raw, hash_secret_token(raw)


def hash_secret_token(raw: str) -> str:
    # SHA-256 is right for 256-bit random tokens (unlike passwords/OTPs they can't be brute-forced),
    # and it lets us look the token up by its hash.
    return "sha256$" + hashlib.sha256(raw.encode()).hexdigest()


def check_password_policy(password: str, email: str | None = None) -> None:
    """Server-side password rules (the website shows the same checklist)."""
    problems_en, problems_bn = [], []
    if len(password) < 8:
        problems_en.append("at least 8 characters")
        problems_bn.append("কমপক্ষে ৮ অক্ষর")
    if len(password) > 128:
        problems_en.append("at most 128 characters")
        problems_bn.append("সর্বোচ্চ ১২৮ অক্ষর")
    if not any(c.isalpha() for c in password):
        problems_en.append("a letter")
        problems_bn.append("একটি অক্ষর")
    if not any(c.isdigit() for c in password):
        problems_en.append("a number")
        problems_bn.append("একটি সংখ্যা")
    if email and password.strip().lower() == email.strip().lower():
        problems_en.append("something other than your email")
        problems_bn.append("ইমেইল থেকে আলাদা কিছু")
    if problems_en:
        raise ValidationAppError(
            "Password must contain " + ", ".join(problems_en) + ".",
            "পাসওয়ার্ডে থাকতে হবে: " + ", ".join(problems_bn) + "।",
            code="WEAK_PASSWORD",
        )


def create_access_token(user_id: uuid.UUID, role: UserRole) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role.value,
        "type": TOKEN_TYPE,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError as exc:
        raise UnauthorizedError(
            message_en="Your session has expired. Please sign in again.",
            message_bn="আপনার সেশনের মেয়াদ শেষ হয়ে গেছে। আবার সাইন ইন করুন।",
            code="TOKEN_EXPIRED",
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise UnauthorizedError(
            message_en="Invalid authentication token.",
            message_bn="অবৈধ প্রমাণীকরণ টোকেন।",
            code="INVALID_TOKEN",
        ) from exc

    if payload.get("type") != TOKEN_TYPE:
        raise UnauthorizedError(
            message_en="Invalid authentication token.",
            message_bn="অবৈধ প্রমাণীকরণ টোকেন।",
            code="INVALID_TOKEN",
        )
    return payload


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if credentials is None:
        raise UnauthorizedError()

    payload = decode_access_token(credentials.credentials)
    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError) as exc:
        raise UnauthorizedError(code="INVALID_TOKEN") from exc

    user = await db.scalar(select(User).where(User.id == user_id, User.deleted_at.is_(None)))
    if user is None:
        raise UnauthorizedError(
            message_en="This account no longer exists.",
            message_bn="এই অ্যাকাউন্টটি আর বিদ্যমান নেই।",
            code="USER_NOT_FOUND",
        )
    if is_suspended(user):
        raise UnauthorizedError(
            message_en="This account has been suspended.",
            message_bn="এই অ্যাকাউন্টটি স্থগিত করা হয়েছে।",
            code="ACCOUNT_SUSPENDED",
        )
    # Defence in depth: tokens are only issued after verification, but never trust that alone.
    if user.email_verified_at is None:
        raise EmailNotVerifiedError(
            "Please verify your email address to continue.",
            "চালিয়ে যেতে আপনার ইমেইল ঠিকানা যাচাই করুন।",
        )
    return user


def require_roles(*roles: UserRole):
    async def _dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise ForbiddenError()
        return current_user

    return _dependency
