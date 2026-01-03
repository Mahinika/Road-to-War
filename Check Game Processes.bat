@echo off
cd /d "%~dp0"
echo Checking if Road of War processes are running...
echo.
echo Looking for Vite and Electron processes:
echo.

tasklist /fi "imagename eq node.exe" /fo table | findstr /i "node.exe"
tasklist /fi "imagename eq electron.exe" /fo table | findstr /i "electron.exe"

echo.
echo If you see processes above, the game might be running.
echo Try Alt+Tab to switch between windows, or check the taskbar.
echo.
echo If no processes are running, the game failed to start.
echo Check the logs\game-output.log file for errors.
echo.
pause
