@echo off
cd /d "%~dp0"
echo ========================================
echo   TESTING VITE SERVER
echo ========================================
echo.
echo This will:
echo   1. Start Vite server
echo   2. Test if index.html is accessible
echo   3. Show any errors
echo.
echo Starting Vite...
echo.

start "Vite Test Server" /MIN cmd /c "npx vite --port 3000"

echo Waiting 5 seconds for server to start...
timeout /t 5 /nobreak >nul

echo.
echo Testing if server responds...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✓ Server is responding!
    echo.
    echo Opening in browser to test...
    start http://localhost:3000
) else (
    echo    ✗ Server is NOT responding
    echo    Check the Vite window for errors
)

echo.
echo Keep the Vite window open to see any errors.
echo Press any key to close this window...
pause >nul
