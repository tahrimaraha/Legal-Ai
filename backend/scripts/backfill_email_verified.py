"""One-time: mark accounts created before email verification existed as verified.

Before this change, sign-up auto-activated every account without checking the email. Those active
accounts are trusted as-is (their verified time = account creation) so nobody is locked out.
Accounts that were never activated stay unverified and can request a new verification link.

Usage:  .venv/bin/python scripts/backfill_email_verified.py [--dry-run]
"""
import asyncio
import sys

from sqlalchemy import update

sys.path.insert(0, ".")
from app.database import AsyncSessionLocal  # noqa: E402
from app.models.user import User  # noqa: E402


async def main(dry_run: bool) -> None:
    async with AsyncSessionLocal() as db:
        stmt = (
            update(User)
            .where(User.email_verified_at.is_(None), User.is_active.is_(True), User.deleted_at.is_(None))
            .values(email_verified_at=User.created_at)
            .returning(User.email)
        )
        emails = (await db.execute(stmt)).scalars().all()
        if dry_run:
            await db.rollback()
        else:
            await db.commit()
        print(("Would mark" if dry_run else "Marked"), len(emails), "existing account(s) as verified:", emails)


if __name__ == "__main__":
    asyncio.run(main("--dry-run" in sys.argv))
