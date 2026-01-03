@echo off
cd /d "%~dp0"
echo Capturing Vite errors...
echo.
echo Starting Vite and redirecting ALL output to vite-error.log
echo This will help us see the actual error causing the 500 responses.
echo.

npx vite --port 3000 --force > vite-error.log 2>&1

echo.
echo Vite stopped. Check vite-error.log for the actual error.
echo.
pause
