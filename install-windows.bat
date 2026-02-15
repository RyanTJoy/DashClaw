@echo off
setlocal EnableExtensions
title DashClaw Setup
color 0A

echo.
echo  ========================================
echo   DashClaw Setup
echo  ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please download and install Node.js from:
    echo https://nodejs.org/
    echo.
    echo Choose the LTS version, then run this installer again.
    echo.
    start https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js found:
node --version
echo.

:: Run the interactive setup script
call node scripts/setup.mjs

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Setup failed. See errors above.
    pause
    exit /b 1
)

:: Create start script
echo @echo off > START-DASHBOARD.bat
echo title DashClaw >> START-DASHBOARD.bat
echo echo Starting DashClaw... >> START-DASHBOARD.bat
echo echo. >> START-DASHBOARD.bat
echo echo Opening http://localhost:3000 in your browser... >> START-DASHBOARD.bat
echo timeout /t 3 /nobreak ^>nul >> START-DASHBOARD.bat
echo start http://localhost:3000 >> START-DASHBOARD.bat
echo npm run dev >> START-DASHBOARD.bat

echo [OK] Created START-DASHBOARD.bat for easy launching
echo.
pause
