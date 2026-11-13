"""Make exactly the accounts in ADMIN_EMAILS the platform's admins.

Idempotent — safe to re-run after changing ADMIN_EMAILS. Run with:
    python -m scripts.set_admins

* An existing account with a listed email is promoted to ADMIN (password unchanged).
* A listed email with no account gets a new ADMIN account with a random temporary
  password, printed once — pass it on privately.
* The old demo admin (admin@legalai.bd) is deleted.
* Any other ADMIN not in the list is reported, never changed silently.
"""
from __future__ import annotations

import asyncio
import secrets
from datetime import datetime, timezone

from sqlalchemy import select

from app.config import settings
from app.core.security import hash_password
from app.database import AsyncSessionLocal
from app.models.enums import UserRole
from app.models.user import User

LEGACY_DEMO_ADMIN = "admin@legalai.bd"


def _display_name(email: str) -> str:
    return email.split("@", 1)[0].replace(".", " ").replace("_", " ").title()


async def main() -> None:
    admin_emails = settings.admin_email_list
    if not admin_emails:
        raise SystemExit("ADMIN_EMAILS is empty — set it in .env first.")

    now = datetime.now(timezone.utc)
    async with AsyncSessionLocal() as db:
        for email in admin_emails:
            user = await db.scalar(select(User).where(User.email == email, User.deleted_at.is_(None)))
            if user is None:
                temp_password = secrets.token_urlsafe(12)
                db.add(User(
                    email=email,
                    password_hash=hash_password(temp_password),
                    role=UserRole.ADMIN,
                    full_name=_display_name(email),
                    is_active=True,
                    email_verified_at=now,
                ))
                print(f"created admin  {email}  temporary password: {temp_password}")
                continue
            changed = []
            if user.role != UserRole.ADMIN:
                changed.append(f"role {user.role.value} -> ADMIN")
                user.role = UserRole.ADMIN
            if not user.is_active:
                changed.append("activated")
                user.is_active = True
                user.email_verified_at = user.email_verified_at or now
            if user.locked_until or user.failed_login_attempts:
                user.locked_until, user.failed_login_attempts = None, 0
            print(f"admin          {email}  ({', '.join(changed) or 'already admin'}; password unchanged)")

        demo = await db.scalar(select(User).where(User.email == LEGACY_DEMO_ADMIN))
        if demo is not None and LEGACY_DEMO_ADMIN not in admin_emails:
            await db.delete(demo)
            print(f"deleted        {LEGACY_DEMO_ADMIN} (demo admin)")

        await db.flush()
        others = (await db.scalars(select(User.email).where(
            User.role == UserRole.ADMIN, User.deleted_at.is_(None), User.email.notin_(admin_emails),
        ))).all()
        for email in others:
            print(f"WARNING        {email} is an ADMIN but not in ADMIN_EMAILS — review it manually.")

        await db.commit()


if __name__ == "__main__":
    asyncio.run(main())
