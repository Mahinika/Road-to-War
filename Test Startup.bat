@echo off
cd /d "%~dp0"
echo ========================================
echo   TESTING GAME STARTUP
echo ========================================
echo.
echo This will test if the game can start properly.
echo All output will be saved to logs\startup-test.log
echo.

REM Clean up old processes
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM electron.exe >nul 2>&1

echo [TEST] Starting Vite server...
start /MIN "Vite Test" cmd /c "npx vite --port 3000 > logs\vite-test.log 2>&1"

echo [TEST] Waiting 5 seconds for server to start...
timeout /t 5 /nobreak >nul

echo [TEST] Testing if server responds...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo [TEST] Server is responding! ✓
) else (
    echo [TEST] Server might not be ready yet...
)

echo.
echo [TEST] Starting Electron (this will open a window)...
echo [TEST] The window should show the game loading.
echo [TEST] If you see errors, they will appear in the window.
echo.
echo Press Ctrl+C in this window to stop the test.
echo.

npx cross-env NODE_ENV=development electron . 2>&1 | tee logs\electron-test.log

echo.
echo [TEST] Test complete. Check logs\startup-test.log for details.
pause
