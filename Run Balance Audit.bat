@echo off
cd /d "%~dp0"
echo ========================================
echo      ROAD OF WAR - BALANCE AUDIT
echo ========================================
echo.
echo This will run the balance audit and generate a fresh report.
echo.
echo The report will be written to:
echo   - .cursor\stats_audit_report.json
echo   - user://stats_audit_report.json (in Godot app data)
echo.
echo To run this audit:
echo   1. Open Godot
echo   2. Load the project at: road-to-war\project.godot
echo   3. Open scene: road-to-war\scenes\RunBalanceAudit.tscn
echo   4. Press F5 to run (or click Play)
echo.
echo OR:
echo   1. Open Godot
echo   2. Load the project
echo   3. Open scene: road-to-war\scenes\TestRunner.tscn
echo   4. The audit will run automatically
echo.
echo Press any key to continue...
pause >nul
