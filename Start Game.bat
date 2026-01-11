@echo off
cd /d "%~dp0"
title Road of War

echo ========================================
echo   ROAD OF WAR - GODOT GAME
echo ========================================
echo.
echo This game requires Godot 4.x to be installed.
echo.
echo To run the game:
echo 1. Open Godot Editor 4.x
echo 2. Open project: road-to-war\project.godot
echo 3. Press F5 or click Play button
echo.
echo Alternatively, if Godot is in your PATH:
echo   godot --path road-to-war --scene "scenes/Main.tscn"
echo.

REM Try to start Godot directly if it's in PATH
cd road-to-war
godot --path . --scene "scenes/Main.tscn" 2>nul
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Godot executable not found in PATH.
    echo Please install Godot 4.x and add it to your PATH,
    echo or open the project manually in Godot Editor.
    echo.
    pause
)

echo.
echo Game closed.
