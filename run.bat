@echo off
REM One-command start for Windows:  double-click run.bat
REM Starts the API on :8000 and the web app on :5173 (reachable from your phone on the same Wi-Fi).
cd /d "%~dp0"

echo ==^> Backend
cd backend
if not exist .venv ( python -m venv .venv )
call .venv\Scripts\activate.bat
pip install -q -r requirements-lite.txt
if not exist data\legal_corpus.db (
  echo Building the legal corpus from data\raw ^(one-time, about 20 s^)...
  python -m scripts.build_corpus --raw data\raw
)
start "Legal AI API" cmd /k "call .venv\Scripts\activate.bat && uvicorn app.main:app --host 0.0.0.0 --port 8000"
cd ..

echo ==^> Frontend
cd frontend
if not exist node_modules ( call npm install --no-audit --no-fund )
echo.
echo   PC:     http://localhost:5173
echo   Phone:  http://YOUR-PC-IP:5173  ^(run "ipconfig" to see your IPv4 address; same Wi-Fi; allow port 5173 in the firewall^)
echo.
call npm run dev
