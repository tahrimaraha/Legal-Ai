"""Create (or reset the password of) an admin account — for a fresh server.

    docker compose exec api python -m scripts.create_admin you@example.com "Your Name"

Asks for the password (not shown, not stored in shell history). The account is created as verified.
"""
from __future__ import annotations

import asyncio
import getpass
import sys
from datetime import datetime, timezone

from email_validator import EmailNotValidError, validate_email
from sqlalchemy import select

from app.core.security import check_password_policy, hash_password
from app.database import AsyncSessionLocal
from app.models.enums import UserRole
from app.models.user import User


async def main(email: str, name: str) -> None:
    try:  # same check the sign-in form uses, so the admin can actually log in
        email = validate_email(email.strip(), check_deliverability=False).normalized.lower()
    except EmailNotValidError as exc:
        raise SystemExit(f"Invalid email: {exc}")
    pw = getpass.getpass("New admin password: ")
    if pw != getpass.getpass("Repeat password: "):
        raise SystemExit("Passwords do not match.")
    check_password_policy(pw, email)  # 8+ chars, a letter and a digit, not the email
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        now = datetime.now(timezone.utc)
        if user:
            user.password_hash = hash_password(pw)
            user.role = UserRole.ADMIN
            user.is_active = True
            user.email_verified_at = user.email_verified_at or now
            action = "updated"
        else:
            db.add(User(email=email, full_name=name, password_hash=hash_password(pw), role=UserRole.ADMIN,
                        is_active=True, email_verified_at=now))
            action = "created"
        await db.commit()
    print(f"Admin {action}: {email}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit('Usage: python -m scripts.create_admin EMAIL "Full Name"')
    asyncio.run(main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "Administrator"))
