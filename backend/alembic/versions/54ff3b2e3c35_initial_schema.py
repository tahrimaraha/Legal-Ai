"""initial schema

Revision ID: 54ff3b2e3c35
Revises:
Create Date: 2026-09-20 21:02:10.479616

Hand-ordered from an autogenerate draft: tables are created in dependency order
(autogenerate's own ordering broke on the consultations <-> video_meetings cycle
and on tables that share an ENUM type), and every ENUM type is created exactly
once up front, then referenced with create_type=False everywhere it is reused.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "54ff3b2e3c35"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def pg_enum(name: str, *values: str) -> postgresql.ENUM:
    """A reference to an already-created enum type (see _create_enum_types)."""
    return postgresql.ENUM(*values, name=name, create_type=False)


ENUM_TYPES: dict[str, tuple[str, ...]] = {
    "user_role": ("CITIZEN", "LAWYER", "ADMIN"),
    "language": ("bn", "en"),
    "gender": ("MALE", "FEMALE", "OTHER"),
    "otp_channel": ("EMAIL", "SMS"),
    "otp_purpose": ("SIGNUP", "LOGIN", "RESET_PASSWORD", "CHANGE_CONTACT"),
    "court_level": ("JUDGE_COURT", "HIGH_COURT", "APPELLATE_DIVISION"),
    "lawyer_approval_status": (
        "DRAFT",
        "PENDING",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "SUSPENDED",
    ),
    "credential_doc_type": ("BAR_LICENSE", "NID", "CERTIFICATE"),
    "credential_status": ("PENDING", "APPROVED", "REJECTED"),
    "consultation_mode": ("CHAT", "AUDIO", "VIDEO", "CHAMBER"),
    "ingest_status": ("UPLOADED", "PARSING", "CHUNKING", "EMBEDDING", "READY", "FAILED"),
    "message_role": ("USER", "ASSISTANT", "SYSTEM"),
    "message_language": ("bn", "en"),
    "feedback_rating": ("HELPFUL", "NOT_HELPFUL"),
    "urgency": ("LOW", "NORMAL", "URGENT"),
    "verification_status": (
        "DRAFT",
        "AWAITING_PAYMENT",
        "PAID",
        "UNASSIGNED",
        "ASSIGNED",
        "CLAIMED",
        "IN_REVIEW",
        "VERDICT_ISSUED",
        "CLOSED",
        "REFUNDED",
        "CANCELLED",
    ),
    "verdict_enum": ("ACCURATE", "PARTIALLY_ACCURATE", "INACCURATE"),
    "verification_language": ("bn", "en"),
    "consultation_status": (
        "REQUESTED",
        "AWAITING_PAYMENT",
        "CONFIRMED",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED_BY_CITIZEN",
        "CANCELLED_BY_LAWYER",
        "NO_SHOW",
    ),
    "thread_origin": ("VERIFICATION", "CONSULTATION", "INVITE"),
    "thread_status": ("PENDING_LAWYER_ACCEPTANCE", "OPEN", "CLOSED", "BLOCKED"),
    "scan_status": ("PENDING", "CLEAN", "INFECTED", "FAILED"),
    "video_provider": ("LIVEKIT", "JITSI"),
    "meeting_status": ("SCHEDULED", "LIVE", "ENDED", "CANCELLED"),
    "participant_role": ("HOST", "GUEST"),
    "draft_status": ("DRAFT", "GENERATED", "FINALISED"),
    "payment_purpose": ("VERIFICATION_FEE", "CONSULTATION_FEE", "DOCUMENT_FEE"),
    "payment_method": ("BKASH", "NAGAD", "SSLCOMMERZ", "MOCK"),
    "payment_status": (
        "INITIATED",
        "PENDING",
        "SUCCESS",
        "FAILED",
        "CANCELLED",
        "EXPIRED",
        "MISMATCH",
        "REFUND_PENDING",
        "REFUNDED",
    ),
    "log_direction": ("OUT", "IN"),
    "refund_status": ("REQUESTED", "MANUAL_REQUIRED", "PROCESSING", "COMPLETED", "FAILED"),
    "payout_status": ("PENDING", "APPROVED", "PAID", "FAILED"),
    "payout_source_type": ("VERIFICATION", "CONSULTATION"),
    "flagged_status": ("OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"),
    "reported_action": ("NONE", "WARNING", "THREAD_BLOCKED", "ACCOUNT_SUSPENDED"),
    "chunk_language": ("bn", "en"),
}


def _create_enum_types() -> None:
    for name, values in ENUM_TYPES.items():
        postgresql.ENUM(*values, name=name).create(op.get_bind(), checkfirst=True)


def _drop_enum_types() -> None:
    for name, values in ENUM_TYPES.items():
        postgresql.ENUM(*values, name=name).drop(op.get_bind(), checkfirst=True)


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    _create_enum_types()

    # --- Level 0: no dependencies -------------------------------------------------
    op.create_table(
        "users",
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", pg_enum("user_role", *ENUM_TYPES["user_role"]), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column(
            "preferred_language", pg_enum("language", *ENUM_TYPES["language"]), nullable=False
        ),
        sa.Column("avatar_url", sa.String(length=500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("phone_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failed_login_attempts", sa.Integer(), nullable=False),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("email IS NOT NULL OR phone IS NOT NULL", name=op.f("ck_users_at_least_one_contact")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email", name=op.f("uq_users_email")),
        sa.UniqueConstraint("phone", name=op.f("uq_users_phone")),
    )

    op.create_table(
        "specializations",
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("name_bn", sa.String(length=150), nullable=False),
        sa.Column("name_en", sa.String(length=150), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_specializations")),
        sa.UniqueConstraint("slug", name=op.f("uq_specializations_slug")),
    )

    op.create_table(
        "document_templates",
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("title_bn", sa.String(length=255), nullable=False),
        sa.Column("title_en", sa.String(length=255), nullable=False),
        sa.Column("jurisdiction", sa.String(length=120), nullable=True),
        sa.Column("body_template", sa.Text(), nullable=False),
        sa.Column("field_schema", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("related_act_ids", postgresql.ARRAY(sa.UUID()), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_document_templates")),
        sa.UniqueConstraint("slug", name=op.f("uq_document_templates_slug")),
    )

    op.create_table(
        "system_settings",
        sa.Column("key", sa.String(length=120), nullable=False),
        sa.Column("value", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("key", name=op.f("pk_system_settings")),
    )

    op.create_table(
        "daily_metrics",
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("questions_asked", sa.Integer(), nullable=False),
        sa.Column("new_citizens", sa.Integer(), nullable=False),
        sa.Column("new_lawyers", sa.Integer(), nullable=False),
        sa.Column("verifications_completed", sa.Integer(), nullable=False),
        sa.Column("revenue", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("topic_distribution", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.PrimaryKeyConstraint("date", name=op.f("pk_daily_metrics")),
    )

    op.create_table(
        "acts",
        sa.Column("title_bn", sa.String(length=500), nullable=False),
        sa.Column("title_en", sa.String(length=500), nullable=False),
        sa.Column("act_number", sa.String(length=80), nullable=True),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("category", sa.String(length=120), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("source_url", sa.String(length=500), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_acts")),
    )

    # --- Level 1: depends only on users / acts -------------------------------------
    op.create_table(
        "citizen_profiles",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("district", sa.String(length=100), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("nid_last4", sa.String(length=4), nullable=True),
        sa.Column("dob", sa.Date(), nullable=True),
        sa.Column("gender", pg_enum("gender", *ENUM_TYPES["gender"]), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_citizen_profiles_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", name=op.f("pk_citizen_profiles")),
    )

    op.create_table(
        "lawyer_profiles",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("bar_council_enrollment_no", sa.String(length=64), nullable=False),
        sa.Column("enrollment_year", sa.Integer(), nullable=True),
        sa.Column("chamber_name", sa.String(length=255), nullable=True),
        sa.Column("chamber_address", sa.Text(), nullable=True),
        sa.Column("district", sa.String(length=100), nullable=True),
        sa.Column("court_level", pg_enum("court_level", *ENUM_TYPES["court_level"]), nullable=True),
        sa.Column("years_of_experience", sa.Integer(), nullable=True),
        sa.Column("bio_bn", sa.Text(), nullable=True),
        sa.Column("bio_en", sa.Text(), nullable=True),
        sa.Column("languages", postgresql.ARRAY(sa.String(length=8)), nullable=False),
        sa.Column("profile_completeness", sa.Integer(), nullable=False),
        sa.Column("rating_avg", sa.Numeric(precision=3, scale=2), nullable=False),
        sa.Column("rating_count", sa.Integer(), nullable=False),
        sa.Column(
            "approval_status",
            pg_enum("lawyer_approval_status", *ENUM_TYPES["lawyer_approval_status"]),
            nullable=False,
        ),
        sa.Column("approved_by", sa.UUID(), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("payout_msisdn", sa.String(length=32), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["approved_by"], ["users.id"], name=op.f("fk_lawyer_profiles_approved_by_users"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_lawyer_profiles_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", name=op.f("pk_lawyer_profiles")),
        sa.UniqueConstraint("bar_council_enrollment_no", name=op.f("uq_lawyer_profiles_bar_council_enrollment_no")),
    )

    op.create_table(
        "otp_codes",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("channel", pg_enum("otp_channel", *ENUM_TYPES["otp_channel"]), nullable=False),
        sa.Column("purpose", pg_enum("otp_purpose", *ENUM_TYPES["otp_purpose"]), nullable=False),
        sa.Column("code_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("attempt_count", sa.Integer(), nullable=False),
        sa.Column("max_attempts", sa.Integer(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_otp_codes_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_otp_codes")),
    )
    op.create_index(op.f("ix_otp_codes_user_id"), "otp_codes", ["user_id"], unique=False)

    op.create_table(
        "refresh_tokens",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("ip", postgresql.INET(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_refresh_tokens_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_refresh_tokens")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_refresh_tokens_token_hash")),
    )
    op.create_index(op.f("ix_refresh_tokens_user_id"), "refresh_tokens", ["user_id"], unique=False)

    op.create_table(
        "password_resets",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_password_resets_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_password_resets")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_password_resets_token_hash")),
    )
    op.create_index(op.f("ix_password_resets_user_id"), "password_resets", ["user_id"], unique=False)

    op.create_table(
        "audit_logs",
        sa.Column("actor_id", sa.UUID(), nullable=True),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("entity_type", sa.String(length=80), nullable=False),
        sa.Column("entity_id", sa.UUID(), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("ip", postgresql.INET(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], name=op.f("fk_audit_logs_actor_id_users"), ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_audit_logs")),
    )
    op.create_index(op.f("ix_audit_logs_action"), "audit_logs", ["action"], unique=False)
    op.create_index(op.f("ix_audit_logs_actor_id"), "audit_logs", ["actor_id"], unique=False)

    op.create_table(
        "sections",
        sa.Column("act_id", sa.UUID(), nullable=False),
        sa.Column("section_number", sa.String(length=40), nullable=False),
        sa.Column("heading_bn", sa.String(length=500), nullable=True),
        sa.Column("heading_en", sa.String(length=500), nullable=True),
        sa.Column("body_bn", sa.Text(), nullable=True),
        sa.Column("body_en", sa.Text(), nullable=True),
        sa.Column("ordinal", sa.Integer(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["act_id"], ["acts.id"], name=op.f("fk_sections_act_id_acts"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_sections")),
    )
    op.create_index(op.f("ix_sections_act_id"), "sections", ["act_id"], unique=False)

    op.create_table(
        "conversations",
        sa.Column("citizen_id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("language", pg_enum("message_language", *ENUM_TYPES["message_language"]), nullable=False),
        sa.Column("topic_slug", sa.String(length=80), nullable=True),
        sa.Column("is_archived", sa.Boolean(), nullable=False),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("message_count", sa.Integer(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["citizen_id"], ["users.id"], name=op.f("fk_conversations_citizen_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_conversations")),
    )
    op.create_index(op.f("ix_conversations_citizen_id"), "conversations", ["citizen_id"], unique=False)

    op.create_table(
        "payments",
        sa.Column("payer_id", sa.UUID(), nullable=False),
        sa.Column("purpose", pg_enum("payment_purpose", *ENUM_TYPES["payment_purpose"]), nullable=False),
        sa.Column("reference_type", sa.String(length=40), nullable=False),
        sa.Column("reference_id", sa.UUID(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("platform_fee", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("method", pg_enum("payment_method", *ENUM_TYPES["payment_method"]), nullable=False),
        sa.Column("provider_ref", sa.String(length=120), nullable=True),
        sa.Column("provider_txn_id", sa.String(length=120), nullable=True),
        sa.Column("payer_msisdn_masked", sa.String(length=20), nullable=True),
        sa.Column("nagad_challenge", sa.String(length=64), nullable=True),
        sa.Column("status", pg_enum("payment_status", *ENUM_TYPES["payment_status"]), nullable=False),
        sa.Column("idempotency_key", sa.String(length=120), nullable=False),
        sa.Column("attempt_count", sa.Integer(), nullable=False),
        sa.Column("last_error_code", sa.String(length=80), nullable=True),
        sa.Column("last_error_message", sa.Text(), nullable=True),
        sa.Column("raw_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["payer_id"], ["users.id"], name=op.f("fk_payments_payer_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_payments")),
        sa.UniqueConstraint("idempotency_key", name=op.f("uq_payments_idempotency_key")),
    )
    op.create_index(op.f("ix_payments_payer_id"), "payments", ["payer_id"], unique=False)
    op.create_index(op.f("ix_payments_provider_ref"), "payments", ["provider_ref"], unique=False)
    op.create_index(op.f("ix_payments_reference_id"), "payments", ["reference_id"], unique=False)

    op.create_table(
        "attachments",
        sa.Column("uploader_id", sa.UUID(), nullable=False),
        sa.Column("file_url", sa.String(length=500), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("scan_status", pg_enum("scan_status", *ENUM_TYPES["scan_status"]), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["uploader_id"], ["users.id"], name=op.f("fk_attachments_uploader_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_attachments")),
    )

    # --- Level 2: depends on lawyer_profiles / acts / conversations / payments -----
    op.create_table(
        "lawyer_specializations",
        sa.Column("lawyer_id", sa.UUID(), nullable=False),
        sa.Column("specialization_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["lawyer_id"], ["lawyer_profiles.user_id"], name=op.f("fk_lawyer_specializations_lawyer_id_lawyer_profiles"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["specialization_id"], ["specializations.id"], name=op.f("fk_lawyer_specializations_specialization_id_specializations"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("lawyer_id", "specialization_id", name=op.f("pk_lawyer_specializations")),
    )

    op.create_table(
        "lawyer_credentials",
        sa.Column("lawyer_id", sa.UUID(), nullable=False),
        sa.Column("doc_type", pg_enum("credential_doc_type", *ENUM_TYPES["credential_doc_type"]), nullable=False),
        sa.Column("file_url", sa.String(length=500), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("status", pg_enum("credential_status", *ENUM_TYPES["credential_status"]), nullable=False),
        sa.Column("reviewed_by", sa.UUID(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_note", sa.Text(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["lawyer_id"], ["lawyer_profiles.user_id"], name=op.f("fk_lawyer_credentials_lawyer_id_lawyer_profiles"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"], name=op.f("fk_lawyer_credentials_reviewed_by_users"), ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_lawyer_credentials")),
    )
    op.create_index(op.f("ix_lawyer_credentials_lawyer_id"), "lawyer_credentials", ["lawyer_id"], unique=False)

    op.create_table(
        "lawyer_fees",
        sa.Column("lawyer_id", sa.UUID(), nullable=False),
        sa.Column("mode", pg_enum("consultation_mode", *ENUM_TYPES["consultation_mode"]), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["lawyer_id"], ["lawyer_profiles.user_id"], name=op.f("fk_lawyer_fees_lawyer_id_lawyer_profiles"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_lawyer_fees")),
        sa.UniqueConstraint("lawyer_id", "mode", name="uq_lawyer_fee_mode"),
    )
    op.create_index(op.f("ix_lawyer_fees_lawyer_id"), "lawyer_fees", ["lawyer_id"], unique=False)

    op.create_table(
        "availability_rules",
        sa.Column("lawyer_id", sa.UUID(), nullable=False),
        sa.Column("weekday", sa.SmallInteger(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("slot_minutes", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["lawyer_id"], ["lawyer_profiles.user_id"], name=op.f("fk_availability_rules_lawyer_id_lawyer_profiles"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_availability_rules")),
    )
    op.create_index(op.f("ix_availability_rules_lawyer_id"), "availability_rules", ["lawyer_id"], unique=False)

    op.create_table(
        "availability_exceptions",
        sa.Column("lawyer_id", sa.UUID(), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("is_available", sa.Boolean(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=True),
        sa.Column("end_time", sa.Time(), nullable=True),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["lawyer_id"], ["lawyer_profiles.user_id"], name=op.f("fk_availability_exceptions_lawyer_id_lawyer_profiles"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_availability_exceptions")),
    )
    op.create_index(op.f("ix_availability_exceptions_lawyer_id"), "availability_exceptions", ["lawyer_id"], unique=False)

    op.create_table(
        "corpus_documents",
        sa.Column("act_id", sa.UUID(), nullable=False),
        sa.Column("uploaded_by", sa.UUID(), nullable=True),
        sa.Column("file_url", sa.String(length=500), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=False),
        sa.Column("page_count", sa.Integer(), nullable=True),
        sa.Column("ingest_status", pg_enum("ingest_status", *ENUM_TYPES["ingest_status"]), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["act_id"], ["acts.id"], name=op.f("fk_corpus_documents_act_id_acts"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"], name=op.f("fk_corpus_documents_uploaded_by_users"), ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_corpus_documents")),
    )
    op.create_index(op.f("ix_corpus_documents_act_id"), "corpus_documents", ["act_id"], unique=False)

    op.create_table(
        "glossary_terms",
        sa.Column("term_bn", sa.String(length=255), nullable=False),
        sa.Column("term_en", sa.String(length=255), nullable=False),
        sa.Column("definition_bn", sa.Text(), nullable=False),
        sa.Column("definition_en", sa.Text(), nullable=False),
        sa.Column("related_act_id", sa.UUID(), nullable=True),
        sa.Column("synonyms", postgresql.ARRAY(sa.String(length=255)), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["related_act_id"], ["acts.id"], name=op.f("fk_glossary_terms_related_act_id_acts"), ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_glossary_terms")),
    )
    op.create_index(op.f("ix_glossary_terms_term_bn"), "glossary_terms", ["term_bn"], unique=False)
    op.create_index(op.f("ix_glossary_terms_term_en"), "glossary_terms", ["term_en"], unique=False)

    op.create_table(
        "messages",
        sa.Column("conversation_id", sa.UUID(), nullable=False),
        sa.Column("role", pg_enum("message_role", *ENUM_TYPES["message_role"]), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("language", pg_enum("message_language", *ENUM_TYPES["message_language"]), nullable=False),
        sa.Column("token_usage", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("model_name", sa.String(length=120), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("retrieval_trace", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.Column("is_flagged", sa.Boolean(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], name=op.f("fk_messages_conversation_id_conversations"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_messages")),
    )
    op.create_index(op.f("ix_messages_conversation_id"), "messages", ["conversation_id"], unique=False)

    op.create_table(
        "payouts",
        sa.Column("lawyer_id", sa.UUID(), nullable=False),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("gross_amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("platform_commission", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("net_amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("status", pg_enum("payout_status", *ENUM_TYPES["payout_status"]), nullable=False),
        sa.Column("external_reference", sa.String(length=120), nullable=True),
        sa.Column("approved_by", sa.UUID(), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["approved_by"], ["users.id"], name=op.f("fk_payouts_approved_by_users"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["lawyer_id"], ["lawyer_profiles.user_id"], name=op.f("fk_payouts_lawyer_id_lawyer_profiles"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_payouts")),
    )
    op.create_index(op.f("ix_payouts_lawyer_id"), "payouts", ["lawyer_id"], unique=False)

    op.create_table(
        "payment_gateway_logs",
        sa.Column("payment_id", sa.UUID(), nullable=False),
        sa.Column("provider", sa.String(length=40), nullable=False),
        sa.Column("direction", pg_enum("log_direction", *ENUM_TYPES["log_direction"]), nullable=False),
        sa.Column("endpoint", sa.String(length=255), nullable=False),
        sa.Column("http_status", sa.Integer(), nullable=True),
        sa.Column("request_body", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("response_body", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["payment_id"], ["payments.id"], name=op.f("fk_payment_gateway_logs_payment_id_payments"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_payment_gateway_logs")),
    )
    op.create_index(op.f("ix_payment_gateway_logs_payment_id"), "payment_gateway_logs", ["payment_id"], unique=False)

    op.create_table(
        "refunds",
        sa.Column("payment_id", sa.UUID(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("status", pg_enum("refund_status", *ENUM_TYPES["refund_status"]), nullable=False),
        sa.Column("external_reference", sa.String(length=120), nullable=True),
        sa.Column("processed_by", sa.UUID(), nullable=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["payment_id"], ["payments.id"], name=op.f("fk_refunds_payment_id_payments"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["processed_by"], ["users.id"], name=op.f("fk_refunds_processed_by_users"), ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_refunds")),
    )
    op.create_index(op.f("ix_refunds_payment_id"), "refunds", ["payment_id"], unique=False)

    # consultations.meeting_id -> video_meetings.id is added after video_meetings
    # exists (see below): this table and video_meetings are mutually dependent.
    op.create_table(
        "consultations",
        sa.Column("citizen_id", sa.UUID(), nullable=False),
        sa.Column("lawyer_id", sa.UUID(), nullable=False),
        sa.Column("mode", pg_enum("consultation_mode", *ENUM_TYPES["consultation_mode"]), nullable=False),
        sa.Column("subject", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("scheduled_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("scheduled_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("timezone", sa.String(length=64), nullable=False),
        sa.Column("fee_amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("payment_id", sa.UUID(), nullable=True),
        sa.Column("meeting_id", sa.UUID(), nullable=True),
        sa.Column("status", pg_enum("consultation_status", *ENUM_TYPES["consultation_status"]), nullable=False),
        sa.Column("cancellation_reason", sa.Text(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("citizen_rating", sa.SmallInteger(), nullable=True),
        sa.Column("citizen_review", sa.Text(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["citizen_id"], ["users.id"], name=op.f("fk_consultations_citizen_id_users"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lawyer_id"], ["lawyer_profiles.user_id"], name=op.f("fk_consultations_lawyer_id_lawyer_profiles"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["payment_id"], ["payments.id"], name=op.f("fk_consultations_payment_id_payments"), ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_consultations")),
    )
    op.create_index(op.f("ix_consultations_citizen_id"), "consultations", ["citizen_id"], unique=False)
    op.create_index(op.f("ix_consultations_lawyer_id"), "consultations", ["lawyer_id"], unique=False)

    op.create_table(
        "video_meetings",
        sa.Column("consultation_id", sa.UUID(), nullable=True),
        sa.Column("host_lawyer_id", sa.UUID(), nullable=False),
        sa.Column("provider", pg_enum("video_provider", *ENUM_TYPES["video_provider"]), nullable=False),
        sa.Column("room_name", sa.String(length=120), nullable=False),
        sa.Column("join_code", sa.String(length=12), nullable=False),
        sa.Column("passcode_hash", sa.String(length=255), nullable=False),
        sa.Column("scheduled_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("scheduled_end", sa.DateTime(timezone=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", pg_enum("meeting_status", *ENUM_TYPES["meeting_status"]), nullable=False),
        sa.Column("recording_url", sa.String(length=500), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["consultation_id"], ["consultations.id"], name=op.f("fk_video_meetings_consultation_id_consultations"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["host_lawyer_id"], ["lawyer_profiles.user_id"], name=op.f("fk_video_meetings_host_lawyer_id_lawyer_profiles"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_video_meetings")),
        sa.UniqueConstraint("join_code", name=op.f("uq_video_meetings_join_code")),
        sa.UniqueConstraint("room_name", name=op.f("uq_video_meetings_room_name")),
    )
    op.create_index(op.f("ix_video_meetings_host_lawyer_id"), "video_meetings", ["host_lawyer_id"], unique=False)

    op.create_foreign_key(
        op.f("fk_consultations_meeting_id_video_meetings"),
        "consultations",
        "video_meetings",
        ["meeting_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "meeting_participants",
        sa.Column("meeting_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("role", pg_enum("participant_role", *ENUM_TYPES["participant_role"]), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("left_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["meeting_id"], ["video_meetings.id"], name=op.f("fk_meeting_participants_meeting_id_video_meetings"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_meeting_participants_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_meeting_participants")),
    )
    op.create_index(op.f("ix_meeting_participants_meeting_id"), "meeting_participants", ["meeting_id"], unique=False)

    op.create_table(
        "message_threads",
        sa.Column("citizen_id", sa.UUID(), nullable=False),
        sa.Column("lawyer_id", sa.UUID(), nullable=False),
        sa.Column("origin", pg_enum("thread_origin", *ENUM_TYPES["thread_origin"]), nullable=False),
        sa.Column("origin_id", sa.UUID(), nullable=False),
        sa.Column("status", pg_enum("thread_status", *ENUM_TYPES["thread_status"]), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("citizen_unread_count", sa.Integer(), nullable=False),
        sa.Column("lawyer_unread_count", sa.Integer(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["citizen_id"], ["users.id"], name=op.f("fk_message_threads_citizen_id_users"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["lawyer_id"], ["lawyer_profiles.user_id"], name=op.f("fk_message_threads_lawyer_id_lawyer_profiles"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_message_threads")),
        sa.UniqueConstraint("citizen_id", "lawyer_id", "origin", "origin_id", name="uq_thread_participants_origin"),
    )
    op.create_index(op.f("ix_message_threads_citizen_id"), "message_threads", ["citizen_id"], unique=False)
    op.create_index(op.f("ix_message_threads_lawyer_id"), "message_threads", ["lawyer_id"], unique=False)

    op.create_table(
        "thread_messages",
        sa.Column("thread_id", sa.UUID(), nullable=False),
        sa.Column("sender_id", sa.UUID(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("attachment_id", sa.UUID(), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["attachment_id"], ["attachments.id"], name=op.f("fk_thread_messages_attachment_id_attachments"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"], name=op.f("fk_thread_messages_sender_id_users"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["thread_id"], ["message_threads.id"], name=op.f("fk_thread_messages_thread_id_message_threads"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_thread_messages")),
    )
    op.create_index(op.f("ix_thread_messages_thread_id"), "thread_messages", ["thread_id"], unique=False)

    op.create_table(
        "chunks",
        sa.Column("document_id", sa.UUID(), nullable=False),
        sa.Column("act_id", sa.UUID(), nullable=False),
        sa.Column("section_id", sa.UUID(), nullable=True),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("token_count", sa.Integer(), nullable=False),
        sa.Column("language", pg_enum("chunk_language", *ENUM_TYPES["chunk_language"]), nullable=False),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["act_id"], ["acts.id"], name=op.f("fk_chunks_act_id_acts"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["document_id"], ["corpus_documents.id"], name=op.f("fk_chunks_document_id_corpus_documents"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["section_id"], ["sections.id"], name=op.f("fk_chunks_section_id_sections"), ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_chunks")),
    )
    op.create_index(op.f("ix_chunks_act_id"), "chunks", ["act_id"], unique=False)
    op.create_index(op.f("ix_chunks_document_id"), "chunks", ["document_id"], unique=False)

    op.create_table(
        "chunk_embeddings",
        sa.Column("chunk_id", sa.UUID(), nullable=False),
        sa.Column("vector", Vector(384), nullable=False),
        sa.Column("model_name", sa.String(length=120), nullable=False),
        sa.Column("embedded_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["chunk_id"], ["chunks.id"], name=op.f("fk_chunk_embeddings_chunk_id_chunks"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("chunk_id", name=op.f("pk_chunk_embeddings")),
    )

    op.create_table(
        "message_citations",
        sa.Column("message_id", sa.UUID(), nullable=False),
        sa.Column("act_id", sa.UUID(), nullable=False),
        sa.Column("section_id", sa.UUID(), nullable=False),
        sa.Column("chunk_id", sa.UUID(), nullable=True),
        sa.Column("quoted_span", sa.Text(), nullable=True),
        sa.Column("relevance_score", sa.Float(), nullable=True),
        sa.Column("display_label", sa.String(length=500), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["act_id"], ["acts.id"], name=op.f("fk_message_citations_act_id_acts"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["chunk_id"], ["chunks.id"], name=op.f("fk_message_citations_chunk_id_chunks"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["message_id"], ["messages.id"], name=op.f("fk_message_citations_message_id_messages"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["section_id"], ["sections.id"], name=op.f("fk_message_citations_section_id_sections"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_message_citations")),
    )
    op.create_index(op.f("ix_message_citations_message_id"), "message_citations", ["message_id"], unique=False)

    op.create_table(
        "message_feedback",
        sa.Column("message_id", sa.UUID(), nullable=False),
        sa.Column("citizen_id", sa.UUID(), nullable=False),
        sa.Column("rating", pg_enum("feedback_rating", *ENUM_TYPES["feedback_rating"]), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["citizen_id"], ["users.id"], name=op.f("fk_message_feedback_citizen_id_users"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["message_id"], ["messages.id"], name=op.f("fk_message_feedback_message_id_messages"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_message_feedback")),
    )
    op.create_index(op.f("ix_message_feedback_message_id"), "message_feedback", ["message_id"], unique=False)

    op.create_table(
        "flagged_answers",
        sa.Column("message_id", sa.UUID(), nullable=False),
        sa.Column("reporter_id", sa.UUID(), nullable=False),
        sa.Column("reason_code", sa.String(length=80), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", pg_enum("flagged_status", *ENUM_TYPES["flagged_status"]), nullable=False),
        sa.Column("resolved_by", sa.UUID(), nullable=True),
        sa.Column("resolution_note", sa.Text(), nullable=True),
        sa.Column("corpus_action_taken", sa.String(length=255), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["message_id"], ["messages.id"], name=op.f("fk_flagged_answers_message_id_messages"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reporter_id"], ["users.id"], name=op.f("fk_flagged_answers_reporter_id_users"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["resolved_by"], ["users.id"], name=op.f("fk_flagged_answers_resolved_by_users"), ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_flagged_answers")),
    )
    op.create_index(op.f("ix_flagged_answers_message_id"), "flagged_answers", ["message_id"], unique=False)

    op.create_table(
        "reported_messages",
        sa.Column("thread_message_id", sa.UUID(), nullable=False),
        sa.Column("reporter_id", sa.UUID(), nullable=False),
        sa.Column("reason_code", sa.String(length=80), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", pg_enum("flagged_status", *ENUM_TYPES["flagged_status"]), nullable=False),
        sa.Column("action", pg_enum("reported_action", *ENUM_TYPES["reported_action"]), nullable=False),
        sa.Column("resolved_by", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["reporter_id"], ["users.id"], name=op.f("fk_reported_messages_reporter_id_users"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["resolved_by"], ["users.id"], name=op.f("fk_reported_messages_resolved_by_users"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["thread_message_id"], ["thread_messages.id"], name=op.f("fk_reported_messages_thread_message_id_thread_messages"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_reported_messages")),
    )
    op.create_index(op.f("ix_reported_messages_thread_message_id"), "reported_messages", ["thread_message_id"], unique=False)

    op.create_table(
        "notifications",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("type", sa.String(length=80), nullable=False),
        sa.Column("title_bn", sa.String(length=255), nullable=False),
        sa.Column("title_en", sa.String(length=255), nullable=False),
        sa.Column("body_bn", sa.Text(), nullable=False),
        sa.Column("body_en", sa.Text(), nullable=False),
        sa.Column("deep_link", sa.String(length=500), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name=op.f("fk_notifications_user_id_users"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_notifications")),
    )
    op.create_index(op.f("ix_notifications_user_id"), "notifications", ["user_id"], unique=False)

    op.create_table(
        "verification_requests",
        sa.Column("citizen_id", sa.UUID(), nullable=False),
        sa.Column("conversation_id", sa.UUID(), nullable=True),
        sa.Column("message_id", sa.UUID(), nullable=True),
        sa.Column("issue_summary", sa.Text(), nullable=False),
        sa.Column("desired_outcome", sa.Text(), nullable=True),
        sa.Column("urgency", pg_enum("urgency", *ENUM_TYPES["urgency"]), nullable=False),
        sa.Column("preferred_language", pg_enum("verification_language", *ENUM_TYPES["verification_language"]), nullable=False),
        sa.Column("attached_statute_ids", postgresql.ARRAY(sa.UUID()), nullable=False),
        sa.Column("fee_amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("payment_id", sa.UUID(), nullable=True),
        sa.Column("status", pg_enum("verification_status", *ENUM_TYPES["verification_status"]), nullable=False),
        sa.Column("sla_due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["citizen_id"], ["users.id"], name=op.f("fk_verification_requests_citizen_id_users"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], name=op.f("fk_verification_requests_conversation_id_conversations"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["message_id"], ["messages.id"], name=op.f("fk_verification_requests_message_id_messages"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["payment_id"], ["payments.id"], name=op.f("fk_verification_requests_payment_id_payments"), ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_verification_requests")),
    )
    op.create_index(op.f("ix_verification_requests_citizen_id"), "verification_requests", ["citizen_id"], unique=False)

    op.create_table(
        "draft_documents",
        sa.Column("citizen_id", sa.UUID(), nullable=False),
        sa.Column("template_id", sa.UUID(), nullable=False),
        sa.Column("conversation_id", sa.UUID(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("answers", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("generated_body", sa.Text(), nullable=True),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("status", pg_enum("draft_status", *ENUM_TYPES["draft_status"]), nullable=False),
        sa.Column("pdf_url", sa.String(length=500), nullable=True),
        sa.Column("lawyer_review_id", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["citizen_id"], ["users.id"], name=op.f("fk_draft_documents_citizen_id_users"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], name=op.f("fk_draft_documents_conversation_id_conversations"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["lawyer_review_id"], ["users.id"], name=op.f("fk_draft_documents_lawyer_review_id_users"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["template_id"], ["document_templates.id"], name=op.f("fk_draft_documents_template_id_document_templates"), ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_draft_documents")),
    )
    op.create_index(op.f("ix_draft_documents_citizen_id"), "draft_documents", ["citizen_id"], unique=False)

    op.create_table(
        "verification_assignments",
        sa.Column("request_id", sa.UUID(), nullable=False),
        sa.Column("lawyer_id", sa.UUID(), nullable=False),
        sa.Column("assigned_by", sa.UUID(), nullable=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("claimed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("declined_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("decline_reason", sa.Text(), nullable=True),
        sa.Column("honorarium_amount", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("payout_id", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["assigned_by"], ["users.id"], name=op.f("fk_verification_assignments_assigned_by_users"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["lawyer_id"], ["lawyer_profiles.user_id"], name=op.f("fk_verification_assignments_lawyer_id_lawyer_profiles"), ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["payout_id"], ["payouts.id"], name=op.f("fk_verification_assignments_payout_id_payouts"), ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["request_id"], ["verification_requests.id"], name=op.f("fk_verification_assignments_request_id_verification_requests"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_verification_assignments")),
    )
    op.create_index(op.f("ix_verification_assignments_lawyer_id"), "verification_assignments", ["lawyer_id"], unique=False)
    op.create_index(op.f("ix_verification_assignments_request_id"), "verification_assignments", ["request_id"], unique=False)

    op.create_table(
        "verification_verdicts",
        sa.Column("assignment_id", sa.UUID(), nullable=False),
        sa.Column("verdict", pg_enum("verdict_enum", *ENUM_TYPES["verdict_enum"]), nullable=False),
        sa.Column("summary_bn", sa.Text(), nullable=False),
        sa.Column("summary_en", sa.Text(), nullable=False),
        sa.Column("corrected_statement", sa.Text(), nullable=True),
        sa.Column("cited_section_ids", postgresql.ARRAY(sa.UUID()), nullable=False),
        sa.Column("advocate_signature_name", sa.String(length=255), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_final", sa.Boolean(), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["assignment_id"], ["verification_assignments.id"], name=op.f("fk_verification_verdicts_assignment_id_verification_assignments"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_verification_verdicts")),
        sa.UniqueConstraint("assignment_id", name=op.f("uq_verification_verdicts_assignment_id")),
    )

    op.create_table(
        "payout_items",
        sa.Column("payout_id", sa.UUID(), nullable=False),
        sa.Column("source_type", pg_enum("payout_source_type", *ENUM_TYPES["payout_source_type"]), nullable=False),
        sa.Column("source_id", sa.UUID(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["payout_id"], ["payouts.id"], name=op.f("fk_payout_items_payout_id_payouts"), ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_payout_items")),
        sa.UniqueConstraint("source_type", "source_id", name="uq_payout_item_source"),
    )
    op.create_index(op.f("ix_payout_items_payout_id"), "payout_items", ["payout_id"], unique=False)


def downgrade() -> None:
    op.drop_table("payout_items")
    op.drop_table("verification_verdicts")
    op.drop_index(op.f("ix_verification_assignments_request_id"), table_name="verification_assignments")
    op.drop_index(op.f("ix_verification_assignments_lawyer_id"), table_name="verification_assignments")
    op.drop_table("verification_assignments")
    op.drop_index(op.f("ix_draft_documents_citizen_id"), table_name="draft_documents")
    op.drop_table("draft_documents")
    op.drop_index(op.f("ix_verification_requests_citizen_id"), table_name="verification_requests")
    op.drop_table("verification_requests")
    op.drop_index(op.f("ix_notifications_user_id"), table_name="notifications")
    op.drop_table("notifications")
    op.drop_index(op.f("ix_reported_messages_thread_message_id"), table_name="reported_messages")
    op.drop_table("reported_messages")
    op.drop_index(op.f("ix_flagged_answers_message_id"), table_name="flagged_answers")
    op.drop_table("flagged_answers")
    op.drop_index(op.f("ix_message_feedback_message_id"), table_name="message_feedback")
    op.drop_table("message_feedback")
    op.drop_index(op.f("ix_message_citations_message_id"), table_name="message_citations")
    op.drop_table("message_citations")
    op.drop_table("chunk_embeddings")
    op.drop_index(op.f("ix_chunks_document_id"), table_name="chunks")
    op.drop_index(op.f("ix_chunks_act_id"), table_name="chunks")
    op.drop_table("chunks")
    op.drop_index(op.f("ix_thread_messages_thread_id"), table_name="thread_messages")
    op.drop_table("thread_messages")
    op.drop_index(op.f("ix_message_threads_lawyer_id"), table_name="message_threads")
    op.drop_index(op.f("ix_message_threads_citizen_id"), table_name="message_threads")
    op.drop_table("message_threads")
    op.drop_index(op.f("ix_meeting_participants_meeting_id"), table_name="meeting_participants")
    op.drop_table("meeting_participants")
    op.drop_constraint(op.f("fk_consultations_meeting_id_video_meetings"), "consultations", type_="foreignkey")
    op.drop_index(op.f("ix_video_meetings_host_lawyer_id"), table_name="video_meetings")
    op.drop_table("video_meetings")
    op.drop_index(op.f("ix_consultations_lawyer_id"), table_name="consultations")
    op.drop_index(op.f("ix_consultations_citizen_id"), table_name="consultations")
    op.drop_table("consultations")
    op.drop_index(op.f("ix_refunds_payment_id"), table_name="refunds")
    op.drop_table("refunds")
    op.drop_index(op.f("ix_payment_gateway_logs_payment_id"), table_name="payment_gateway_logs")
    op.drop_table("payment_gateway_logs")
    op.drop_index(op.f("ix_payouts_lawyer_id"), table_name="payouts")
    op.drop_table("payouts")
    op.drop_index(op.f("ix_messages_conversation_id"), table_name="messages")
    op.drop_table("messages")
    op.drop_index(op.f("ix_glossary_terms_term_en"), table_name="glossary_terms")
    op.drop_index(op.f("ix_glossary_terms_term_bn"), table_name="glossary_terms")
    op.drop_table("glossary_terms")
    op.drop_index(op.f("ix_corpus_documents_act_id"), table_name="corpus_documents")
    op.drop_table("corpus_documents")
    op.drop_index(op.f("ix_availability_exceptions_lawyer_id"), table_name="availability_exceptions")
    op.drop_table("availability_exceptions")
    op.drop_index(op.f("ix_availability_rules_lawyer_id"), table_name="availability_rules")
    op.drop_table("availability_rules")
    op.drop_index(op.f("ix_lawyer_fees_lawyer_id"), table_name="lawyer_fees")
    op.drop_table("lawyer_fees")
    op.drop_index(op.f("ix_lawyer_credentials_lawyer_id"), table_name="lawyer_credentials")
    op.drop_table("lawyer_credentials")
    op.drop_table("lawyer_specializations")
    op.drop_table("attachments")
    op.drop_index(op.f("ix_payments_reference_id"), table_name="payments")
    op.drop_index(op.f("ix_payments_provider_ref"), table_name="payments")
    op.drop_index(op.f("ix_payments_payer_id"), table_name="payments")
    op.drop_table("payments")
    op.drop_index(op.f("ix_conversations_citizen_id"), table_name="conversations")
    op.drop_table("conversations")
    op.drop_index(op.f("ix_sections_act_id"), table_name="sections")
    op.drop_table("sections")
    op.drop_index(op.f("ix_audit_logs_actor_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_action"), table_name="audit_logs")
    op.drop_table("audit_logs")
    op.drop_index(op.f("ix_password_resets_user_id"), table_name="password_resets")
    op.drop_table("password_resets")
    op.drop_index(op.f("ix_refresh_tokens_user_id"), table_name="refresh_tokens")
    op.drop_table("refresh_tokens")
    op.drop_index(op.f("ix_otp_codes_user_id"), table_name="otp_codes")
    op.drop_table("otp_codes")
    op.drop_table("lawyer_profiles")
    op.drop_table("citizen_profiles")
    op.drop_table("acts")
    op.drop_table("daily_metrics")
    op.drop_table("system_settings")
    op.drop_table("document_templates")
    op.drop_table("specializations")
    op.drop_table("users")

    _drop_enum_types()
