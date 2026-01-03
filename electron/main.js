import { app, BrowserWindow, ipcMain, globalShortcut } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'fs';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Keep a global reference of the window object
let mainWindow = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Enable remote debugging port for external tools (like Circuit Electron MCP)
// This allows connecting to an already-running Electron instance
if (isDev) {
    app.commandLine.appendSwitch('remote-debugging-port', '9222');
}

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1024,
        height: 768,
        minWidth: 800,
        minHeight: 600,
        backgroundColor: '#1a1a2e',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: join(__dirname, 'preload.cjs'),
            webSecurity: true,
            // Add Content Security Policy to suppress warnings
            sandbox: false // Required for preload script
        },
        title: 'Road of War',
        show: false // Don't show until ready
    });

    // Set Content Security Policy headers to suppress warnings
    // Note: This warning is expected in development and won't appear in packaged apps
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* http://127.0.0.1:* data: blob:; " +
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* http://127.0.0.1:* blob:; " +
                    "style-src 'self' 'unsafe-inline'; " +
                    "img-src 'self' data: blob: http://localhost:* http://127.0.0.1:*; " +
                    "font-src 'self' data:; " +
                    "connect-src 'self' http://localhost:* http://127.0.0.1:7243 ws://localhost:* wss://localhost:*; " +
                    "worker-src 'self' blob: data:"
                ]
            }
        });
    });

    // Load the app
    if (isDev) {
        // Development: Connect to Vite dev server
        // Try ports in order: 3000, 3001, 3002, etc.
        const tryPorts = [3000, 3001, 3002, 3003, 3004];
        let foundPort = null;
        
        const checkPort = (port) => {
            return new Promise((resolve) => {
                const req = http.get(`http://localhost:${port}`, { timeout: 500 }, (res) => {
                    resolve(port);
                });
                req.on('error', () => resolve(null));
                req.on('timeout', () => {
                    req.destroy();
                    resolve(null);
                });
            });
        };
        
        // Try ports sequentially and load when found
        (async () => {
            for (const port of tryPorts) {
                const result = await checkPort(port);
                if (result) {
                    foundPort = result;
                    const startUrl = `http://localhost:${foundPort}`;
                    console.log(`[Electron] Loading from Vite dev server at ${startUrl}`);
                    await mainWindow.loadURL(startUrl).catch((error) => {
                        console.error(`Failed to load Vite dev server at ${startUrl}:`, error);
                    });
                    return;
                }
            }
            // Fallback to port 3000 if none found
            const startUrl = 'http://localhost:3000';
            console.log(`[Electron] No Vite server found, trying fallback ${startUrl}`);
            await mainWindow.loadURL(startUrl).catch((error) => {
                console.error(`Failed to load Vite dev server at ${startUrl}:`, error);
            });
        })();

        // Open DevTools in development
        mainWindow.webContents.openDevTools();
        
        // Add keyboard shortcut to toggle DevTools (F12 or Ctrl+Shift+I)
        globalShortcut.register('F12', () => {
            if (mainWindow.webContents.isDevToolsOpened()) {
                mainWindow.webContents.closeDevTools();
            } else {
                mainWindow.webContents.openDevTools();
            }
        });
        globalShortcut.register('CommandOrControl+Shift+I', () => {
            if (mainWindow.webContents.isDevToolsOpened()) {
                mainWindow.webContents.closeDevTools();
            } else {
                mainWindow.webContents.openDevTools();
            }
        });
    } else {
        // Production: Load built files
        const indexPath = join(__dirname, '../dist/index.html');
        mainWindow.loadFile(indexPath);
    }

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        console.log('[Electron] Window ready to show, displaying...');
        mainWindow.show();
        console.log('[Electron] Window should now be visible');
    });

    // Fallback: Force show window after 5 seconds in case ready-to-show doesn't fire
    setTimeout(() => {
        if (mainWindow && !mainWindow.isVisible()) {
            console.log('[Electron] Forcing window to show (fallback)');
            mainWindow.show();
            console.log('[Electron] Window forced to show');
        } else if (mainWindow && mainWindow.isVisible()) {
            console.log('[Electron] Window is already visible');
        } else {
            console.log('[Electron] Window object not found or destroyed');
        }
    }, 5000);

    // Handle window closed
    mainWindow.on('closed', () => {
        // Unregister shortcuts when window closes
        if (isDev) {
            globalShortcut.unregisterAll();
        }
        mainWindow = null;
    });

    // Capture console logs from renderer process and write to file
    const logFilePath = join(process.cwd(), 'logs/game-output.log');
    let logFileInitialized = false;
    let initRetryCount = 0;
    const maxInitRetries = 3;

    // Initialize log file on startup - create new file for each run
    const initLogFile = () => {
        if (logFileInitialized) return;
        if (initRetryCount >= maxInitRetries) {
            // Stop retrying after max attempts, but allow appendFileSync to work
            return;
        }
        try {
            const initMessage = `=== Road of War Game Log Started: ${new Date().toISOString()} ===\n`;
            writeFileSync(logFilePath, initMessage, 'utf8');
            logFileInitialized = true;
            console.log('Game log file initialized:', logFilePath);
        } catch (error) {
            initRetryCount++;
            // Only log error on first attempt, silently retry for file locks
            if (initRetryCount === 1 && error.code !== 'EBUSY' && error.code !== 'EPERM') {
                console.error('Failed to initialize log file:', error.message);
            }
            // Try again in case of temporary issues (with exponential backoff)
            setTimeout(initLogFile, 1000 * initRetryCount);
        }
    };

    // Initialize immediately
    initLogFile();
    
    // Function to write log to file
    const writeLogToFile = (logLine) => {
        try {
            // Try to write even if initialization failed (appendFileSync will create file if needed)
            appendFileSync(logFilePath, logLine, 'utf8');
            // Mark as initialized if we successfully wrote
            if (!logFileInitialized) {
                logFileInitialized = true;
            }
        } catch (error) {
            // Silently ignore file lock errors - logs still go to terminal
            if (error.code !== 'EBUSY' && error.code !== 'EPERM') {
                console.error('Failed to write to log file:', error.message);
            }
        }
    };

    // Capture console logs from renderer process (using new API)
    mainWindow.webContents.on('console-message', (event) => {
        const { level, message, line, sourceId } = event;
        
        // Suppress Phaser's "__BASE" texture warnings (harmless, spam)
        const messageStr = String(message || '');
        if (messageStr.includes('__BASE')) {
            return; // Silently ignore
        }
        
        const levelNames = { 0: 'LOG', 1: 'INFO', 2: 'WARNING', 3: 'ERROR' };
        const levelName = levelNames[level] || 'LOG';
        const timestamp = new Date().toISOString();
        const logLine = `[${timestamp}] [Renderer ${levelName}] ${message}\n`;

        // Output to terminal
        console.log(`[Renderer ${levelName}] ${message}`);

        // Append to log file
        writeLogToFile(logLine);
    });

    // Also capture main process logs and write to same file
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    const originalConsoleInfo = console.info;

    console.log = (...args) => {
        const timestamp = new Date().toISOString();
        const message = args.join(' ');
        const logLine = `[${timestamp}] [Main LOG] ${message}\n`;
        writeLogToFile(logLine);
        originalConsoleLog(...args);
    };

    console.warn = (...args) => {
        const timestamp = new Date().toISOString();
        const message = args.join(' ');
        const logLine = `[${timestamp}] [Main WARN] ${message}\n`;
        writeLogToFile(logLine);
        originalConsoleWarn(...args);
    };

    console.error = (...args) => {
        const timestamp = new Date().toISOString();
        const message = args.join(' ');
        const logLine = `[${timestamp}] [Main ERROR] ${message}\n`;
        writeLogToFile(logLine);
        originalConsoleError(...args);
    };

    console.info = (...args) => {
        const timestamp = new Date().toISOString();
        const message = args.join(' ');
        const logLine = `[${timestamp}] [Main INFO] ${message}\n`;
        writeLogToFile(logLine);
        originalConsoleInfo(...args);
    };
}

// App event handlers
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        // On macOS, re-create window when dock icon is clicked
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // On macOS, keep app running even when all windows are closed
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC handlers for save file operations
const getSaveDir = () => {
    const userDataPath = app.getPath('userData');
    const saveDir = join(userDataPath, 'saves');
    
    // Ensure save directory exists
    if (!existsSync(saveDir)) {
        mkdirSync(saveDir, { recursive: true });
    }
    
    return saveDir;
};

const getSaveFilePath = (slot) => {
    return join(getSaveDir(), `save_slot${slot}.json`);
};

const getRecentSavePath = () => {
    return join(getSaveDir(), 'recent.json');
};


// Handle save game
ipcMain.handle('save-game', async (event, gameData, slot = 1) => {
    try {
        if (slot < 1 || slot > 3) {
            throw new Error('Invalid save slot');
        }

        const saveData = {
            ...gameData,
            timestamp: Date.now(),
            slot: slot,
            version: '1.0.0'
        };

        const filePath = getSaveFilePath(slot);
        writeFileSync(filePath, JSON.stringify(saveData, null, 2), 'utf8');

        // Update recent save
        const recentData = {
            slot: slot,
            timestamp: Date.now()
        };
        writeFileSync(getRecentSavePath(), JSON.stringify(recentData, null, 2), 'utf8');

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Handle load game
ipcMain.handle('load-game', async (event, slot = 1) => {
    try {
        if (slot < 1 || slot > 3) {
            throw new Error('Invalid save slot');
        }

        const filePath = getSaveFilePath(slot);
        
        if (!existsSync(filePath)) {
            return { success: false, data: null };
        }

        const fileContent = readFileSync(filePath, 'utf8');
        const saveData = JSON.parse(fileContent);

        return { success: true, data: saveData };
    } catch (error) {
        return { success: false, error: error.message, data: null };
    }
});

// Handle get save slots
ipcMain.handle('get-save-slots', async () => {
    try {
        const slots = [];
        
        for (let i = 1; i <= 3; i++) {
            const filePath = getSaveFilePath(i);
            
            if (existsSync(filePath)) {
                try {
                    const fileContent = readFileSync(filePath, 'utf8');
                    const parsedData = JSON.parse(fileContent);
                    slots.push({
                        slot: i,
                        timestamp: parsedData.timestamp || 0,
                        version: parsedData.version || 'unknown',
                        hasData: true
                    });
                } catch (error) {
                    slots.push({
                        slot: i,
                        timestamp: 0,
                        version: 'corrupted',
                        hasData: false
                    });
                }
            } else {
                slots.push({
                    slot: i,
                    timestamp: 0,
                    version: null,
                    hasData: false
                });
            }
        }

        return { success: true, slots };
    } catch (error) {
        return { success: false, error: error.message, slots: [] };
    }
});

// Handle get most recent slot
ipcMain.handle('get-most-recent-slot', async () => {
    try {
        const recentPath = getRecentSavePath();
        
        if (!existsSync(recentPath)) {
            return { success: true, slot: null };
        }

        const fileContent = readFileSync(recentPath, 'utf8');
        const parsed = JSON.parse(fileContent);
        
        return { success: true, slot: parsed.slot || null };
    } catch (error) {
        return { success: false, error: error.message, slot: null };
    }
});

// Handle delete save
ipcMain.handle('delete-save', async (event, slot = 1) => {
    try {
        if (slot < 1 || slot > 3) {
            throw new Error('Invalid save slot');
        }

        const filePath = getSaveFilePath(slot);
        
        if (existsSync(filePath)) {
            const fs = await import('fs/promises');
            await fs.unlink(filePath);
        }

        // Check if this was the most recent save
        const recentPath = getRecentSavePath();
        if (existsSync(recentPath)) {
            const fileContent = readFileSync(recentPath, 'utf8');
            const parsed = JSON.parse(fileContent);
            if (parsed.slot === slot) {
                const fs = await import('fs/promises');
                await fs.unlink(recentPath);
            }
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Handle clear all saves
ipcMain.handle('clear-all-saves', async () => {
    try {
        const fs = await import('fs/promises');
        const saveDir = getSaveDir();

        for (let i = 1; i <= 3; i++) {
            const filePath = getSaveFilePath(i);
            if (existsSync(filePath)) {
                await fs.unlink(filePath);
            }
        }

        const recentPath = getRecentSavePath();
        if (existsSync(recentPath)) {
            await fs.unlink(recentPath);
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Handle console log from renderer process
ipcMain.on('console-log', (event, level, message) => {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [IPC ${level.toUpperCase()}] ${message}\n`;

    // Output to terminal
    console.log(`[IPC ${level.toUpperCase()}] ${message}`);

    // Append to log file
    const logFilePath = join(process.cwd(), 'logs/game-output.log');
    try {
        appendFileSync(logFilePath, logLine, 'utf8');
    } catch (error) {
        // Silently ignore file write errors
    }
});


