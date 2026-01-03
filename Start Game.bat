@echo off
cd /d "%~dp0"
title Road of War

REM Clean up any existing processes
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM electron.exe >nul 2>&1
timeout /t 1 /nobreak >nul

echo Starting Road of War...
echo.

REM Start Vite server in background (minimized)
start /MIN "" cmd /c "cd /d %~dp0 && npx vite --port 3000"

REM Wait for server to be ready
timeout /t 6 /nobreak >nul

REM Start Electron (this will show the game window)
npx cross-env NODE_ENV=development electron .

REM Cleanup when game closes
taskkill /F /IM node.exe >nul 2>&1
