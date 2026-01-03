@echo off
setlocal
cd /d "%~dp0"
echo.
echo === Road of War: Manager Tool ===
echo This will generate multi-agent prompts under agent-out\prompts\
echo.
npm run manager -- --open
echo.
echo Done.
pause
endlocal




