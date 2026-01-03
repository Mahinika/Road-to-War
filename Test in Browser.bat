@echo off
cd /d "%~dp0"
echo ========================================
echo   TESTING GAME IN BROWSER
echo ========================================
echo.
echo This will:
echo   1. Start the Vite dev server
echo   2. Open the game in your default browser
echo   3. You can see errors in the browser console (F12)
echo.
echo Starting Vite server...
echo.

start "Vite Server" /MIN cmd /c "npx vite --port 3000"

echo Waiting 5 seconds for server to start...
timeout /t 5 /nobreak >nul

echo Opening game in browser...
start http://localhost:3000

echo.
echo ========================================
echo   IMPORTANT: CHECK FOR ERRORS
echo ========================================
echo.
echo 1. The game should open in your browser
echo 2. Press F12 to open Developer Tools
echo 3. Click the "Console" tab
echo 4. Look for RED error messages
echo 5. Copy any errors and share them
echo.
echo If you see a blank/black screen:
echo   → Check the Console tab for errors
echo   → The errors will tell us what's wrong
echo.
echo Keep this window open. Close it when done testing.
echo.
pause
