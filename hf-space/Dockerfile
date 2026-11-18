# Legal AI on a free Hugging Face Space (Docker SDK) — one container: website + API + AI + Redis.
# The database is external (Neon, free). Copy this file and README.md into the Space; see hf-space/GUIDE.md.
#
# The source is cloned from GitHub at build time. To rebuild with new code: Space -> Settings -> Factory rebuild.
# Local test (uses your working copy instead of GitHub):
#   docker build --build-context src=. -f hf-space/Dockerfile -t legalai-hf hf-space

ARG REPO=https://github.com/tahrimaraha/Legal-Ai.git

# ---- source --------------------------------------------------------------------------------------------
FROM alpine/git:latest AS src
ARG REPO
ARG CACHEBUST=1
RUN git clone --depth 1 "$REPO" /src && rm -rf /src/.git

# ---- website build -------------------------------------------------------------------------------------
FROM node:20-alpine AS web
WORKDIR /web
COPY --from=src /src/frontend/package.json /src/frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY --from=src /src/frontend/ ./
RUN npx vite build

# ---- runtime -------------------------------------------------------------------------------------------
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 \
    HF_HOME=/app/.hf-cache TOKENIZERS_PARALLELISM=false
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends redis-server curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=src /src/backend/requirements-lite.txt /src/backend/requirements-ml.txt ./
RUN pip install -r requirements-lite.txt \
    && pip install torch --index-url https://download.pytorch.org/whl/cpu \
    && pip install -r requirements-ml.txt
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('intfloat/multilingual-e5-small')"

COPY --from=src /src/backend/ /app/
COPY --from=src /src/hf-space/start.sh /app/start.sh
COPY --from=web /web/dist /app/web

# Hugging Face runs the container as user 1000
RUN useradd --create-home --uid 1000 user \
    && mkdir -p /app/storage /app/var \
    && chmod +x /app/start.sh \
    && chown -R user:user /app/storage /app/var /app/.hf-cache
USER user

ENV HF_HUB_OFFLINE=1 \
    APP_ENV=production \
    DEBUG=false \
    FRONTEND_DIST_DIR=/app/web \
    REDIS_URL=redis://127.0.0.1:6379/0 \
    REFRESH_COOKIE_SECURE=true \
    LOCAL_STORAGE_ROOT=/app/storage \
    EMAIL_PROVIDER=brevo \
    PORT=7860

EXPOSE 7860
CMD ["/app/start.sh"]
