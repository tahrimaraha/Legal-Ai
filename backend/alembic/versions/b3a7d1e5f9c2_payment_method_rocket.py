"""Add ROCKET to payment_method for manual wallet payments.

Revision ID: b3a7d1e5f9c2
Revises: 9e4f6a2b3c21
"""
from typing import Sequence, Union

from alembic import op

revision: str = "b3a7d1e5f9c2"
down_revision: Union[str, None] = "9e4f6a2b3c21"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'ROCKET'")


def downgrade() -> None:
    # Postgres can't drop a single enum value; leaving ROCKET in place is harmless.
    pass
