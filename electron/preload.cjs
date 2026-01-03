const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Save game operations
    saveGame: (gameData, slot) => ipcRenderer.invoke('save-game', gameData, slot),
    loadGame: (slot) => ipcRenderer.invoke('load-game', slot),
    getSaveSlots: () => ipcRenderer.invoke('get-save-slots'),
    getMostRecentSlot: () => ipcRenderer.invoke('get-most-recent-slot'),
    deleteSave: (slot) => ipcRenderer.invoke('delete-save', slot),
    clearAllSaves: () => ipcRenderer.invoke('clear-all-saves'),

    // Console logging
    sendLog: (level, message) => ipcRenderer.send('console-log', level, message),

    // Environment info
    isElectron: true,
    platform: process.platform
});

