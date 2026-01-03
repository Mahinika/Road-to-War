@echo off
cd /d "%~dp0"
echo ========================================
echo      ROAD OF WAR - STARTUP TEST
echo ========================================
echo.
echo This will test if the game starts properly.
echo.
echo Step 1: Checking if Node.js and npm are available...
echo.

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not available!
    echo Please reinstall Node.js
    pause
    exit /b 1
)

echo ✓ Node.js and npm are available
echo.
echo Step 2: Checking if project dependencies are installed...

if not exist "node_modules" (
    echo ERROR: node_modules directory not found!
    echo Please run: npm install
    pause
    exit /b 1
)

echo ✓ Dependencies appear to be installed
echo.
echo Step 3: Starting the game...
echo.
echo If you see "VITE ready" and "Electron" messages,
echo then the game should open in a new window.
echo.
echo If no window appears, check if it's minimized or behind other windows.
echo You can also try pressing Alt+Tab to cycle through windows.
echo.

npm start

echo.
echo Game startup complete.
echo If you didn't see a game window, check the troubleshooting steps above.
echo.
pause
