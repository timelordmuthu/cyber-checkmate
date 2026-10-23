@echo off
title CyberCheckmate Launcher
echo ==============================================
echo       Starting CyberCheckmate Locally
echo ==============================================
echo.

echo [1/2] Launching Backend on http://localhost:8000 ...
start "CyberCheckmate Backend" cmd /k "call .\venv\Scripts\activate.bat && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Launching Frontend on http://localhost:5173 ...
start "CyberCheckmate Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Waiting 3 seconds for servers to initialize...
timeout /t 3 >nul

echo Opening browser at http://localhost:5173 ...
start http://localhost:5173

echo.
echo Both servers are running! You can close this launcher window.
