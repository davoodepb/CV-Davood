@echo off
title DAVOOD HUNTER AI OS v1.0 — TRH
color 0A
cls
echo.
echo  =====================================================
echo    DAVOOD HUNTER AI OS v1.0
echo    Trading Room Hunter ^(TRH^) — Liquidity Trap System
echo  =====================================================
echo.
echo    [1] Test AI Brain ^(recommended first^)
echo    [2] Start Full Trading Server
echo    [3] Exit
echo.
set /p c="  Choose (1/2/3): "
if "%c%"=="1" (
    cls
    echo.
    echo  Starting AI Brain Test...
    echo  You will need your API key ready.
    echo.
    cd /d "%~dp0"
    python test_ai_os.py
    pause
)
if "%c%"=="2" (
    cls
    echo.
    echo  Starting DAVOOD HUNTER SERVER...
    echo  URL: http://localhost:8000/health
    echo  Press Ctrl+C to stop
    echo.
    cd /d "%~dp0"
    python main.py
    pause
)
if "%c%"=="3" exit
