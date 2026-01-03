@echo off
cd /d "%~dp0"
echo ========================================
echo   CHECKING GAME STATUS
echo ========================================
echo.

echo [1] Checking if Vite server is running on port 3000...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✓ Vite server is running
) else (
    echo    ✗ Vite server is NOT running
    echo    → Start it with: npx vite --port 3000
)
echo.

echo [2] Checking if Electron processes are running...
tasklist /FI "IMAGENAME eq electron.exe" 2>nul | find /I /N "electron.exe">nul
if %errorlevel% equ 0 (
    echo    ✓ Electron is running
) else (
    echo    ✗ Electron is NOT running
)
echo.

echo [3] Checking if Node processes are running...
tasklist /FI "IMAGENAME eq node.exe" 2>nul | find /I /N "node.exe">nul
if %errorlevel% equ 0 (
    echo    ✓ Node.js processes are running
) else (
    echo    ✗ No Node.js processes found
)
echo.

echo [4] Checking recent log files...
if exist "logs\game-output.log" (
    echo    ✓ game-output.log exists
    for %%A in ("logs\game-output.log") do echo    → Last modified: %%~tA
) else (
    echo    ✗ game-output.log not found
)
echo.

if exist "logs\vite.log" (
    echo    ✓ vite.log exists
    for %%A in ("logs\vite.log") do echo    → Last modified: %%~tA
) else (
    echo    ✗ vite.log not found
)
echo.

echo ========================================
echo   QUICK FIXES
echo ========================================
echo.
echo If Vite is not running:
echo   1. Open a new terminal
echo   2. Run: npx vite --port 3000
echo   3. Wait for "ready" message
echo   4. Then run: npx cross-env NODE_ENV=development electron .
echo.
echo If you see errors in the Electron window:
echo   1. Press F12 to open DevTools
echo   2. Check the Console tab for red errors
echo   3. Share those errors for help
echo.
pause
