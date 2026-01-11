# Game Logging System

## Overview
The game now has a comprehensive logging system that captures all console output to a file in the `logs/` directory for easy inspection.

## Log File Location
- **File**: `logs/game-output.log`
- **Format**: Timestamped entries with log level and source
- **Example**:
```
[2026-01-10T22:14:27.639Z] [INFO] EventBus: Initialized
[2026-01-10T22:14:27.700Z] [INFO] HeroFactory: Created hero: Warrior (warrior_warrior, Level 1)
[2026-01-10T22:14:28.123Z] [WARN] CombatManager: Low mana warning for hero_12345
```

## How It Works

### Godot Logging System
- All logs captured by Godot Logger singleton (Autoload)
- Logs written to `logs/game-output.log` file with timestamps
- File persists across game sessions
- Structured logging with log levels (INFO, WARN, ERROR, DEBUG)

## Checking Logs

### Method 1: Read the File Directly
```bash
# View last 50 lines
node scripts/check-logs.js

# View last 100 lines
node scripts/check-logs.js 100

# View all logs
node scripts/check-logs.js all
```

### Method 2: Godot Editor Console
Open Godot Editor Output panel or run the game from editor to see real-time logs.

## Log Levels Captured
- `LOG` - General information
- `INFO` - Important events
- `WARN` - Warnings
- `ERROR` - Errors
- `DEBUG` - Debug information (available in Godot editor console)

## Usage Examples

### In Game Code
```gdscript
# Normal logging (captured by Logger singleton)
_log_info("HeroFactory", "Player leveled up to %d" % level)
_log_warn("CombatManager", "Low health warning")
_log_error("SaveManager", "Failed to load save file")

# Structured logging with Logger singleton methods
var logger = get_node_or_null("/root/Logger")
if logger:
    logger.info("HeroFactory", "Created hero: %s" % hero.name)
    logger.error("CombatManager", "Invalid combat state")
```

### Checking Logs During Development
```bash
# Quick check of recent logs
node scripts/check-logs.js 20

# Monitor logs in real-time (if using a file watcher)
tail -f logs/game-output.log
```

## Troubleshooting

### No Logs Appearing
1. Check if `logs/game-output.log` exists
2. Verify Godot game is running
3. Check Godot editor console for errors
4. Ensure Logger singleton is properly initialized

### Game Not Starting
If Godot fails to start:
1. Check if Godot 4.x is installed
2. Verify project.godot file exists and is valid
3. Check Godot editor console for errors
4. Try opening project directly in Godot editor

### Log File Not Updating
1. Game process may have crashed
2. File permissions issue
3. Check Godot editor output for errors

## Log Files Created
- `logs/game-output.log` - Main game log file (automatically managed)

The logging system is designed to be non-intrusive and automatically capture all relevant game activity for debugging and monitoring.
