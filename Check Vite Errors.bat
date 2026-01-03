@echo off
cd /d "%~dp0"
echo ========================================
echo   CHECKING VITE ERRORS
echo ========================================
echo.
echo This will start Vite and show detailed error messages.
echo Look for any red error text.
echo.
echo Starting Vite dev server...
echo Press Ctrl+C to stop when done.
echo.

npx vite --port 3000 --debug

pause
