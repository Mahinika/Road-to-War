@echo off
cd /d "%~dp0"
echo ========================================
echo   MANUAL GAME STARTUP
echo ========================================
echo.
echo This will start the game in TWO separate windows:
echo   1. Vite dev server (keep this open)
echo   2. Electron game window
echo.
echo Step 1: Starting Vite server...
echo   → A new window will open for the Vite server
echo   → Wait until you see "ready" in that window
echo   → Then press any key here to continue...
echo.

start "Vite Server" cmd /k "npx vite --port 3000"

timeout /t 3 /nobreak >nul

echo.
echo Step 2: Starting Electron game...
echo   → The game window should appear now
echo   → If you see errors, press F12 in the game window
echo   → Check the Console tab for error messages
echo.

npx cross-env NODE_ENV=development electron .

echo.
echo Game window closed.
echo.
echo To stop the Vite server, close its window or run:
echo   taskkill /F /IM node.exe
echo.
pause
