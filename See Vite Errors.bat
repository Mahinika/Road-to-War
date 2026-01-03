@echo off
cd /d "%~dp0"
echo ========================================
echo   VITE ERROR DIAGNOSTIC
echo ========================================
echo.
echo This will start Vite and show ALL error messages.
echo Look for red text that mentions:
echo   - combat-handler.js
echo   - loot-manager.js
echo   - main.js
echo   - SyntaxError
echo   - Import errors
echo.
echo Starting Vite with full error output...
echo Press Ctrl+C to stop.
echo.

npx vite --port 3000 --force --debug

pause
