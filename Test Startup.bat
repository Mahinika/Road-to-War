@echo off
cd /d "%~dp0"
echo ========================================
echo   TESTING GODOT GAME STARTUP
echo ========================================
echo.
echo This will test if the Godot game can start properly.
echo All output will be saved to logs\godot-test.log
echo.

echo [TEST] Starting Godot game...
echo [TEST] The game window should open automatically.
echo [TEST] If you see errors, check the Godot console output.
echo.
echo Press Ctrl+C in this window to stop the test.
echo.

REM Start Godot directly
cd road-to-war
godot --path . --scene "scenes/Main.tscn" --headless --quit-after 10 2>&1 | tee ..\logs\godot-test.log

echo.
echo [TEST] Test complete. Check logs\godot-test.log for details.
pause
