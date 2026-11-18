"""Outgoing email.

Providers (``EMAIL_PROVIDER``):
  * ``smtp``    — real delivery through any SMTP server (Gmail, Outlook, SendGrid, Brevo, Mailgun …).
  * ``brevo``   — real delivery through Brevo's HTTPS API (port 443). Use it on hosts that block SMTP ports
                  (e.g. Hugging Face Spaces). Needs ``BREVO_API_KEY`` and a verified ``SMTP_FROM_EMAIL``.
  * ``console`` — development only: logs the message and writes it to ``DEV_MAIL_OUTBOX`` as a
                  ``.eml`` file you can open in any mail app. Refused when ``APP_ENV=production``.

Sending is blocking I/O, so callers use :func:`deliver` (runs in a worker thread) — usually from a
FastAPI background task so the HTTP response never waits on, or leaks timing from, the mail server.
"""
from __future__ import annotations

import asyncio
import smtplib
import ssl
import time
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from pathlib import Path

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def _build(to: str, subject: str, text: str, html: str | None) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = formataddr((settings.smtp_from_name, settings.smtp_from_email))
    msg["To"] = to
    msg["Subject"] = subject
    msg["Message-ID"] = make_msgid(domain=settings.smtp_from_email.split("@")[-1] or "legalai.local")
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")
    return msg


def _send_smtp(msg: EmailMessage) -> None:
    if not settings.smtp_host:
        raise RuntimeError("EMAIL_PROVIDER=smtp but SMTP_HOST is empty.")
    context = ssl.create_default_context()
    if settings.smtp_port == 465:  # implicit TLS
        server: smtplib.SMTP = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=20, context=context)
    else:
        server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20)
    with server:
        server.ehlo()
        if settings.smtp_port != 465 and settings.smtp_use_tls:
            server.starttls(context=context)
            server.ehlo()
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.send_message(msg)


BREVO_URL = "https://api.brevo.com/v3/smtp/email"


def _log_subject(subject: str) -> str:
    """Subjects can carry one-time codes ("123456 is your … code") — never write those to logs."""
    import re

    return re.sub(r"\d{4,}", "######", subject)


def _send_brevo(to: str, subject: str, text: str, html: str | None) -> None:
    import httpx

    if not settings.brevo_api_key:
        raise RuntimeError("EMAIL_PROVIDER=brevo but BREVO_API_KEY is empty.")
    payload = {
        "sender": {"name": settings.smtp_from_name, "email": settings.smtp_from_email},
        "to": [{"email": to}],
        "subject": subject,
        "textContent": text,
    }
    if html:
        payload["htmlContent"] = html
    r = httpx.post(BREVO_URL, json=payload, timeout=20,
                   headers={"api-key": settings.brevo_api_key, "accept": "application/json"})
    if r.status_code >= 300:
        raise RuntimeError(f"Brevo API error {r.status_code}: {r.text[:300]}")


def _send_console(msg: EmailMessage) -> Path:
    if settings.app_env.lower() == "production":
        raise RuntimeError("EMAIL_PROVIDER=console is for development only; configure SMTP for production.")
    outbox = Path(settings.dev_mail_outbox)
    outbox.mkdir(parents=True, exist_ok=True)
    safe_to = "".join(c if c.isalnum() or c in "@._-" else "_" for c in str(msg["To"]))
    path = outbox / f"{time.strftime('%Y%m%d-%H%M%S')}-{time.time_ns() % 1_000_000:06d}-{safe_to}.eml"
    path.write_bytes(bytes(msg))
    return path


def send_email(to: str, subject: str, text: str, html: str | None = None) -> None:
    """Send one email synchronously. Raises on failure."""
    msg = _build(to, subject, text, html)
    provider = settings.email_provider.lower()
    if provider == "smtp":
        _send_smtp(msg)
        logger.info("email_sent", provider="smtp", to=to, subject=_log_subject(subject))
    elif provider == "brevo":
        _send_brevo(to, subject, text, html)
        logger.info("email_sent", provider="brevo", to=to, subject=_log_subject(subject))
    elif provider == "console":
        path = _send_console(msg)
        logger.info("email_written_to_outbox", provider="console", to=to, subject=_log_subject(subject), file=str(path))
    else:
        raise RuntimeError(f"Unknown EMAIL_PROVIDER '{settings.email_provider}'. Use 'smtp', 'brevo' or 'console'.")


async def deliver(to: str, subject: str, text: str, html: str | None = None) -> bool:
    """Send without blocking the event loop. Never raises: failures are logged (the user can resend)."""
    try:
        await asyncio.to_thread(send_email, to, subject, text, html)
        return True
    except Exception as exc:  # noqa: BLE001 - a mail outage must not crash the request
        logger.error("email_send_failed", to=to, subject=_log_subject(subject), error=f"{type(exc).__name__}: {exc}")
        return False
