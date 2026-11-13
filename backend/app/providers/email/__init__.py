"""Minimal email provider used for OTP delivery.

Only the "console" provider (the default in Settings.email_provider) is
implemented: it logs the message via structlog instead of sending real mail.
That is sufficient for local/dev use — swap in a real SMTP/API-based
provider here once one is needed.
"""
from __future__ import annotations

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def send_email(to: str, subject: str, body: str) -> None:
    if settings.email_provider == "console":
        logger.info("email_dispatched", provider="console", to=to, subject=subject, body=body)
        return
    raise NotImplementedError(f"Email provider '{settings.email_provider}' is not implemented.")


def send_otp_email(to: str, code: str, purpose: str) -> None:
    logger.info("otp_issued", to=to, purpose=purpose, expires_in_minutes=settings.otp_ttl_minutes)
    if purpose == "RESET_PASSWORD":
        subject = "Your Legal AI password reset code"
        body = (
            f"Your password reset code is {code}. It expires in {settings.otp_ttl_minutes} minutes. "
            "If you didn't ask to reset your password, you can ignore this email."
        )
    else:
        subject = "Your Legal AI verification code"
        body = f"Your verification code is {code}. It expires in {settings.otp_ttl_minutes} minutes."
    send_email(to=to, subject=subject, body=body)
