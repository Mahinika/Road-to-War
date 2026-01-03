/**
 * GameScene - Refactored Main Game Scene
 * Now uses modular architecture with separated concerns for better maintainability
 *
 * This replaces the monolithic 8987-line game-world.js with a clean, modular structure:
 * - GameSceneCore: Core setup and lifecycle
 * - GameSceneUpdate: Optimized update loop
 * - GameSceneUI: UI management and rendering
 * - GameSceneCombat: Combat-related functionality
 */

import Phaser from 'phaser';
import { GameSceneCore } from './core/game-scene-core.js';
import { GameSceneUpdate } from './core/game-scene-update.js';
import { GameSceneUI } from './core/game-scene-ui.js';
import { GameSceneCombat } from './core/game-scene-combat.js';
import { SafeExecutor, globalErrorHandler } from '../utils/error-handling.js';
import { PerformanceMonitor } from '../utils/performance-monitor.js';
import { MemoryMonitor } from '../utils/memory-monitor.js';
import { PerformanceValidator } from '../utils/performance-validator.js';
import { UI_CONFIG, getScaledValue, getGameSceneConfig } from '../config/ui-config.js';
import { SCENE_CONFIG } from '../config/scene-config.js';
import { Logger } from '../utils/logger.js';

export class GameScene extends GameSceneCore {
    constructor() {
        super();

        // Initialize specialized modules
        this.updateModule = new GameSceneUpdate(this);
        this.uiModule = new GameSceneUI(this);
        this.combatModule = new GameSceneCombat(this);

        // Performance monitoring
        this.performanceMonitor = new PerformanceMonitor(this, {
            enableMonitoring: process.env.NODE_ENV === 'development',
            logPerformance: false
        });

        // Extended memory monitoring (development only)
        if (process.env.NODE_ENV === 'development') {
            this.memoryMonitor = null; // Initialize in create() after scene is ready
        }

        // Performance validator (available for testing)
        this.performanceValidator = new PerformanceValidator(this);

        console.log('GameScene: Modular architecture initialized');
    }

    /**
     * Phaser create method - Initialize the scene
     */
    create() {
        try {
            console.log('GameScene: Creating scene...');

            // Initialize core state
            this.initCoreState();

            // Set up party manager
            if (!this.setupPartyManager()) {
                globalErrorHandler.handle(
                    new Error('Failed to set up party manager'),
                    'GameScene.create',
                    { scene: 'GameScene' }
                );
                return;
            }

            // Initialize managers (async with dependency injection)
            this.initializeManagers().then((success) => {
                if (!success) {
                    globalErrorHandler.handle(
                        new Error('Failed to initialize managers'),
                        'GameScene.create',
                        { scene: 'GameScene' }
                    );
                    return;
                }

                // Initialize secondary managers
                if (!this.initializeSecondaryManagers()) {
                    console.warn('GameScene: Some secondary managers failed to initialize');
                }

                // Initialize handlers (after managers are ready)
                if (!this.initializeHandlers()) {
                    console.warn('GameScene: Some handlers failed to initialize');
                }

                // Continue with rest of initialization
                this.continueSceneInitialization();
            }).catch((error) => {
                globalErrorHandler.handle(error, 'GameScene.create.initializeManagers', { scene: 'GameScene' });
            });
        } catch (error) {
            globalErrorHandler.handle(error, 'GameScene.create', { scene: 'GameScene' });
        }
    }

    /**
     * Continue scene initialization after managers are ready
     * Called after async manager initialization completes
     */
    continueSceneInitialization() {
            // Initialize UI
            this.uiModule.initializeUI();

            // Initialize combat UI
            this.combatModule.initializeCombatUI();

            // Connect UI module to combat module for compatibility
            // This allows combat-handler to access combat UI through uiManager.combatUI
            this.uiModule.combatUI = this.combatModule;
            this.uiModule.combatStatusDisplay = this.combatModule.combatStatusDisplay;

            // Connect combat handler to UI module (for backward compatibility)
            if (this.combatHandler) {
                this.combatHandler.uiManager = this.uiModule;
            }

            // Set up hero sprites - Using UI_CONFIG
            const startConfig = UI_CONFIG.GAME_SCENE.STARTING_POSITION;
            const startingPos = {
                x: getScaledValue(startConfig.X, this.scale.width),
                y: this.scale.height / 2 + getScaledValue(startConfig.Y_OFFSET, this.scale.width, 'height')
            };
            const startingStats = this.cache.json.get('stats-config')?.baseStats || {};
            const worldConfig = this.cache.json.get('world-config') || {};
            
            this.partyMemberSprites = this.heroRenderer.setupPartyHeroesVertical(
                startingPos,
                startingStats,
                worldConfig
            );

            // Update camera targets - this.hero is set by setupPartyHeroesVertical
            // Wait a frame to ensure hero sprite is ready
            this.time.delayedCall(0, () => {
                if (this.cameraManager && this.partyMemberSprites && this.partyMemberSprites.length > 0) {
                    // Get primary hero from partyMemberSprites if this.hero not set
                    const primaryHero = this.hero || this.partyMemberSprites.find(pm => pm.hero?.role === 'tank')?.sprite || this.partyMemberSprites[0]?.sprite;
                    if (primaryHero) {
                        Logger.info('GameScene', `Setting camera target to hero at (${primaryHero.x}, ${primaryHero.y})`);
                        this.cameraManager.setTargets(primaryHero, this.partyMemberSprites);
                    } else {
                        Logger.warn('GameScene', 'No primary hero sprite found for camera');
                    }
                } else {
                    Logger.warn('GameScene', 'Camera manager or party member sprites not available');
                }
            });

            // Set up event handlers
            this.setupEventHandlers();

            // Generate initial world segment
            this.generateInitialWorld();

            // Set up statistics update timer - Using UI_CONFIG
            const statsInterval = UI_CONFIG.GAME_SCENE.UPDATE_INTERVALS.STATISTICS_UPDATE;
            this.time.addEvent({
                delay: statsInterval, // From UI_CONFIG
                callback: () => {
                    if (this.worldManager && this.statisticsManager) {
                        const distance = this.worldManager.currentSegment * this.worldManager.segmentWidth;
                        this.statisticsManager.updateDistanceTraveled(distance - (this.statisticsManager.stats.progression.distanceTraveled || 0));
                    }
                },
                loop: true
            });

            // Initialize extended memory monitoring (development only)
            if (process.env.NODE_ENV === 'development' && !this.memoryMonitor) {
                try {
                    // Using UI_CONFIG for intervals
                    const checkInterval = UI_CONFIG.GAME_SCENE.UPDATE_INTERVALS.PERFORMANCE_CHECK;
                    this.memoryMonitor = new MemoryMonitor(this, {
                        checkInterval: checkInterval, // From UI_CONFIG
                        enableLogging: true
                    });

                    // Set up memory event handlers
                    this.events.on('memory-leak-detected', (data) => {
                        console.warn('GameScene: Memory leak detected:', data);
                        // Suggest cleanup actions
                        this.suggestMemoryCleanup();
                    });

                    this.events.on('memory-critical', (data) => {
                        console.error('GameScene: CRITICAL memory usage:', data);
                        // Trigger aggressive cleanup
                        this.performMemoryCleanup();
                    });

                    console.log('GameScene: Extended memory monitoring enabled');
                } catch (error) {
                    console.warn('GameScene: Failed to initialize memory monitor:', error.message);
                }
            }

            // Expose performance validator to window for testing
            if (typeof window !== 'undefined') {
                window.performanceValidator = this.performanceValidator;
                window.generatePerformanceBaseline = () => {
                    return this.performanceValidator.generateBaselineReport();
                };
                window.exportPerformanceBaseline = (filename) => {
                    return this.performanceValidator.exportBaselineReport(filename);
                };
                console.log('GameScene: Performance validator available at window.performanceValidator');
                console.log('GameScene: Use window.generatePerformanceBaseline() to create baseline report');
                console.log('GameScene: Use window.exportPerformanceBaseline("filename.json") to export report');
            }

            console.log('GameScene: Scene created successfully');
    }

    /**
     * Phaser update method - Main game loop
     * @param {number} time - Current time
     * @param {number} delta - Time delta since last update
     */
    update(time, delta) {
        // Use the optimized update module
        this.updateModule.update(time, delta);

        // Update performance monitoring
        if (this.performanceMonitor) {
            const stats = this.updateModule.getPerformanceStats();
            this.uiModule.updatePerformanceMonitor(stats);
        }
    }

    /**
     * Set up event handlers for the scene
     * Delegates to EventHandler for modular event management
     */
    setupEventHandlers() {
        // Use EventHandler for world events (item pickup, equipment changes, etc.)
        if (this.eventHandler && this.eventHandler.setupWorldEvents) {
            this.eventHandler.setupWorldEvents();
        }

        // Set up handlers through the resource manager for automatic cleanup
        const eventManager = this.resourceManager.eventManager;

        // Combat events - delegate to combat module
        eventManager.addListener(this.events, 'combat-start', (data) => {
            SafeExecutor.execute(() => {
                this.combatModule.updateCombatState(true, data.enemies);
            }, null, 'GameScene.combatStart');
        });

        eventManager.addListener(this.events, 'combat-end', () => {
            SafeExecutor.execute(() => {
                this.combatModule.updateCombatState(false);
            }, null, 'GameScene.combatEnd');
        });

        eventManager.addListener(this.events, 'damage-dealt', (data) => {
            SafeExecutor.execute(() => {
                this.combatModule.onDamageDealt(data);
            }, null, 'GameScene.damageDealt');
        });

        eventManager.addListener(this.events, 'enemy-death', (data) => {
            SafeExecutor.execute(() => {
                this.combatModule.onEnemyDeath(data.enemy);
            }, null, 'GameScene.enemyDeath');
        });

        // UI events
        eventManager.addListener(this.events, 'ui-toggle-panel', (data) => {
            SafeExecutor.execute(() => {
                this.uiModule.togglePanel(data.panel);
            }, null, 'GameScene.uiTogglePanel');
        });

        // World events - delegate to event handler
        eventManager.addListener(this.events, 'world-segment-generated', (data) => {
            SafeExecutor.execute(() => {
                if (this.eventHandler?.handleWorldSegmentGenerated) {
                    this.eventHandler.handleWorldSegmentGenerated(data);
                } else {
                    this.onWorldSegmentGenerated(data);
                }
            }, null, 'GameScene.worldSegmentGenerated');
        });

        eventManager.addListener(this.events, 'segment_generated', () => {
            if (this.statisticsManager?.stats?.progression) {
                this.statisticsManager.stats.progression.segmentsVisited++;
            }
        });

        // Progression events
        eventManager.addListener(this.events, 'experience_gained', () => {
            this.uiModule?.updatePartyXPBars?.();
        });

        eventManager.addListener(this.events, 'level_up', (data) => {
            this.uiModule?.updatePartyXPBars?.();
            this.statisticsManager?.trackLevelUp(data);
            // Delegate to level up handler if available
            if (this.levelUpHandler && data.hero) {
                SafeExecutor.execute(() => {
                    this.levelUpHandler.handleLevelUp(data.hero, data.oldLevel, data.newLevel);
                }, null, 'GameScene.levelUp');
            }
        });

        // Encounter events
        eventManager.addListener(this.events, 'encounter_trigger', (data) => {
            SafeExecutor.execute(() => {
                if (this.combatHandler?.handleEncounterTrigger) {
                    this.combatHandler.handleEncounterTrigger(data);
                }
            }, null, 'GameScene.encounterTrigger');
        });

        // Gold events
        eventManager.addListener(this.events, 'gold_changed', () => {
            this.uiModule?.updateHUD?.();
        });

        // Performance events
        eventManager.addListener(this.events, 'performance-issue', (data) => {
            SafeExecutor.execute(() => {
                this.onPerformanceIssue(data);
            }, null, 'GameScene.performanceIssue');
        });
    }

    /**
     * Generate initial world segment
     */
    generateInitialWorld() {
        SafeExecutor.execute(() => {
            const width = this.scale.width;
            const height = this.scale.height;

            // Generate initial background environment
            if (this.environmentBackground) {
                this.environmentBackground.generateEnvironment('plains', width, height, 0);
            }

            // Apply 'stunning' bloom effect if particle manager is ready
            if (this.particleManager && this.particleManager.applyBloom) {
                this.particleManager.applyBloom(0.2, 1); // Reduced from 0.4
                // Set initial weather based on biome (placeholder logic for now)
                this.particleManager.setWeather('rain'); 
            }

            if (this.worldManager && this.worldManager.generateSegment) {
                this.worldManager.generateSegment(0); // Start at mile 0
            }

            // Position hero at start
            if (this.hero) {
                this.hero.setPosition(240, this.hero.y);
            }
        }, null, 'GameScene.generateInitialWorld');
    }

    /**
     * Handle world segment generation
     * @param {Object} data - Segment data
     */
    onWorldSegmentGenerated(data) {
        // Update UI with new segment info
        if (this.uiModule && this.uiModule.updateMileDisplay) {
            this.uiModule.updateMileDisplay(data.mile);
        }
    }

    /**
     * Handle performance issues
     * @param {Object} data - Performance issue data
     */
    onPerformanceIssue(data) {
        // Throttle warnings to reduce console overhead
        const warningKey = `perf-${data.issue}`;
        const now = Date.now();
        if (!this._lastPerfWarning || !this._lastPerfWarning[warningKey] || now - this._lastPerfWarning[warningKey] > 5000) {
            if (!this._lastPerfWarning) this._lastPerfWarning = {};
            this._lastPerfWarning[warningKey] = now;
            console.warn('GameScene: Performance issue detected:', data.issue, data.value);
            
            // Show visual warning notification
            this.showPerformanceWarning(data);
        }

        // Apply performance optimizations - more aggressive thresholds
        if (data.issue === 'Low FPS') {
            this.updateModule.optimizeForPerformance(data.value);
        } else if (data.issue === 'High memory usage' && data.value > 150) {
            // Trigger memory cleanup when memory is high
            this.triggerMemoryCleanup();
        }

        // Show performance suggestions to user (throttled)
        if (data.suggestions && data.suggestions.length > 0) {
            const now = Date.now();
            if (!this._lastSuggestionTime || now - this._lastSuggestionTime > 10000) {
                this._lastSuggestionTime = now;
                console.log('Performance suggestions:', data.suggestions);
            }
        }
    }

    /**
     * Show visual performance warning notification
     * @param {Object} data - Performance issue data
     */
    showPerformanceWarning(data) {
        if (!this.uiModule) return;

        const width = this.scale.width;
        const height = this.scale.height;
        const config = UI_CONFIG.NOTIFICATIONS;
        const typeConfig = config.TYPES.WARNING;
        
        const notification = this.add.container(width / 2, height / 2 + getScaledValue(200, height, 'height'));
        notification.setScrollFactor(0);
        notification.setDepth(SCENE_CONFIG.DEPTH?.NOTIFICATIONS || 2000);

        const panelWidth = getScaledValue(config.WIDTH, width);
        const panelHeight = getScaledValue(config.HEIGHT, height, 'height');
        const bg = this.add.graphics();
        bg.fillStyle(config.BACKGROUND_COLOR, config.BACKGROUND_ALPHA);
        bg.fillRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, config.CORNER_RADIUS);
        bg.lineStyle(config.BORDER_WIDTH, typeConfig.border, config.BORDER_ALPHA);
        bg.strokeRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, config.CORNER_RADIUS);
        notification.add(bg);

        const fontSize = getScaledValue(config.FONT_SIZE, height, 'height');
        const warningText = this.add.text(0, 0, `⚠️ ${data.issue}: ${data.value}`, {
            font: `bold ${fontSize}px Arial`,
            fill: typeConfig.text,
            stroke: '#000000',
            strokeThickness: getScaledValue(config.STROKE_WIDTH, height, 'height')
        });
        warningText.setOrigin(0.5, 0.5);
        notification.add(warningText);

        // Animate in
        notification.setAlpha(0);
        this.tweens.add({
            targets: notification,
            alpha: 1,
            duration: config.SLIDE_IN_DURATION,
            ease: 'Back.easeOut'
        });

        // Auto-remove after shorter duration for warnings
        this.time.delayedCall(config.DISPLAY_DURATION / 2, () => {
            this.tweens.add({
                targets: notification,
                alpha: 0,
                duration: config.FADE_OUT_DURATION,
                ease: 'Back.easeIn',
                onComplete: () => notification.destroy()
            });
        });
    }

    /**
     * Trigger aggressive memory cleanup
     */
    triggerMemoryCleanup() {
        const now = Date.now();
        // Throttle cleanup to once per 10 seconds
        if (this._lastMemoryCleanup && now - this._lastMemoryCleanup < 10000) {
            return;
        }
        this._lastMemoryCleanup = now;

        SafeExecutor.execute(() => {
            // Clean up particle manager first (safest)
            if (this.particleManager && this.particleManager.cleanup) {
                this.particleManager.cleanup();
            }

            // Clear unused textures from cache - use safer method
            // Don't remove textures during active rendering to avoid glTexture errors
            // Schedule texture cleanup for next frame to avoid rendering conflicts
            this.time.delayedCall(100, () => {
                if (this.textures && this.textures.list) {
                    const textureKeys = Object.keys(this.textures.list);
                    let cleared = 0;
                    
                    for (const key of textureKeys) {
                        try {
                            const texture = this.textures.list[key];
                            if (!texture) continue;
                            
                            // Skip if texture is a render texture or has multiple frames
                            if (texture.isRenderTexture || texture.frameTotal > 1) continue;
                            
                            // Skip system textures
                            if (key.startsWith('__') || key.includes('default')) continue;
                            
                            // Skip particle textures (they're needed for emitters)
                            if (key.startsWith('particle-')) continue;
                            
                            // Check if texture is actively used by any game object (recursive)
                            const checkTextureUsage = (obj) => {
                                if (!obj || obj.destroyed) return false;
                                // Check texture directly
                                if (obj.texture && obj.texture.key === key) return true;
                                // Check container children recursively
                                if (obj.list && obj.list.length > 0) {
                                    for (const subChild of obj.list) {
                                        if (checkTextureUsage(subChild)) return true;
                                    }
                                }
                                // Check if object has children array
                                if (obj.children && obj.children.length > 0) {
                                    for (const subChild of obj.children) {
                                        if (checkTextureUsage(subChild)) return true;
                                    }
                                }
                                return false;
                            };
                            
                            const isUsed = this.children.list.some(checkTextureUsage);
                            
                            // Only remove if not used
                            if (!isUsed) {
                                this.textures.remove(key);
                                cleared++;
                            }
                        } catch (error) {
                            // Silently ignore errors - texture might be in use
                        }
                    }
                    
                    if (cleared > 0) {
                        console.log(`Memory cleanup: Cleared ${cleared} unused textures`);
                    }
                }
            });

            // Force garbage collection hint (if available)
            if (window.gc && typeof window.gc === 'function') {
                try {
                    window.gc();
                } catch (error) {
                    // Ignore GC errors
                }
            }
        }, null, 'GameScene.triggerMemoryCleanup');
    }

    /**
     * Handle scene resize
     * @param {number} width - New width
     * @param {number} height - New height
     */
    onResize(width, height) {
        SafeExecutor.execute(() => {
            // Update UI layout
            this.uiModule.onResize(width, height);

            // Update camera bounds if needed
            if (this.cameraManager && this.cameraManager.onResize) {
                this.cameraManager.onResize(width, height);
            }
        }, null, 'GameScene.onResize');
    }

    /**
     * Get comprehensive scene statistics
     * @returns {Object} Scene statistics
     */
    getSceneStats() {
        return {
            core: this.getCoreStats(),
            ui: this.uiModule.getUIStats(),
            combat: this.combatModule.getCombatStats(),
            performance: this.performanceMonitor ? this.performanceMonitor.getMetrics() : null,
            update: this.updateModule.getPerformanceStats()
        };
    }

    /**
     * Shutdown the scene and clean up all resources
     */
    shutdown() {
        console.log('GameScene: Shutting down...');

        try {
            // Clean up specialized modules
            SafeExecutor.execute(() => {
                if (this.updateModule) {
                    // Update module cleanup is handled by resource manager
                }
            }, null, 'GameScene.shutdown.updateModule');

            SafeExecutor.execute(() => {
                if (this.uiModule) {
                    this.uiModule.cleanup();
                }
            }, null, 'GameScene.shutdown.uiModule');

            SafeExecutor.execute(() => {
                if (this.combatModule) {
                    this.combatModule.cleanup();
                }
            }, null, 'GameScene.shutdown.combatModule');

            // Clean up performance monitor
            SafeExecutor.execute(() => {
                if (this.performanceMonitor) {
                    this.performanceMonitor.destroy();
                }
            }, null, 'GameScene.shutdown.performanceMonitor');

            // Clean up memory monitor
            SafeExecutor.execute(() => {
                if (this.memoryMonitor) {
                    this.memoryMonitor.destroy();
                    this.memoryMonitor = null;
                }
            }, null, 'GameScene.shutdown.memoryMonitor');

            // Clean up core components (inherited from GameSceneCore)
            this.cleanupManagers();
            this.cleanupCoreObjects();

            console.log('GameScene: Shutdown complete');

        } catch (error) {
            globalErrorHandler.handle(error, 'GameScene.shutdown', { phase: 'cleanup' });
        }
    }

    /**
     * Suggest memory cleanup actions
     */
    suggestMemoryCleanup() {
        console.log('GameScene: Memory cleanup suggestions:');
        console.log('  - Clear unused textures');
        console.log('  - Release object pools');
        console.log('  - Destroy inactive game objects');
        
        // Try to clean up particle manager
        if (this.particleManager) {
            // Particle manager already has throttling, but we can suggest more aggressive cleanup
            console.log('  - Particle manager throttling active');
        }
    }

    /**
     * Perform aggressive memory cleanup
     */
    performMemoryCleanup() {
        console.warn('GameScene: Performing aggressive memory cleanup...');
        
        // Clean up particle manager first
        if (this.particleManager && this.particleManager.cleanup) {
            this.particleManager.cleanup();
        }
        
        // Defer texture cleanup to avoid rendering conflicts
        // Textures are checked during render, so we need to wait until after render completes
        this.time.delayedCall(100, () => {
            this._performTextureCleanup();
        });
    }

    /**
     * Internal method to perform texture cleanup (called after delay)
     * @private
     */
    _performTextureCleanup() {
        if (!this.textures || !this.textures.list) return;
        
        const textureKeys = Object.keys(this.textures.list);
        let cleared = 0;
        
        for (const key of textureKeys) {
            try {
                const texture = this.textures.list[key];
                if (!texture) continue;
                
                // Skip render textures and multi-frame textures
                if (texture.isRenderTexture || texture.frameTotal > 1) continue;
                
                // Skip particle textures (they're needed for emitters)
                if (key.startsWith('particle-')) continue;
                
                // Skip font textures (used by Text objects)
                if (key.includes('font') || key.includes('__font')) continue;
                
                // Check if texture is actively used by any game object
                const isUsed = this._isTextureInUse(key);
                
                // Only remove if not used
                if (!isUsed) {
                    this.textures.remove(key);
                    cleared++;
                }
            } catch (error) {
                // Silently ignore errors - texture might be in use or already destroyed
                console.warn('GameScene: Error during texture cleanup:', error.message);
            }
        }
        
        if (cleared > 0) {
            console.log(`GameScene: Cleared ${cleared} unused textures`);
        }

        // Force garbage collection hint (if available)
        if (window.gc && typeof window.gc === 'function') {
            try {
                window.gc();
                console.log('GameScene: Garbage collection triggered');
            } catch (error) {
                // Ignore
            }
        }
    }

    /**
     * Check if a texture is currently in use by any game object
     * @param {string} textureKey - Texture key to check
     * @returns {boolean} True if texture is in use
     * @private
     */
    _isTextureInUse(textureKey) {
        // Check all children recursively
        const checkObject = (obj) => {
            if (!obj || obj.destroyed) return false;
            
            // Check if object directly uses this texture
            if (obj.texture && obj.texture.key === textureKey) return true;
            
            // Check if object is a container with children
            if (obj.list && Array.isArray(obj.list)) {
                return obj.list.some(child => checkObject(child));
            }
            
            // Check if object has children property
            if (obj.children && obj.children.list) {
                return obj.children.list.some(child => checkObject(child));
            }
            
            return false;
        };
        
        // Check all scene children
        if (this.children && this.children.list) {
            return this.children.list.some(child => checkObject(child));
        }
        
        return false;
    }

    /**
     * Debug method to get scene information
     * @returns {Object} Debug information
     */
    getDebugInfo() {
        return {
            scene: 'GameScene',
            modules: {
                core: true,
                update: !!this.updateModule,
                ui: !!this.uiModule,
                combat: !!this.combatModule
            },
            stats: this.getSceneStats(),
            performance: this.performanceMonitor ? this.performanceMonitor.getMetrics() : null
        };
    }
}

// Export both the refactored version and legacy support
export { GameScene as GameSceneRefactored };

// For backward compatibility, also export as default
export default GameScene;


