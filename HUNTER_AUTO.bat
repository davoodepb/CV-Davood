@echo off
title DAVOOD HUNTER AI — FULLY AUTO
color 0A
cls
echo.
echo  =====================================================
echo    DAVOOD HUNTER AI OS — FULLY AUTONOMOUS MODE
echo    Trading Room Hunter — Always-On Agent
echo  =====================================================
echo.
echo  Starting server + ngrok tunnel...
echo  DO NOT CLOSE THIS WINDOW while sleeping!
echo.

cd /d "%~dp0"

echo [1/2] Starting trading server on port 8000...
start /min python main.py
timeout /t 3 /nobreak >nul

echo [2/2] Starting ngrok tunnel...
start /min ngrok.exe http 8000
timeout /t 5 /nobreak >nul

echo.
echo  Getting your public URL...
echo.
curl -s http://localhost:4040/api/tunnels | python -c "import sys,json; d=json.load(sys.stdin); print('  YOUR PUBLIC URL:', d['tunnels'][0]['public_url'])"
echo.
echo  =====================================================
echo    SERVER + NGROK RUNNING
echo    Agent is HUNTING 24/7
echo    Kill zones: London 08-11, NY 13:30-16:00 (Lisbon)
echo    Press Ctrl+C to stop
echo  =====================================================
echo.
pause
