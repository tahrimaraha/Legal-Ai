"""`/lawyers` — the public directory, profiles and reviews; `PATCH /lawyers/me` for lawyers."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import require_approved_lawyer
from app.database import get_db
from app.models.user import User
from app.schemas.lawyers import (
    AvailabilityIn,
    AvailabilityOut,
    LawyerOut,
    LawyerReviewOut,
    LawyerUpdateRequest,
)
from app.schemas.payouts import MyEarningsOut, PayoutAccountIn, PayoutAccountOut
from app.services import lawyer_service, payout_service

router = APIRouter()


@router.get("", response_model=list[LawyerOut])
async def list_lawyers(
    area: Optional[str] = None, district: Optional[str] = None,
    max_fee: Optional[float] = None, db: AsyncSession = Depends(get_db),
) -> list[LawyerOut]:
    """Approved lawyers only; `verifiedOnly` from the contract is therefore implicit."""
    return await lawyer_service.list_lawyers(db, area=area, district=district, max_fee=max_fee)


@router.patch("/me", response_model=LawyerOut)
async def update_me(
    payload: LawyerUpdateRequest,
    user: User = Depends(require_approved_lawyer), db: AsyncSession = Depends(get_db),
) -> LawyerOut:
    return await lawyer_service.update_me(db, user, payload)


@router.get("/me/availability", response_model=AvailabilityOut)
async def get_availability(
    user: User = Depends(require_approved_lawyer), db: AsyncSession = Depends(get_db)
) -> AvailabilityOut:
    return await lawyer_service.get_availability(db, user)


@router.put("/me/availability", response_model=AvailabilityOut)
async def save_availability(
    payload: AvailabilityIn,
    user: User = Depends(require_approved_lawyer), db: AsyncSession = Depends(get_db),
) -> AvailabilityOut:
    return await lawyer_service.save_availability(db, user, payload)


@router.get("/me/payout-account", response_model=PayoutAccountOut)
async def get_payout_account(
    user: User = Depends(require_approved_lawyer), db: AsyncSession = Depends(get_db)
) -> PayoutAccountOut:
    return await payout_service.get_account(db, user)


@router.put("/me/payout-account", response_model=PayoutAccountOut)
async def set_payout_account(
    payload: PayoutAccountIn,
    user: User = Depends(require_approved_lawyer), db: AsyncSession = Depends(get_db),
) -> PayoutAccountOut:
    """The bKash / Nagad / Rocket number the admin sends this lawyer's earnings to."""
    return await payout_service.set_account(db, user, payload)


@router.get("/me/earnings", response_model=MyEarningsOut)
async def my_earnings(
    user: User = Depends(require_approved_lawyer), db: AsyncSession = Depends(get_db)
) -> MyEarningsOut:
    return await payout_service.my_earnings(db, user)


@router.get("/{lawyer_id}", response_model=LawyerOut)
async def get_lawyer(lawyer_id: str, db: AsyncSession = Depends(get_db)) -> LawyerOut:
    return await lawyer_service.get_lawyer(db, lawyer_id)


@router.get("/{lawyer_id}/reviews", response_model=list[LawyerReviewOut])
async def list_reviews(lawyer_id: str, db: AsyncSession = Depends(get_db)) -> list[LawyerReviewOut]:
    return await lawyer_service.list_reviews(db, lawyer_id)
