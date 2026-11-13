"""frontend contract fields

Revision ID: 7c1d2e9a4b10
Revises: 54ff3b2e3c35
Create Date: 2026-11-03 14:00:00.000000

Adds the columns the frontend API contract (frontend/docs/api-contract.md)
needs but the initial schema did not carry: bilingual display fields,
statute metadata, JSONB snapshots of slots/timelines/citations, and a
NEEDS_CORRECTION verdict so all four frontend verdict types round-trip.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7c1d2e9a4b10"
down_revision: Union[str, None] = "54ff3b2e3c35"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _text_array(name: str) -> sa.Column:
    return sa.Column(name, postgresql.ARRAY(sa.Text()), nullable=False, server_default="{}")


def _jsonb_list(name: str) -> sa.Column:
    return sa.Column(name, postgresql.JSONB(), nullable=False, server_default="[]")


# (table, column) pairs, in the order they are added; downgrade drops them in reverse.
NEW_COLUMNS: list[tuple[str, sa.Column]] = [
    # --- corpus ---
    ("acts", sa.Column("slug", sa.String(120), nullable=True)),
    ("acts", sa.Column("description_bn", sa.Text(), nullable=True)),
    ("acts", sa.Column("description_en", sa.Text(), nullable=True)),
    ("acts", _text_array("topics")),
    ("acts", _text_array("topics_bn")),
    ("acts", sa.Column("status", sa.String(20), nullable=False, server_default="live")),
    ("acts", sa.Column("section_count", sa.Integer(), nullable=False, server_default="0")),
    ("acts", sa.Column("last_reviewed", sa.Date(), nullable=True)),
    ("acts", sa.Column("amendment_notice_bn", sa.Text(), nullable=True)),
    ("acts", sa.Column("amendment_notice_en", sa.Text(), nullable=True)),
    ("sections", sa.Column("plain_meaning_bn", sa.Text(), nullable=True)),
    ("sections", sa.Column("plain_meaning_en", sa.Text(), nullable=True)),
    ("corpus_documents", sa.Column("size_bytes", sa.BigInteger(), nullable=False, server_default="0")),
    ("corpus_documents", sa.Column("chunk_count", sa.Integer(), nullable=False, server_default="0")),
    ("corpus_documents", sa.Column("indexed_at", sa.DateTime(timezone=True), nullable=True)),
    ("glossary_terms", sa.Column("section_ref", sa.String(80), nullable=True)),
    ("glossary_terms", sa.Column("example_bn", sa.Text(), nullable=True)),
    ("glossary_terms", sa.Column("example_en", sa.Text(), nullable=True)),
    # --- chat ---
    ("messages", sa.Column("body_bn", sa.Text(), nullable=True)),
    ("messages", sa.Column("body_en", sa.Text(), nullable=True)),
    ("message_citations", sa.Column("quoted_span_en", sa.Text(), nullable=True)),
    # --- lawyer profile ---
    ("lawyer_profiles", sa.Column("full_name_bn", sa.String(255), nullable=True)),
    ("lawyer_profiles", sa.Column("title_en", sa.String(255), nullable=True)),
    ("lawyer_profiles", sa.Column("title_bn", sa.String(255), nullable=True)),
    ("lawyer_profiles", sa.Column("district_bn", sa.String(100), nullable=True)),
    ("lawyer_profiles", _text_array("courts")),
    ("lawyer_profiles", _text_array("courts_bn")),
    ("lawyer_profiles", _text_array("education")),
    ("lawyer_profiles", _text_array("education_bn")),
    ("lawyer_profiles", sa.Column("response_time_en", sa.String(120), nullable=True)),
    ("lawyer_profiles", sa.Column("response_time_bn", sa.String(120), nullable=True)),
    ("lawyer_profiles", sa.Column("is_available_today", sa.Boolean(), nullable=False, server_default=sa.true())),
    ("lawyer_profiles", sa.Column("away_notice", sa.Text(), nullable=True)),
    # --- verification ---
    ("verification_requests", sa.Column("question_excerpt_en", sa.Text(), nullable=True)),
    ("verification_requests", sa.Column("answer_excerpt_bn", sa.Text(), nullable=True)),
    ("verification_requests", sa.Column("answer_excerpt_en", sa.Text(), nullable=True)),
    ("verification_requests", _jsonb_list("citations_snapshot")),
    ("verification_assignments", sa.Column("payment_processed", sa.Boolean(), nullable=False, server_default=sa.false())),
    ("verification_verdicts", sa.Column("corrected_statement_en", sa.Text(), nullable=True)),
    ("verification_verdicts", _text_array("added_citations")),
    ("verification_verdicts", _text_array("disputed_citations")),
    ("verification_verdicts", sa.Column("minutes_spent", sa.Integer(), nullable=False, server_default="0")),
    # --- consultations & messaging ---
    ("consultations", _jsonb_list("preferred_slots")),
    ("consultations", _jsonb_list("attachments")),
    ("consultations", _jsonb_list("timeline")),
    ("consultations", sa.Column("lawyer_private_notes", sa.Text(), nullable=True)),
    ("consultations", sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True)),
    ("consultations", sa.Column("payment_processed", sa.Boolean(), nullable=False, server_default=sa.false())),
    ("message_threads", sa.Column("context_title_bn", sa.String(255), nullable=True)),
    ("message_threads", sa.Column("context_title_en", sa.String(255), nullable=True)),
    ("video_meetings", sa.Column("title", sa.String(255), nullable=True)),
    ("video_meetings", sa.Column("passcode", sa.String(32), nullable=True)),
    ("video_meetings", sa.Column("citizen_id", postgresql.UUID(as_uuid=True), nullable=True)),
    ("video_meetings", sa.Column("thread_id", postgresql.UUID(as_uuid=True), nullable=True)),
    # --- documents ---
    ("document_templates", sa.Column("category_bn", sa.String(120), nullable=True)),
    ("document_templates", sa.Column("category_en", sa.String(120), nullable=True)),
    ("document_templates", sa.Column("description_bn", sa.Text(), nullable=True)),
    ("document_templates", sa.Column("description_en", sa.Text(), nullable=True)),
    ("draft_documents", sa.Column("generated_body_en", sa.Text(), nullable=True)),
]


def upgrade() -> None:
    for table, column in NEW_COLUMNS:
        op.add_column(table, column)

    op.create_unique_constraint("uq_acts_slug", "acts", ["slug"])
    op.create_foreign_key(
        "fk_video_meetings_citizen_id_users", "video_meetings", "users",
        ["citizen_id"], ["id"], ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_video_meetings_thread_id_message_threads", "video_meetings", "message_threads",
        ["thread_id"], ["id"], ondelete="SET NULL",
    )

    # Postgres 12+ allows ADD VALUE inside a transaction (the value just can't be
    # used until commit, which this migration doesn't do).
    op.execute("ALTER TYPE verdict_enum ADD VALUE IF NOT EXISTS 'NEEDS_CORRECTION'")


def downgrade() -> None:
    # Enum values cannot be dropped in Postgres; NEEDS_CORRECTION is left in place.
    op.drop_constraint("fk_video_meetings_thread_id_message_threads", "video_meetings", type_="foreignkey")
    op.drop_constraint("fk_video_meetings_citizen_id_users", "video_meetings", type_="foreignkey")
    op.drop_constraint("uq_acts_slug", "acts", type_="unique")
    for table, column in reversed(NEW_COLUMNS):
        op.drop_column(table, column.name)
