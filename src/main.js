import Phaser from 'phaser';
import { MainScene } from './scenes/main-menu.js';
import { GameScene } from './scenes/game-scene.js';
import { PreloadScene } from './scenes/preload.js';
import { OptionsScene } from './scenes/options-menu.js';
import { CreditsScene } from './scenes/credits.js';
import { SaveLoadScene } from './scenes/save-load.js';
import { StatisticsMenuScene } from './scenes/statistics-menu.js';
import { AchievementsMenuScene } from './scenes/achievements-menu.js';
import { PrestigeMenuScene } from './scenes/prestige-menu.js';
import { CharacterCreationScene } from './scenes/character-creation.js';
import { TalentAllocationScene } from './scenes/talent-allocation.js';

// Console log capture system for debugging - SET UP EARLY before Phaser initializes
(function () {
    // Store original console methods
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;
    const originalDebug = console.debug;

    // Capture logs in memory
    const logBuffer = [];
    const maxLogs = 500; // Keep last 500 logs
    let lastStorageUpdate = 0;
    const STORAGE_UPDATE_INTERVAL = 2000; // Update localStorage at most every 2 seconds

    function captureLog(level, ...args) {
        const timestamp = new Date().toISOString();

        // Create a simplified message for the buffer to save memory and time
        // Avoid JSON.stringify on large objects
        const message = args.map(arg => {
            if (arg === null || arg === undefined) return String(arg);
            if (typeof arg !== 'object') return String(arg);
            // Specifically handle Errors and simple objects if needed, otherwise use placeholder
            if (arg instanceof Error) return arg.stack || arg.message;
            return '[Object]';
        }).join(' ');

        const logEntry = {
            level,
            timestamp,
            message,
            source: window.electronAPI ? 'electron' : 'browser'
        };

        // Add to buffer
        logBuffer.push(logEntry);
        if (logBuffer.length > maxLogs) {
            logBuffer.shift();
        }

        // Throttled storage update
        const now = Date.now();
        if (now - lastStorageUpdate > STORAGE_UPDATE_INTERVAL) {
            lastStorageUpdate = now;
            // Store in localStorage for persistence (last 50 logs)
            try {
                const recentLogs = logBuffer.slice(-50);
                localStorage.setItem('gameLogs', JSON.stringify(recentLogs));
            } catch (e) {
                // Ignore localStorage errors
            }
        }

        // Call original console method
        const originalMethod = {
            log: originalLog,
            warn: originalWarn,
            error: originalError,
            info: originalInfo,
            debug: originalDebug
        }[level] || originalLog;

        if (typeof originalMethod === 'function') {
            originalMethod(...args);
        }

        // Send to Electron main process if available (skip debug/info to reduce spam)
        if (window.electronAPI && level !== 'debug' && level !== 'info') {
            try {
                window.electronAPI.sendLog(level, message);
            } catch (e) {
                // Silently ignore IPC errors
            }
        }
    }

    // Override console methods EARLY - before Phaser initializes
    console.log = (...args) => captureLog('log', ...args);
    console.warn = (...args) => {
        // Suppress Phaser's "__BASE" texture warnings (known issue - texture doesn't exist but is harmless)
        // Check multiple formats: message string contains __BASE, or any arg contains __BASE
        const hasBase = args.some(arg => String(arg).includes('__BASE'));

        if (hasBase) {
            return;
        }
        captureLog('warn', ...args);
    };
    console.error = (...args) => captureLog('error', ...args);
    console.info = (...args) => captureLog('info', ...args);
    console.debug = (...args) => captureLog('debug', ...args);

    // Load existing logs from localStorage
    try {
        const storedLogs = localStorage.getItem('gameLogs');
        if (storedLogs) {
            const parsed = JSON.parse(storedLogs);
            logBuffer.push(...parsed);
        }
    } catch (e) {
        // Ignore localStorage errors
    }

    // Expose log buffer for debugging
    window.gameLogs = logBuffer;
    window.getGameLogs = (count = null, level = null) => {
        let logs = logBuffer;
        if (level) {
            logs = logs.filter(log => log.level === level);
        }
        if (count && count > 0) {
            return logs.slice(-count);
        }
        return logs;
    };
})();

// Ensure container exists and has proper size
const container = document.getElementById('game-container');
if (container) {
    // Set explicit size if not set
    if (!container.style.width) {
        container.style.width = '100vw';
        container.style.height = '100vh';
    }
}

// Game configuration - Default to 1920x1080 for windowed fullscreen
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth || 1920,
    height: window.innerHeight || 1080,
    parent: 'game-container',
    backgroundColor: '#000000',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [
        PreloadScene,
        MainScene,
        CharacterCreationScene,
        OptionsScene,
        CreditsScene,
        SaveLoadScene,
        StatisticsMenuScene,
        AchievementsMenuScene,
        PrestigeMenuScene,
        TalentAllocationScene,
        GameScene
    ],
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',
        height: '100%',
        fullscreenTarget: 'game-container',
        expandParent: true,
        resizeInterval: 500
    }
};

// Initialize the game
const game = new Phaser.Game(config);

// Expose game and scene to window for debugging
window.game = game;
game.events.once('ready', async () => {
    // Find GameScene and expose it
    const gameScene = game.scene.getScene('GameScene');
    if (gameScene) {
        window.gameScene = gameScene;
        console.log('GameScene exposed to window.gameScene for debugging');

        // Expose RuntimePaladinGenerator and regeneration utilities for hero regeneration
        try {
            const { RuntimePaladinGenerator } = await import('./generators/runtime-paladin-generator.js');
            window.RuntimePaladinGenerator = RuntimePaladinGenerator;
        } catch (e) {
            // Ignore if not available
        }
        try {
            const { getClassColor } = await import('./utils/ui-system.js');
            window.getClassColor = getClassColor;
        } catch (e) {
            // Ignore if not available
        }
        try {
            const { forceRegenerateAllHeroTextures, forceRegenerateHeroTexture } = await import('./utils/force-hero-regeneration.js');
            window.forceRegenerateAllHeroTextures = forceRegenerateAllHeroTextures;
            window.forceRegenerateHeroTexture = forceRegenerateHeroTexture;
            
            // Simple console command to regenerate heroes
            window.regenerateHeroes = function() {
                if (window.gameScene) {
                    const scene = window.gameScene;
                    if (scene.heroRenderer) {
                        scene.heroRenderer.updateAllHeroSprites(true);
                        console.log('Hero textures regenerated!');
                    } else if (scene.partyManager && scene.equipmentManager) {
                        forceRegenerateAllHeroTextures(scene, scene.partyManager, scene.equipmentManager);
                        console.log('Hero textures regenerated!');
                    } else {
                        console.error('HeroRenderer or managers not found');
                    }
                } else {
                    console.error('Game scene not found. Make sure game is running.');
                }
            };
            console.log('Hero regeneration ready! Use: regenerateHeroes()');
        } catch (e) {
            // Ignore if not available
        }
    }
});

// Also expose when GameScene starts
game.scene.start('PreloadScene');

// Handle resize and fullscreen to keep game centered
game.scale.on('resize', (gameSize) => {
    // Update all active scene cameras
    game.scene.scenes.forEach(scene => {
        if (scene.scene && scene.scene.isActive()) {
            const width = gameSize.width;
            const height = gameSize.height;
            if (scene.cameras && scene.cameras.main) {
                scene.cameras.main.setViewport(0, 0, width, height);
                scene.cameras.main.centerOn(width / 2, height / 2);
            }
        }
    });
});

// Handle fullscreen enter/exit
game.scale.on('fullscreenchange', () => {
    // Small delay to ensure size is updated
    setTimeout(() => {
        game.scene.scenes.forEach(scene => {
            if (scene.scene && scene.scene.isActive()) {
                const width = scene.scale.gameSize.width;
                const height = scene.scale.gameSize.height;
                if (scene.cameras && scene.cameras.main) {
                    scene.cameras.main.setViewport(0, 0, width, height);
                    scene.cameras.main.centerOn(width / 2, height / 2);
                }
            }
        });
    }, 100);
});

// Hide loading screen once game starts
game.events.once('ready', () => {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
});

// Also hide on window load as fallback
window.addEventListener('load', () => {
    setTimeout(() => {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }, 1000);
});

export default game;
