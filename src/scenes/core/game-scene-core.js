/**
 * GameScene Core Module
 * Contains core scene setup, initialization, and lifecycle management
 * Extracted from the monolithic GameScene to improve maintainability
 */

import Phaser from 'phaser';
import { SceneResourceManager } from '../../utils/scene-event-cleanup.js';
import { getUIBuilder } from '../../utils/ui-builder.js';
import { globalErrorHandler, SafeExecutor } from '../../utils/error-handling.js';
import { dataValidator } from '../../utils/data-validator.js';
import { DevStatMonitor } from '../../utils/dev-stat-monitor.js';
import { GameplayStateReplay } from '../../utils/gameplay-state-replay.js';
import { Logger } from '../../utils/logger.js';

// Manager Imports
import { WorldManager } from '../../managers/world-manager.js';
import { AnimationManager } from '../../managers/animation-manager.js';
import { SpriteGenerator } from '../../generators/sprite-generator.js';
import { CombatManager } from '../../managers/combat-manager.js';
import { CombatHandler } from '../handlers/combat-handler.js';
import { EventHandler } from '../handlers/event-handler.js';
import { SetupHandler } from '../handlers/setup-handler.js';
import { LevelUpHandler } from '../handlers/level-up-handler.js';
import { SaveLoadHandler } from '../handlers/save-load-handler.js';
import { LootManager } from '../../managers/loot-manager.js';
import { getPartyStateManager } from '../../utils/party-state-manager.js';
import { TalentManager } from '../../managers/talent-manager.js';
import { StatCalculator } from '../../utils/stat-calculator.js';
import { HeroFactory } from '../../utils/hero-factory.js';
import { HeroRenderer } from '../renderers/hero-renderer.js';
import { MovementManager } from '../../managers/movement-manager.js';
import { CameraManager } from '../../managers/camera-manager.js';
import { AbilityManager } from '../../managers/ability-manager.js';
import { StatusEffectsManager } from '../../managers/status-effects-manager.js';
import { EquipmentManager } from '../../managers/equipment-manager.js';
import { ShopManager } from '../../managers/shop-manager.js';
import { ParticleManager } from '../../managers/particle-manager.js';
import { AudioManager } from '../../managers/audio-manager.js';
import { TooltipManager } from '../../utils/tooltip-manager.js';
import { StatisticsManager } from '../../managers/statistics-manager.js';
import { AchievementManager } from '../../managers/achievement-manager.js';
import { PrestigeManager } from '../../managers/prestige-manager.js';
import { ResourceManager } from '../../managers/resource-manager.js';
import { BloodlineManager } from '../../managers/bloodline-manager.js';
import { GameplayDataHotReload } from '../../managers/gameplay-data-hot-reload.js';
import { EnvironmentBackgroundGenerator } from '../../generators/environment-background-generator.js';
import { ManagerRegistry } from '../../utils/manager-registry.js';
import { EventBus } from '../../utils/event-bus.js';
import { EventSchemas } from '../../utils/event-schemas.js';
import { DataService } from '../../services/data-service.js';

export class GameSceneCore extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });

        // Initialize resource management (fixes memory leaks)
        this.resourceManager = new SceneResourceManager(this);
        // Defer UIBuilder initialization until create() to ensure scene is ready
        this.uiBuilder = null;

        // Core managers - initialized to null, set up in initializeManagers
        this.worldManager = null;
        this.combatManager = null;
        this.combatHandler = null;
        this.eventHandler = null;
        this.setupHandler = null;
        this.levelUpHandler = null;
        this.saveLoadHandler = null;
        this.lootManager = null;
        this.equipmentManager = null;
        this.shopManager = null;
        this.bloodlineManager = null;
        this.particleManager = null;
        this.audioManager = null;
        this.cameraManager = null;
        this.movementManager = null;
        this.animationManager = null;
        this.tooltipManager = null;
        this.statisticsManager = null;
        this.achievementManager = null;
        this.prestigeManager = null;
        this.heroResourceManager = null;
        this.heroRenderer = null;
        this.environmentBackground = null;

        // Core systems
        this.spriteGenerator = null;
        this.partyManager = null;

        // Manager Registry - Enhanced dependency injection system
        this.managerRegistry = null;

        // Event Bus - Enhanced event system with validation and monitoring
        this.eventBus = null;

        // Data Service - Centralized data access with caching
        this.dataService = null;

        // UI state
        this.uiPanels = {
            equipment: false,
            inventory: false,
            shop: false
        };

        // Combat state
        this.combatTactics = 'balanced'; // balanced, aggressive, defensive
        this.showThreatDisplay = false;

        // Debug state
        this.debugFrameCount = 0;

        // Core game objects
        this.hero = null;
        this.partyMemberSprites = null;
    }

    /**
     * Validate party manager data structure
     * @param {Object} partyManager - Party manager to validate
     * @returns {boolean} True if valid
     */
    validatePartyManager(partyManager) {
        return SafeExecutor.execute(() => {
            if (!partyManager || typeof partyManager !== 'object') return false;
            if (!Array.isArray(partyManager.heroes)) return false;
            if (partyManager.heroes.length !== 5) return false;
            return partyManager.heroes.every(hero => hero && typeof hero === 'object' && hero.id);
        }, false, 'GameSceneCore.validatePartyManager');
    }

    /**
     * Initialize core game objects and state
     */
    initCoreState() {
        // Initialize combat settings
        this.combatTactics = 'balanced'; // balanced, aggressive, defensive
        this.showThreatDisplay = false;

        // Initialize UI panels state
        this.uiPanels = {
            equipment: false,
            inventory: false,
            shop: false
        };

        // Initialize debug state
        this.debugFrameCount = 0;
        this.gameSpeed = 1.0;

        // Initialize core game objects
        this.hero = null;
        this.partyMemberSprites = null;
    }

    /**
     * Set up party manager with validation
     * @returns {boolean} True if setup successful
     */
    setupPartyManager() {
        // Standardized partyManager access with validation (fixes scene registry conflicts)
        this.partyManager = SafeExecutor.execute(() => {
            // Try registry first
            let pm = this.registry.get('partyManager');
            if (pm) return pm;

            // Try scene data
            pm = this.sys?.settings?.data?.partyManager;
            if (pm) {
                // Validate and mirror to registry
                if (this.validatePartyManager(pm)) {
                    this.registry.set('partyManager', pm);
                    return pm;
                }
            }

            // If no party manager exists, create one using PartyStateManager
            const partyStateManager = getPartyStateManager(this);
            if (partyStateManager.initialize()) {
                pm = partyStateManager.getPartyManager();
                if (pm && this.validatePartyManager(pm)) {
                    this.registry.set('partyManager', pm);
                    return pm;
                }
            }

            return null;
        }, null, 'GameSceneCore.partyManagerSetup');

        return !!this.partyManager;
    }

    /**
     * Initialize all game managers using enhanced ManagerRegistry
     * Called after scene creation to ensure proper initialization order
     * Uses automatic dependency injection and topological sorting
     */
    async initializeManagers() {
        // Initialize UIBuilder now that scene is ready (fixes object pool initialization errors)
        if (!this.uiBuilder) {
            this.uiBuilder = getUIBuilder(this);
        }

        try {
            // Create DataService instance
            this.dataService = new DataService(this);
            await this.dataService.init();

            // Create EventBus instance
            this.eventBus = new EventBus(this);
            this.eventBus.setSchemas(EventSchemas);

            // Create ManagerRegistry instance
            this.managerRegistry = new ManagerRegistry(this);

            // Register all managers with their dependencies
            // Managers are registered in dependency order (dependencies first)
            // Note: partyManager is created outside registry and passed in
            
            // Managers with no dependencies
            this.managerRegistry.register('animationManager', AnimationManager, []);
            this.managerRegistry.register('lootManager', LootManager, []);
            this.managerRegistry.register('talentManager', TalentManager, []);
            this.managerRegistry.register('shopManager', ShopManager, []);
            this.managerRegistry.register('particleManager', ParticleManager, []);
            this.managerRegistry.register('audioManager', AudioManager, []);
            this.managerRegistry.register('movementManager', MovementManager, []);
            this.managerRegistry.register('abilityManager', AbilityManager, []);
            this.managerRegistry.register('statusEffectsManager', StatusEffectsManager, []);
            this.managerRegistry.register('resourceManager', ResourceManager, []);
            this.managerRegistry.register('bloodlineManager', BloodlineManager, []);
            this.managerRegistry.register('prestigeManager', PrestigeManager, []);

            // Managers with dependencies
            this.managerRegistry.register('worldManager', WorldManager, ['partyManager']);
            this.managerRegistry.register('equipmentManager', EquipmentManager, ['partyManager']);
            // Note: abilityManager and statusEffectsManager are created separately and passed to CombatManager
            this.managerRegistry.register('combatManager', CombatManager, ['partyManager', 'prestigeManager', 'abilityManager', 'statusEffectsManager']);
            this.managerRegistry.register('statisticsManager', StatisticsManager, []);
            this.managerRegistry.register('achievementManager', AchievementManager, ['statisticsManager']);
            this.managerRegistry.register('cameraManager', CameraManager, []);

            // Initialize all managers (partyManager passed in, created outside registry)
            await this.managerRegistry.initializeAll(this.partyManager, this.hero, this.partyMemberSprites);

            // Assign managers to scene properties for backward compatibility
            this.worldManager = this.managerRegistry.get('worldManager');
            this.animationManager = this.managerRegistry.get('animationManager');
            this.combatManager = this.managerRegistry.get('combatManager');
            this.lootManager = this.managerRegistry.get('lootManager');
            this.equipmentManager = this.managerRegistry.get('equipmentManager');
            this.talentManager = this.managerRegistry.get('talentManager');
            this.shopManager = this.managerRegistry.get('shopManager');
            this.particleManager = this.managerRegistry.get('particleManager');
            this.audioManager = this.managerRegistry.get('audioManager');
            this.movementManager = this.managerRegistry.get('movementManager');
            this.cameraManager = this.managerRegistry.get('cameraManager');
            this.abilityManager = this.managerRegistry.get('abilityManager');
            this.statusEffectsManager = this.managerRegistry.get('statusEffectsManager');
            this.heroResourceManager = this.managerRegistry.get('resourceManager');
            this.bloodlineManager = this.managerRegistry.get('bloodlineManager');
            this.prestigeManager = this.managerRegistry.get('prestigeManager');
            this.statisticsManager = this.managerRegistry.get('statisticsManager');
            this.achievementManager = this.managerRegistry.get('achievementManager');

            // Store abilityManager and statusEffectsManager references in combatManager for backward compatibility
            if (this.combatManager) {
                this.combatManager.abilityManager = this.abilityManager;
                this.combatManager.statusEffectsManager = this.statusEffectsManager;
            }

            // Make eventBus and dataService available to managers (optional - managers can still use scene.events and scene.cache.json)
            // Managers can access via this.scene.eventBus and this.scene.dataService if they want enhanced features

            // Set hero reference for movement (backward compatibility)
            if (this.hero && this.worldManager) {
                this.worldManager.hero = this.hero;
            }
            if (this.hero && this.combatManager) {
                this.combatManager.hero = this.hero;
            }

            // Enable animation hot-reload if available
            if (this.animationManager?.hotReload) {
                this.animationManager.hotReload.enable();
            }

            // Environment Background Generator (not a manager, created directly)
            this.environmentBackground = new EnvironmentBackgroundGenerator(this);

            // Sprite Generator (not a manager, created directly)
            this.spriteGenerator = new SpriteGenerator(this);

            // Stat Calculator (utility, not a manager)
            this.statCalculator = new StatCalculator(this);

            // Hero Factory (utility, not a manager)
            this.heroFactory = new HeroFactory(this);

            // Hero Renderer (needs partyManager and equipmentManager)
            this.heroRenderer = new HeroRenderer(this, {
                partyManager: this.partyManager,
                equipmentManager: this.equipmentManager
            });

            // Tooltip Manager (utility, not a manager)
            this.tooltipManager = new TooltipManager(this);

            // Combat Handler - handles combat events and logic
            // Note: levelUpHandler will be set in initializeHandlers()
            // Note: uiManager will be set by GameScene after uiModule is initialized
            this.combatHandler = new CombatHandler(this, {
                combatManager: this.combatManager,
                partyManager: this.partyManager,
                worldManager: this.worldManager,
                audioManager: this.audioManager,
                particleManager: this.particleManager,
                shopManager: this.shopManager,
                uiManager: null, // Will be set by GameScene after uiModule initialization
                levelUpHandler: null // Will be set in initializeHandlers()
            });
            if (this.combatHandler.setupEventListeners) {
                this.combatHandler.setupEventListeners();
            }

        } catch (error) {
            globalErrorHandler.handle(error, 'GameSceneCore.initializeManagers', { phase: 'core' });
            return false;
        }

        return true;
    }

    /**
     * Initialize specialized handlers
     */
    initializeHandlers() {
        try {
            // Level Up Handler - handles hero leveling
            this.levelUpHandler = new LevelUpHandler(this, {
                equipmentManager: this.equipmentManager
            });

            // Event Handler - handles general game events
            this.eventHandler = new EventHandler(this, {
                partyManager: this.partyManager,
                equipmentManager: this.equipmentManager,
                lootManager: this.lootManager,
                shopManager: this.shopManager,
                statisticsManager: this.statisticsManager,
                achievementManager: this.achievementManager,
                worldManager: this.worldManager,
                audioManager: this.audioManager,
                particleManager: this.particleManager,
                heroRenderer: this.heroRenderer
            });
            if (this.eventHandler.setupWorldEvents) {
                this.eventHandler.setupWorldEvents();
            }

            // Setup Handler - handles initialization and setup
            this.setupHandler = new SetupHandler(this, {
                worldManager: this.worldManager,
                statisticsManager: this.statisticsManager,
                lootManager: this.lootManager
            });
            if (this.setupHandler.setupAchievementNotifications) {
                this.setupHandler.setupAchievementNotifications();
            }

            // Save/Load Handler - handles save and load operations
            this.saveLoadHandler = new SaveLoadHandler(this, {
                worldManager: this.worldManager,
                equipmentManager: this.equipmentManager,
                shopManager: this.shopManager,
                lootManager: this.lootManager,
                statisticsManager: this.statisticsManager,
                achievementManager: this.achievementManager,
                prestigeManager: this.prestigeManager,
                partyManager: this.partyManager
            });
            if (this.saveLoadHandler.setupAutoSave) {
                this.saveLoadHandler.setupAutoSave();
            }

            // Update combat handler with levelUpHandler reference
            if (this.combatHandler) {
                this.combatHandler.levelUpHandler = this.levelUpHandler;
            }

        } catch (error) {
            globalErrorHandler.handle(error, 'GameSceneCore.initializeHandlers', { phase: 'handlers' });
            return false;
        }

        return true;
    }

    /**
     * Initialize secondary managers (called after core managers are ready)
     */
    initializeSecondaryManagers() {
        try {
            // Statistics Manager - handles player statistics
            this.statisticsManager = new StatisticsManager(this);

            // Achievement Manager - handles achievements
            this.achievementManager = new AchievementManager(this);
            if (this.statisticsManager) {
                this.achievementManager.init(this.statisticsManager);
            }

            // Prestige Manager - handles prestige system
            this.prestigeManager = new PrestigeManager(this);

            // Gameplay Data Hot-Reload System - enables rapid iteration on JSON data
            this.gameplayDataHotReload = new GameplayDataHotReload(this);
            this.gameplayDataHotReload.enable();

            // Development Stat Monitor - real-time debugging panel (F8 to toggle)
            this.devStatMonitor = new DevStatMonitor(this);

            // Gameplay State Replay - save/restore game state for debugging (F9/F10)
            this.gameplayStateReplay = new GameplayStateReplay(this);

            // Global Speed Toggle (Ctrl+Shift+S)
            this.input.keyboard.on('keydown-S', (event) => {
                if (event.ctrlKey && event.shiftKey) {
                    if (this.gameSpeed === 1.0) this.gameSpeed = 2.0;
                    else if (this.gameSpeed === 2.0) this.gameSpeed = 5.0;
                    else if (this.gameSpeed === 5.0) this.gameSpeed = 0.5;
                    else this.gameSpeed = 1.0;
                    
                    this.time.timeScale = this.gameSpeed;
                    Logger.info('GameSceneCore', `Game speed set to ${this.gameSpeed}x`);
                }
            });

        } catch (error) {
            globalErrorHandler.handle(error, 'GameSceneCore.initializeSecondaryManagers', { phase: 'secondary' });
            return false;
        }

        return true;
    }

    /**
     * Clean up all managers safely
     */
    cleanupManagers() {
        const managers = [
            'worldManager', 'combatManager', 'lootManager', 'equipmentManager',
            'shopManager', 'particleManager', 'audioManager', 'cameraManager',
            'movementManager', 'animationManager', 'tooltipManager',
            'statisticsManager', 'achievementManager', 'prestigeManager',
            'heroRenderer', 'abilityManager', 'statusEffectsManager',
            'talentManager', 'statCalculator', 'heroFactory',
            'heroResourceManager', 'bloodlineManager'
        ];

        managers.forEach(managerName => {
            SafeExecutor.execute(() => {
                const manager = this[managerName];
                if (manager?.destroy && typeof manager.destroy === 'function') {
                    manager.destroy();
                }
                this[managerName] = null;
            }, null, `GameSceneCore.cleanup.${managerName}`);
        });

        // Clean up handlers
        const handlers = [
            'combatHandler', 'eventHandler', 'setupHandler', 
            'levelUpHandler', 'saveLoadHandler'
        ];

        handlers.forEach(handlerName => {
            SafeExecutor.execute(() => {
                const handler = this[handlerName];
                if (handler?.cleanup && typeof handler.cleanup === 'function') {
                    handler.cleanup();
                }
                this[handlerName] = null;
            }, null, `GameSceneCore.cleanup.${handlerName}`);
        });
    }

    /**
     * Clean up core game objects
     */
    cleanupCoreObjects() {
        SafeExecutor.execute(() => {
            this.hero = null;
            this.partyMemberSprites = null;
            this.partyManager = null;
        }, null, 'GameSceneCore.cleanupCoreObjects');
    }

    /**
     * Get core scene statistics
     * @returns {Object} Core statistics
     */
    getCoreStats() {
        return {
            partyManager: !!this.partyManager,
            hero: !!this.hero,
            managers: {
                world: !!this.worldManager,
                combat: !!this.combatManager,
                equipment: !!this.equipmentManager,
                loot: !!this.lootManager,
                shop: !!this.shopManager,
                particle: !!this.particleManager,
                audio: !!this.audioManager,
                animation: !!this.animationManager,
                camera: !!this.cameraManager,
                movement: !!this.movementManager,
                tooltip: !!this.tooltipManager,
                statistics: !!this.statisticsManager,
                achievement: !!this.achievementManager,
                prestige: !!this.prestigeManager
            },
            uiPanels: { ...this.uiPanels },
            combatState: {
                tactics: this.combatTactics,
                showThreat: this.showThreatDisplay
            }
        };
    }

    /**
     * Calculate level from total XP (supports levels beyond config)
     * @param {number} totalXP - Total experience points
     * @param {Object} experienceToLevel - Experience requirements per level
     * @param {Object} levelingConfig - Leveling configuration
     * @returns {number} Current level
     */
    calculateLevelFromXP(totalXP, experienceToLevel, levelingConfig = null) {
        const worldConfig = this.cache.json.get('worldConfig');
        const experienceScaling = worldConfig?.experienceScaling || {};
        const maxLevel = experienceScaling.maxLevel || levelingConfig?.maxLevel || 100;

        let level = 1;
        const maxConfigLevel = Math.max(...Object.keys(experienceToLevel).map(k => parseInt(k)));

        // Check config levels first
        for (let l = 2; l <= maxConfigLevel; l++) {
            const xpRequired = experienceToLevel[l.toString()] || 0;
            if (totalXP >= xpRequired) {
                level = l;
            } else {
                break;
            }
        }

        // Check formula-based levels if we haven't hit max
        if (level >= maxConfigLevel && level < maxLevel) {
            for (let l = maxConfigLevel + 1; l <= maxLevel; l++) {
                const xpRequired = this.calculateXPForLevel(l, experienceToLevel, levelingConfig);
                if (totalXP >= xpRequired) {
                    level = l;
                } else {
                    break;
                }
            }
        }

        return level;
    }

    /**
     * Calculate XP required for a specific level (supports levels beyond config)
     * @param {number} level - Target level
     * @param {Object} experienceToLevel - Experience requirements per level
     * @param {Object} levelingConfig - Leveling configuration
     * @returns {number} XP required for that level
     */
    calculateXPForLevel(level, experienceToLevel, levelingConfig = null) {
        const worldConfig = this.cache.json.get('worldConfig');
        const experienceScaling = worldConfig?.experienceScaling || {};
        const baseLevel = 10;
        const scalingMultiplier = experienceScaling.scalingMultiplier || levelingConfig?.xpFormula?.baseMultiplier || 1.15;

        // Use config XP for levels 1-10
        if (level <= baseLevel && experienceToLevel[level.toString()]) {
            return experienceToLevel[level.toString()];
        }

        // Calculate for levels beyond 10 using exponential scaling
        if (level > baseLevel) {
            const baseXP = experienceToLevel[baseLevel.toString()] || 25000;
            const levelsBeyondBase = level - baseLevel;
            return Math.floor(baseXP * Math.pow(scalingMultiplier, levelsBeyondBase));
        }

        return 0;
    }
}
