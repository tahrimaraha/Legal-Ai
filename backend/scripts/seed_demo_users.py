"""Seed the admin account.

Idempotent — safe to run multiple times; existing emails are skipped. Run with:
    python -m scripts.seed_demo_users
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.security import hash_password
from app.database import AsyncSessionLocal
from app.models.enums import LawyerApprovalStatus, UserRole
from app.models.profile import CitizenProfile, LawyerProfile
from app.models.user import User

DEMO_PASSWORD = "demo-password-123"

DEMO_USERS = [
    {
        "email": "tahrima.jahan.raha@gmail.com",
        "full_name": "Tahrima Admin",
        "role": UserRole.ADMIN,
        "district": None,
    },
]


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        for spec in DEMO_USERS:
            existing = await db.scalar(select(User.id).where(User.email == spec["email"]))
            if existing is not None:
                print(f"skip (already exists): {spec['email']}")
                continue

            now = datetime.now(timezone.utc)
            user = User(
                email=spec["email"],
                password_hash=hash_password(DEMO_PASSWORD),
                role=spec["role"],
                full_name=spec["full_name"],
                is_active=True,
                email_verified_at=now,
            )
            db.add(user)
            await db.flush()

            if spec["role"] == UserRole.CITIZEN:
                db.add(CitizenProfile(user_id=user.id, district=spec["district"]))
            elif spec["role"] == UserRole.LAWYER:
                db.add(
                    LawyerProfile(
                        user_id=user.id,
                        bar_council_enrollment_no=spec["bar_council_enrollment_no"],
                        enrollment_year=2010,
                        district=spec["district"],
                        years_of_experience=15,
                        bio_bn="যাচাইকৃত ডেমো আইনজীবী অ্যাকাউন্ট।",
                        bio_en="Verified demo lawyer account.",
                        languages=["bn", "en"],
                        approval_status=LawyerApprovalStatus.APPROVED,
                    )
                )

            print(f"created: {spec['email']} / {DEMO_PASSWORD}")

        await db.commit()


if __name__ == "__main__":
    asyncio.run(seed())
