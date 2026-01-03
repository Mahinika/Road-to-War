@echo off
cd /d "%~dp0"
echo Starting Road of War in Debug Mode...
echo.
echo Step 1: Starting Vite dev server on port 3000
echo.
npm run dev > logs\vite-debug.log 2>&1
echo.
echo Vite server started. If you see errors above, check logs\vite-debug.log
echo.
echo Step 2: Starting Electron (this will open the game window)
echo.
timeout /t 3 /nobreak > nul
npm run electron:dev
echo.
pause
