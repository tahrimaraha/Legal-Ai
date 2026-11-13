"""Password hashing, JWT issuance/verification, and auth dependencies."""
from __future__ import annotations

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
from app.core.exceptions import ForbiddenError, UnauthorizedError
from app.database import get_db
from app.models.enums import LawyerApprovalStatus, UserRole
from app.models.profile import LawyerProfile
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], bcrypt__rounds=settings.bcrypt_rounds)
_bearer_scheme = HTTPBearer(auto_error=False)

TOKEN_TYPE = "access"


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
    return user


def require_roles(*roles: UserRole):
    async def _dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise ForbiddenError()
        return current_user

    return _dependency


async def require_approved_lawyer(
    current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db),
) -> User:
    """Lawyer-only endpoints stay closed until an admin approves the lawyer's credentials."""
    if current_user.role != UserRole.LAWYER:
        raise ForbiddenError()
    status = await db.scalar(
        select(LawyerProfile.approval_status).where(LawyerProfile.user_id == current_user.id)
    )
    if status != LawyerApprovalStatus.APPROVED:
        raise ForbiddenError(
            message_en="Your lawyer account is awaiting admin approval.",
            message_bn="আপনার আইনজীবী অ্যাকাউন্টটি অ্যাডমিন অনুমোদনের অপেক্ষায় আছে।",
            code="LAWYER_NOT_APPROVED",
        )
    return current_user
