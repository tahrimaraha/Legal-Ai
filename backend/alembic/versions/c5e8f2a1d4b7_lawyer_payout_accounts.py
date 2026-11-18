"""Lawyer payout wallet + manual payout records (method, receiver number).

Revision ID: c5e8f2a1d4b7
Revises: b3a7d1e5f9c2
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "c5e8f2a1d4b7"
down_revision: Union[str, None] = "b3a7d1e5f9c2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

payment_method = postgresql.ENUM(name="payment_method", create_type=False)


def upgrade() -> None:
    op.add_column("lawyer_profiles", sa.Column("payout_method", payment_method, nullable=True))
    op.add_column("payouts", sa.Column("method", payment_method, nullable=True))
    op.add_column("payouts", sa.Column("receiver_number", sa.String(32), nullable=True))
    op.create_index(
        "uq_payout_method_reference", "payouts", ["method", "external_reference"], unique=True,
        postgresql_where=sa.text("external_reference IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_payout_method_reference", table_name="payouts")
    op.drop_column("payouts", "receiver_number")
    op.drop_column("payouts", "method")
    op.drop_column("lawyer_profiles", "payout_method")
