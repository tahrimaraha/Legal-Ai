#!/bin/sh
# Start script for the Hugging Face Space container (see hf-space/Dockerfile).
set -e

# Public address: Hugging Face sets SPACE_HOST (e.g. tahrimaraha-legal-ai.hf.space). Email links use it.
if [ -z "$FRONTEND_URL" ] && [ -n "$SPACE_HOST" ]; then
  export FRONTEND_URL="https://$SPACE_HOST"
fi
export CORS_ALLOWED_ORIGINS="${CORS_ALLOWED_ORIGINS:-$FRONTEND_URL}"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set. Add your Neon connection string as a Space secret (see GUIDE.md)." >&2
  exit 1
fi
if [ -z "$JWT_SECRET" ]; then
  echo "ERROR: JWT_SECRET is not set. Add a long random string as a Space secret (see GUIDE.md)." >&2
  exit 1
fi

# Redis inside the container: rate limits and cooldowns (no data worth persisting)
redis-server --daemonize yes --save "" --appendonly no --dir /tmp --bind 127.0.0.1 --port 6379

cd /app
alembic upgrade head
# One worker: video-call rooms, the AI models and in-memory fallbacks live in this process.
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-7860}" --workers 1 \
  --proxy-headers --forwarded-allow-ips='*'
