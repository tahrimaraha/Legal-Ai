#!/bin/sh
# Start command for Render (free Python web service). See RENDER_GUIDE.md.
# Website + API in one service; database is Neon; email via Brevo (HTTPS).
set -e

# Public address: Render sets RENDER_EXTERNAL_URL (e.g. https://legal-ai.onrender.com). Email links use it.
export FRONTEND_URL="${FRONTEND_URL:-$RENDER_EXTERNAL_URL}"
export CORS_ALLOWED_ORIGINS="${CORS_ALLOWED_ORIGINS:-$FRONTEND_URL}"
export FRONTEND_DIST_DIR="${FRONTEND_DIST_DIR:-$(pwd)/frontend/dist}"

cd backend
alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-10000}" --workers 1 \
  --proxy-headers --forwarded-allow-ips='*'
