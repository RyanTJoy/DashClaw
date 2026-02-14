@echo off
setlocal EnableExtensions
title DashClaw Installer
color 0A

echo.
echo  ========================================
echo   DashClaw - Easy Installer
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

:: Check for .env.local
if not exist ".env.local" (
    echo.
    echo  ----------------------------------------
    echo   DATABASE SETUP REQUIRED
    echo  ----------------------------------------
    echo.
    echo You need a Neon database connection string.
    echo.
    echo 1. Go to https://neon.tech and create a FREE account
    echo 2. Create a new project
    echo 3. Copy the connection string (starts with postgresql://)
    echo.
    
    echo.
    echo Paste your DATABASE_URL when prompted.
    echo.

    for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command "Read-Host 'Paste your DATABASE_URL here'"`) do set "DATABASE_URL=%%A"

    if "%DATABASE_URL%"=="" (
        echo [ERROR] No DATABASE_URL provided. Exiting.
        pause
        exit /b 1
    )
)

echo.
echo [STEP 0/3] Initializing .env.local (secrets + API key)...
echo.
if "%DATABASE_URL%"=="" (
    call node scripts/init-self-host-env.mjs
) else (
    call node scripts/init-self-host-env.mjs --database-url "%DATABASE_URL%"
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to initialize .env.local
    pause
    exit /b 1
)

echo.
echo [STEP 1/3] Installing dependencies...
echo This may take a few minutes...
echo.
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to install dependencies.
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)

echo.
echo [STEP 2/3] Building the dashboard...
echo.
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] Build had issues, but we'll try to run anyway...
)

echo.
echo  ========================================
echo   INSTALLATION COMPLETE!
echo  ========================================
echo.
echo To start the dashboard:
echo   Double-click START-DASHBOARD.bat
echo.
echo Or run manually:
echo   npm run dev
echo.
echo The dashboard will open at http://localhost:3000
echo.

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
