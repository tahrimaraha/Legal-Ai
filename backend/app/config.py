"""Application settings, loaded from environment variables via Pydantic v2."""
from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # --- Core ---
    app_name: str = "Legal AI"
    app_env: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"
    frontend_url: str = "http://localhost:5173"

    # --- Database ---
    database_url: str = "postgresql+asyncpg://legalai:legalai@localhost:5432/legalai"
    database_url_sync: str = "postgresql+psycopg2://legalai:legalai@localhost:5432/legalai"
    database_pool_size: int = 10
    database_max_overflow: int = 20

    # --- Video meetings (WebRTC) ---
    # Comma-separated ICE server URLs. STUN is enough on most home/office networks; add a TURN server
    # (e.g. coturn) for strict mobile/corporate NATs.
    meeting_stun_urls: str = "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302"
    meeting_turn_urls: str = ""
    meeting_turn_username: str = ""
    meeting_turn_credential: str = ""

    # --- Redis ---
    redis_url: str = "redis://localhost:6379/0"
    redis_fallback_to_db: bool = False

    # --- Auth / JWT ---
    jwt_secret: str = "change-me-to-a-long-random-string"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    bcrypt_rounds: int = 12

    # --- OTP ---
    otp_length: int = 6
    otp_ttl_minutes: int = 5
    otp_max_attempts: int = 5
    otp_resend_limit_per_window: int = 3
    otp_resend_window_minutes: int = 15

    # --- LLM / RAG ---
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    embedding_model: str = "paraphrase-multilingual-MiniLM-L12-v2"
    embedding_dim: int = 384
    min_similarity: float = 0.35
    retrieval_top_k: int = 8
    vector_backend: str = "pgvector"
    free_questions_per_day: int = 20
    corpus_path: str = "data/legal_corpus.db"  # prebuilt by scripts/build_corpus.py

    # --- Payments ---
    payment_enabled_methods: str = "BKASH,NAGAD,SSLCOMMERZ,MOCK"
    payment_environment: str = "sandbox"
    payment_pending_timeout_minutes: int = 1440
    platform_commission_percent: int = 20
    cancellation_full_refund_window_hours: int = 24

    # --- bKash ---
    bkash_base_url: str = "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout"
    bkash_app_key: str = ""
    bkash_app_secret: str = ""
    bkash_username: str = ""
    bkash_password: str = ""

    # --- Nagad ---
    nagad_base_url: str = "http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs"
    nagad_merchant_id: str = ""
    nagad_merchant_number: str = ""
    nagad_callback_url: str = "http://localhost:8000/api/v1/payments/callback/nagad"
    nagad_merchant_private_key_b64: str = ""
    nagad_pg_public_key_b64: str = ""

    # --- SSLCommerz ---
    sslcz_store_id: str = ""
    sslcz_store_passwd: str = ""
    sslcz_base_url: str = "https://sandbox.sslcommerz.com"

    # --- Video ---
    video_provider: str = "livekit"
    livekit_api_key: str = ""
    livekit_api_secret: str = ""
    livekit_url: str = ""
    jitsi_domain: str = "meet.jit.si"
    jitsi_app_id: str = ""
    jitsi_app_secret: str = ""

    # --- Email verification, password reset & sessions ---
    email_verification_ttl_hours: int = 24  # verification links expire after this
    email_resend_cooldown_seconds: int = 60  # min gap between verification / reset emails to one address
    password_reset_grant_minutes: int = 10  # how long a verified reset code lets you set a new password
    refresh_cookie_secure: bool = False  # set true in production (HTTPS)
    dev_mail_outbox: str = "var/mail-outbox"  # console provider writes each email here as .eml (dev only)

    # --- Email ---
    email_provider: str = "console"
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "no-reply@legalai.local"
    smtp_from_name: str = "LEGAL AI"
    smtp_use_tls: bool = True

    # --- SMS ---
    sms_provider: str = "console"
    sms_gateway_url: str = ""
    sms_api_key: str = ""
    sms_sender_id: str = "LegalAI"

    # --- Storage ---
    storage_backend: str = "local"
    local_storage_root: str = "./storage"
    s3_bucket: str = ""
    s3_endpoint: str = ""
    s3_region: str = "ap-southeast-1"
    s3_access_key: str = ""
    s3_secret_key: str = ""
    signed_url_ttl_seconds: int = 300

    # --- CORS ---
    cors_allowed_origins: str = "http://localhost:5173,http://localhost:3000"
    # Phones / other PCs on the same Wi-Fi open the app at http://<LAN-IP>:5173 — allow private-network origins in dev.
    cors_allow_lan_regex: str = r"^https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$"

    # --- Uploads ---
    max_upload_size_mb: int = 10
    allowed_upload_mime_types: str = "application/pdf,image/jpeg,image/png"

    # --- Rate limiting ---
    rate_limit_login_attempts: int = 5
    rate_limit_login_lockout_minutes: int = 15
    rate_limit_payment_initiations_per_window: int = 5
    rate_limit_payment_window_minutes: int = 10

    # --- Logging ---
    log_level: str = "INFO"
    log_json: bool = True

    @field_validator("payment_enabled_methods", "allowed_upload_mime_types", "cors_allowed_origins")
    @classmethod
    def _strip_csv(cls, value: str) -> str:
        return ",".join(part.strip() for part in value.split(",") if part.strip())

    @property
    def cors_origins_list(self) -> List[str]:
        return self.cors_allowed_origins.split(",") if self.cors_allowed_origins else []

    @property
    def payment_enabled_methods_list(self) -> List[str]:
        return self.payment_enabled_methods.split(",") if self.payment_enabled_methods else []

    @property
    def allowed_upload_mime_types_list(self) -> List[str]:
        return self.allowed_upload_mime_types.split(",") if self.allowed_upload_mime_types else []


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (env is read once per process)."""
    return Settings()


settings = get_settings()
