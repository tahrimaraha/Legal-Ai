# Production image for the Legal AI API (FastAPI + trained models).
# Built by deploy/docker-compose.yml — see deploy/README.md.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/app/.hf-cache \
    TOKENIZERS_PARALLELISM=false

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# 1) web/API dependencies
COPY requirements-lite.txt .
RUN pip install -r requirements-lite.txt

# 2) ML dependencies — CPU-only PyTorch keeps the image ~1.5 GB smaller than the default CUDA build
COPY requirements-ml.txt .
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu \
    && pip install -r requirements-ml.txt

# 3) download the multilingual-E5 query encoder at build time, so the server never needs Hugging Face at runtime
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('intfloat/multilingual-e5-small')"
ENV HF_HUB_OFFLINE=1

# 4) application code, corpus (data/legal_corpus.db) and exported models (data/models/)
COPY . .

RUN useradd --create-home --uid 1000 app \
    && mkdir -p /app/storage /app/var \
    && chown -R app:app /app/storage /app/var /app/.hf-cache
USER app

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/api/v1/corpus/stats >/dev/null || exit 1

# migrations, then ONE worker: meeting rooms, model memory and the in-memory rate-limit fallback are per process.
# --proxy-headers: trust X-Forwarded-For from Caddy so rate limits see real visitor IPs (the API port is not public).
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1 --proxy-headers --forwarded-allow-ips='*'"]
