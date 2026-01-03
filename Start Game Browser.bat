@echo off
cd /d "%~dp0"
echo ========================================
echo   ROAD OF WAR - BROWSER MODE
echo ========================================
echo.
echo Starting Vite dev server...
echo.
npx vite --port 3000

echo.
echo When ready, open this URL in your browser:
echo http://localhost:3000
echo.
pause
