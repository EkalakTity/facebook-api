@echo off
REM Facebook Personal Agent - Setup Script for Windows CMD
REM This script automates the initial setup process

setlocal enabledelayedexpansion

cls
echo.
echo ========================================================
echo   Facebook Personal Agent - Setup
echo ========================================================
echo.
echo This script will:
echo   1. Check Node.js and npm installation
echo   2. Install dependencies
echo   3. Install Playwright browsers
echo   4. Create/update .env configuration
echo   5. Initialize database
echo   6. Set up browser profile for Facebook
echo.

REM Check Node.js
echo [1/6] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo X ERROR: Node.js not found. Please install from https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo. [OK] Node.js installed: %NODE_VERSION%

REM Check npm
echo.
echo [2/6] Checking npm installation...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo X ERROR: npm not found
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo. [OK] npm installed: v%NPM_VERSION%

REM Install dependencies
echo.
echo [3/6] Installing dependencies...
echo     (This may take a minute...)
call npm install --silent
if %errorlevel% neq 0 (
    echo X ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo. [OK] Dependencies installed

REM Install Playwright
echo.
echo [4/6] Installing Playwright browsers...
echo     (This may take 2-5 minutes, downloading ~1GB...)
call npx playwright install chromium --with-deps
if %errorlevel% neq 0 (
    echo X ERROR: Failed to install Playwright browsers
    pause
    exit /b 1
)
echo. [OK] Playwright browsers installed

REM Setup .env
echo.
echo [5/6] Configuring environment...
if exist .env (
    echo. [OK] .env file already exists
    set /p OVERWRITE="Overwrite with default settings? (y/n): "
    if /i "!OVERWRITE!"=="y" (
        copy /Y .env.example .env >nul
        echo. [OK] .env updated from template
    ) else (
        echo. Skipping .env update
    )
) else (
    copy .env.example .env
    echo. [OK] .env created from template
)

REM Initialize database
echo.
echo [6/6] Setting up database...
call npm run migrate >nul 2>&1
if %errorlevel% neq 0 (
    echo X ERROR: Failed to initialize database
    pause
    exit /b 1
)
echo. [OK] Database initialized with 7 tables

REM Browser profile setup
cls
echo.
echo ========================================================
echo   Browser Profile Setup
echo ========================================================
echo.
echo Now you need to set up a browser profile with Facebook login.
echo.
echo Follow these steps:
echo.
echo   1. Open Chrome or Firefox with a new profile:
echo.
echo      For Chrome:
echo      "C:\Program Files\Google\Chrome\Application\chrome.exe"^
echo       --user-data-dir="%%USERPROFILE%%\Facebook_Profile"
echo.
echo      For Firefox:
echo      "C:\Program Files\Mozilla Firefox\firefox.exe"^
echo       -profile "%%USERPROFILE%%\AppData\Roaming\Mozilla\Firefox\Profiles\facebook_profile"
echo.
echo   2. Log into Facebook with your account
echo.
echo   3. Close the browser (keep it logged in)
echo.
echo   4. Update .env with the profile path:
echo      BROWSER_PROFILE_PATH=C:\Users\YOUR_USERNAME\Facebook_Profile
echo.

set /p READY="Have you completed the browser profile setup? (y/n): "
if /i "!READY!"=="y" (
    set /p PROFILE_PATH="Enter your browser profile path (or press Enter to skip): "
    if not "!PROFILE_PATH!"=="" (
        echo. Updating .env with profile path...
        REM Note: This is a simple replacement, proper escaping may be needed
        powershell -Command "(Get-Content '.env') -replace 'BROWSER_PROFILE_PATH=.*', 'BROWSER_PROFILE_PATH=!PROFILE_PATH!' | Set-Content '.env'"
        echo. [OK] Profile path updated in .env
    )
)

REM Summary
cls
echo.
echo ========================================================
echo   Setup Complete!
echo ========================================================
echo.
echo Next steps:
echo   1. Review .env file and ensure BROWSER_PROFILE_PATH is correct
echo   2. Run the agent:
echo.
echo      npm run agent
echo.
echo   3. Select 'เริ่มงานใหม่' ^(New Job^) to start scanning
echo.
echo Troubleshooting:
echo   - Browser won't start? Ensure profile path is absolute and correct
echo   - Not logged in? Login to Facebook in the profile before running agent
echo   - Database error? Run: npm run migrate
echo.
echo Documentation:
echo   - VERIFICATION_REPORT.md - Full implementation details
echo   - PROJECT_MEMORY.md - System architecture and flow
echo   - TASKS.md - Implementation checklist
echo.
pause
