@echo off
cd /d "%~dp0"
echo ========================================
echo   ROAD OF WAR - DIAGNOSTIC TOOL
echo ========================================
echo.

echo [1/5] Checking Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    pause
    exit /b 1
)
echo OK
echo.

echo [2/5] Checking npm...
npm --version
if %errorlevel% neq 0 (
    echo ERROR: npm not found!
    pause
    exit /b 1
)
echo OK
echo.

echo [3/5] Checking if dependencies are installed...
if not exist "node_modules" (
    echo ERROR: node_modules not found! Run: npm install
    pause
    exit /b 1
)
echo OK
echo.

echo [4/5] Checking if Vite is available...
npx vite --version
if %errorlevel% neq 0 (
    echo ERROR: Vite not found! Run: npm install
    pause
    exit /b 1
)
echo OK
echo.

echo [5/5] Checking if Electron is available...
npx electron --version
if %errorlevel% neq 0 (
    echo ERROR: Electron not found! Run: npm install
    pause
    exit /b 1
)
echo OK
echo.

echo ========================================
echo   ALL CHECKS PASSED
echo ========================================
echo.
echo The game should be able to start.
echo.
echo If the game still won't start, try:
echo   1. Start Game Browser.bat (to test in browser)
echo   2. Check logs\game-output.log for errors
echo   3. Check if port 3000 is already in use
echo.
pause
