@echo off
cd /d "%~dp0"
echo ========================================
echo      ROAD OF WAR - QUICK TEST
echo ========================================
echo.
echo Starting Vite dev server on port 3000...
start /B npx vite --port 3000 > vite.log 2>&1
timeout /t 3 /nobreak > nul

echo Starting Electron game...
npx cross-env NODE_ENV=development electron .

echo.
echo If a game window appeared, the game is working!
echo If not, check the logs and try the other batch files.
echo.
pause
