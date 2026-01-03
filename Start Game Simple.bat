@echo off
cd /d "%~dp0"
echo ========================================
echo      ROAD OF WAR - SIMPLE START
echo ========================================
echo.
echo This will start the game using npm start.
echo.
echo IMPORTANT: If the game window appears but is blank:
echo   1. Press F12 in the game window
echo   2. Check the Console tab for errors
echo   3. Share any red error messages
echo.
echo Starting game...
echo.

node scripts/start-electron-dev.js

echo.
echo Game closed.
pause
