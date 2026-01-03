# Console Log Capture Research - Simple Approaches

## Overview
Research on capturing console logs in real-time for both Electron (desktop) and browser environments without complex infrastructure.

## Current State
- Electron already opens DevTools in dev mode (`mainWindow.webContents.openDevTools()`)
- Game uses standard `console.log/warn/error` throughout codebase
- No existing log capture system (previous logging system was removed)

## Simple Approaches

### 1. Electron: Capture Renderer Console Logs (Simplest)

**Approach**: Use Electron's built-in `webContents.on('console-message')` event to capture all console output from the renderer process.

**Implementation** (in `electron/main.js`):
```javascript
// After creating BrowserWindow
mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levelNames = ['', 'INFO', 'WARNING', 'ERROR'];
    console.log(`[Renderer ${levelNames[level] || 'LOG'}] ${message}`);
    // Optionally write to file or send to external service
});
```

**Pros**:
- Zero code changes in game code
- Captures all console output automatically
- Works in both dev and production
- No performance impact

**Cons**:
- Only captures renderer process logs (main process logs go to terminal)
- No filtering or formatting control

---

### 2. Override Console Methods (Universal - Browser + Electron)

**Approach**: Override `console.log/warn/error` to capture logs before they're printed.

**Implementation** (in `src/main.js` or preload):
```javascript
// Store original console methods
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

// Capture logs
const logBuffer = [];
const maxLogs = 100;

function captureLog(level, ...args) {
    const timestamp = new Date().toISOString();
    const logEntry = { level, timestamp, message: args.join(' ') };
    
    logBuffer.push(logEntry);
    if (logBuffer.length > maxLogs) logBuffer.shift();
    
    // Call original console method
    if (level === 'log') originalLog(...args);
    else if (level === 'warn') originalWarn(...args);
    else originalError(...args);
    
    // In Electron: send to main process via IPC
    if (window.electronAPI?.sendLog) {
        window.electronAPI.sendLog(logEntry);
    }
}

// Override console methods
console.log = (...args) => captureLog('log', ...args);
console.warn = (...args) => captureLog('warn', ...args);
console.error = (...args) => captureLog('error', ...args);

// Expose log buffer for inspection
window.gameLogs = logBuffer;
```

**Pros**:
- Works in both browser and Electron
- Full control over log formatting
- Can filter, buffer, or send logs anywhere
- Easy to add in-game overlay

**Cons**:
- Requires overriding console (minor risk if done incorrectly)
- Need to handle all console methods if you want complete coverage

---

### 3. In-Game Debug Overlay (Visual Feedback)

**Approach**: Create a simple Phaser UI element that displays recent logs on-screen.

**Implementation** (in `src/scenes/game-world.js`):
```javascript
createDebugOverlay() {
    if (!this.settings.showDebugLogs) return;
    
    this.debugLogs = [];
    this.debugText = this.add.text(10, 10, '', {
        fontSize: '12px',
        fill: '#00ff00',
        backgroundColor: '#000000',
        padding: { x: 5, y: 5 }
    }).setScrollFactor(0).setDepth(1000);
    
    // Listen to console logs (if using override approach)
    window.addEventListener('gameLog', (e) => {
        this.addDebugLog(e.detail.level, e.detail.message);
    });
}

addDebugLog(level, message) {
    const colors = { log: '#ffffff', warn: '#ffff00', error: '#ff0000' };
    const entry = `[${level.toUpperCase()}] ${message}`;
    
    this.debugLogs.push(entry);
    if (this.debugLogs.length > 20) this.debugLogs.shift();
    
    this.debugText.setText(this.debugLogs.join('\n'));
    this.debugText.setColor(colors[level] || '#ffffff');
}
```

**Pros**:
- Visual feedback during gameplay
- No need to open DevTools
- Can be toggled on/off

**Cons**:
- Only shows logs when overlay is active
- Requires integration with log capture system
- May impact performance if too many logs

---

### 4. Electron IPC Log Forwarding (Advanced Simple)

**Approach**: Forward renderer console logs to main process via IPC for file logging or external monitoring.

**Implementation**:

**In `electron/preload.js`**:
```javascript
// Override console to send via IPC
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

console.log = (...args) => {
    originalLog(...args);
    ipcRenderer.send('console-log', 'log', args.join(' '));
};

console.warn = (...args) => {
    originalWarn(...args);
    ipcRenderer.send('console-log', 'warn', args.join(' '));
};

console.error = (...args) => {
    originalError(...args);
    ipcRenderer.send('console-log', 'error', args.join(' '));
};
```

**In `electron/main.js`**:
```javascript
ipcMain.on('console-log', (event, level, message) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    // Optionally write to file
});
```

**Pros**:
- Centralized log handling
- Can write to file automatically
- Works in production builds

**Cons**:
- Requires IPC setup
- Slightly more complex than approach #1

---

## Recommended Solution: Hybrid Approach

**For Development**:
- Use Electron's `webContents.on('console-message')` (Approach #1)
- Keep DevTools open automatically
- Zero code changes needed

**For Production Debugging**:
- Add simple console override (Approach #2)
- Store last 50-100 logs in memory
- Expose via `window.gameLogs` for inspection
- Optional: Add IPC forwarding to main process for file logging

**For Visual Feedback** (Optional):
- Add debug overlay toggle (F8 key)
- Show recent logs on-screen
- Only active when enabled in options

## Implementation Complexity

| Approach | Complexity | Code Changes | Performance Impact |
|----------|-----------|--------------|-------------------|
| Electron webContents | ⭐ Very Low | Main process only | None |
| Console Override | ⭐⭐ Low | One file (main.js) | Minimal |
| In-Game Overlay | ⭐⭐⭐ Medium | Game scene + override | Low |
| IPC Forwarding | ⭐⭐ Low | Preload + main | Minimal |

## Next Steps

1. **Start Simple**: Implement Approach #1 (webContents) for Electron
2. **Add Override**: If needed, add console override for browser compatibility
3. **Optional Overlay**: Add visual debug overlay if visual feedback is desired
4. **File Logging**: Add file writing if persistent logs are needed

## Notes

- All approaches are non-breaking (logs still go to console)
- Can combine multiple approaches
- No external dependencies required
- Works with existing codebase without refactoring

