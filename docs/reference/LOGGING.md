# Game Logging System

## Overview
The game now has a comprehensive logging system that captures all console output to a file in the `logs/` directory for easy inspection.

## Log File Location
- **File**: `logs/game-output.log`
- **Format**: Timestamped entries with log level and source
- **Example**:
```
[2025-12-27T13:45:00.000Z] [Renderer INFO] HeroFactory initialized
[2025-12-27T13:45:01.000Z] [Main LOG] Game log file initialized
[2025-12-27T13:45:02.000Z] [IPC WARN] Low mana warning
```

## How It Works

### Browser Mode
- Console logs are captured and stored in memory (`window.gameLogs`)
- Persisted to localStorage for session continuity
- Can be exported via `window.exportGameLogs()`

### Electron/Desktop Mode
- Renderer logs sent to main process via IPC
- Main process logs captured and written to file
- File is created/overwritten on each app start

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

### Method 2: Browser Console (Development)
Open browser DevTools and run:
```javascript
// View all captured logs
console.table(window.gameLogs);

// Export logs to file
window.exportGameLogs();

// Clear logs
window.clearGameLogs();
```

## Log Levels Captured
- `LOG` - General information
- `INFO` - Important events
- `WARN` - Warnings
- `ERROR` - Errors
- `DEBUG` - Debug information (not sent to main process in Electron)

## Usage Examples

### In Game Code
```javascript
// Normal logging (captured by system)
console.log('Player leveled up to', level);
console.warn('Low health warning');
console.error('Failed to load save file');

// Structured logging with Logger class
Logger.info('HeroFactory', 'Created hero:', hero.name);
Logger.error('CombatManager', 'Invalid combat state');
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
2. Verify Electron is running (not just browser)
3. Check browser console for JavaScript errors
4. Ensure Vite dev server is running on correct port

### Electron Not Starting
If Electron fails to start:
1. Check Node.js version compatibility
2. Verify all dependencies are installed: `npm install`
3. Check for syntax errors in `electron/main.js`
4. Try browser mode first: `npm run dev`

### Log File Not Updating
1. Electron main process may have crashed
2. File permissions issue
3. Check terminal output for Electron errors

## Log Files Created
- `logs/game-output.log` - Main game log file
- Browser downloads: `game-logs-YYYY-MM-DDTHH-MM-SS.txt` (when exported)

The logging system is designed to be non-intrusive and automatically capture all relevant game activity for debugging and monitoring.
