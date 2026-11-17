#!/usr/bin/env bash
# One-command start for macOS / Linux:  ./run.sh
# Starts the API on :8000 and the web app on :5173 (reachable from your phone on the same Wi-Fi).
set -e
cd "$(dirname "$0")"

echo "==> Backend"
cd backend
[ -d .venv ] || python3 -m venv .venv
# shellcheck disable=SC1091
. .venv/bin/activate
pip install -q -r requirements-lite.txt
if [ ! -f data/legal_corpus.db ]; then
  echo "Building the legal corpus from data/raw (one-time, ~20 s)..."
  python -m scripts.build_corpus --raw data/raw
fi
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACK=$!
trap 'kill $BACK 2>/dev/null' EXIT
cd ..

echo "==> Frontend"
cd frontend
[ -d node_modules ] || npm install --no-audit --no-fund
IP=$( (hostname -I 2>/dev/null | awk '{print $1}') || true )
[ -n "$IP" ] || IP=$( (ipconfig getifaddr en0 2>/dev/null) || true )
echo
echo "  PC:     http://localhost:5173"
[ -n "$IP" ] && echo "  Phone:  http://$IP:5173   (same Wi-Fi; allow the port in your firewall if it does not load)"
echo
npm run dev
