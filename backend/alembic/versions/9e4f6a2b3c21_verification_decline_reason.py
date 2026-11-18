"""verification decline reason

Revision ID: 9e4f6a2b3c21
Revises: 7c1d2e9a4b10
Create Date: 2026-11-03 15:00:00.000000

An admin can decline a verification request before any lawyer is assigned,
so the reason can't live on `verification_assignments.decline_reason`.
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "9e4f6a2b3c21"
down_revision: Union[str, None] = "7c1d2e9a4b10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("verification_requests", sa.Column("decline_reason", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("verification_requests", "decline_reason")
