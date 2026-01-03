/**
 * Save/Load Handler - Handles all save and load operations
 * Extracted from GameScene to improve separation of concerns
 */

import { saveManager } from '../../utils/save-manager.js';
import { GameEvents } from '../../utils/event-constants.js';

export class SaveLoadHandler {
    /**
     * Create a new SaveLoadHandler
     * @param {Phaser.Scene} scene - The Phaser scene
     * @param {Object} managers - Reference to game managers
     */
    constructor(scene, managers = {}) {
        this.scene = scene;
        this.worldManager = managers.worldManager;
        this.equipmentManager = managers.equipmentManager;
        this.shopManager = managers.shopManager;
        this.lootManager = managers.lootManager;
        this.statisticsManager = managers.statisticsManager;
        this.achievementManager = managers.achievementManager;
        this.prestigeManager = managers.prestigeManager;
        this.partyManager = managers.partyManager;
    }

    /**
     * Set up auto-save system
     */
    setupAutoSave() {
        // Auto-save on significant events
        this.scene.events.on(GameEvents.COMBAT.END, () => {
            this.triggerAutoSave(GameEvents.COMBAT.END);
        });

        this.scene.events.on(GameEvents.ITEM.EQUIPMENT_CHANGED, () => {
            this.triggerAutoSave(GameEvents.ITEM.EQUIPMENT_CHANGED);
        });

        // Periodic auto-save (every 30 seconds)
        this.scene.time.addEvent({
            delay: 30000,
            callback: () => {
                this.triggerAutoSave('periodic');
            },
            loop: true
        });
    }

    /**
     * Trigger auto-save
     * @param {string} reason - Reason for auto-save
     */
    triggerAutoSave(reason) {
        const getGameData = () => {
            const worldState = this.worldManager.getWorldState();
            const equipmentState = this.equipmentManager.getSaveData();
            const shopState = this.shopManager.getSaveData();
            const inventoryState = this.lootManager.getInventory();
            const statistics = this.statisticsManager.getSaveData();
            const achievements = this.achievementManager.getSaveData();
            const prestige = this.prestigeManager.getSaveData();

            const worldConfig = this.scene.cache.json.get('worldConfig');
            const gameData = saveManager.createDefaultSaveData(worldConfig);
            gameData.world = worldState;
            gameData.equipment = equipmentState;
            gameData.shop = shopState;
            gameData.inventory = inventoryState;
            gameData.statistics = statistics;
            gameData.achievements = achievements;
            gameData.prestige = prestige;

            // Save party data if party manager exists
            if (this.partyManager) {
                gameData.party = this.partyManager.getSaveData();
            }

            // Save hero mana and abilities state
            if (this.scene.hero && this.scene.hero.data) {
                gameData.player.mana = this.scene.hero.data.mana || gameData.player.mana;
                gameData.player.maxMana = this.scene.hero.data.maxMana || gameData.player.maxMana;
                gameData.player.manaRegen = this.scene.hero.data.manaRegen || gameData.player.manaRegen;
                gameData.player.abilities = this.scene.hero.data.abilities || gameData.player.abilities;
            }

            return gameData;
        };

        const success = saveManager.autoSave(getGameData);
        if (success) {
            // Show subtle auto-save indicator
            this.showAutoSaveIndicator();
        }
    }

    /**
     * Show auto-save indicator
     */
    showAutoSaveIndicator() {
        // Create temporary text indicator
        const indicator = this.scene.add.text(
            this.scene.scale.gameSize.width / 2,
            this.scene.scale.gameSize.height - 100,
            'Auto-saved',
            {
                font: '16px Arial',
                fill: '#00ff00',
                align: 'center'
            }
        );
        indicator.setOrigin(0.5, 0.5);

        // Fade out after 2 seconds
        this.scene.tweens.add({
            targets: indicator,
            alpha: 0,
            duration: 2000,
            onComplete: () => {
                indicator.destroy();
            }
        });
    }

    /**
     * Load statistics from save data
     */
    async loadStatistics() {
        try {
            const recent = await saveManager.getMostRecentSlot();
            if (recent) {
                const saveData = await saveManager.loadGame(recent);
                if (saveData && saveData.statistics) {
                    this.statisticsManager.loadStatistics(saveData.statistics);
                }
            }
        } catch (error) {
            // Silent error handling
        }
    }

    /**
     * Load achievements from save data
     */
    async loadAchievements() {
        try {
            const recent = await saveManager.getMostRecentSlot();
            if (recent) {
                const saveData = await saveManager.loadGame(recent);
                if (saveData && saveData.achievements) {
                    // Validate achievements data structure before loading
                    const achievementsData = saveData.achievements;

                    // Check if data is in expected format (object, Map, or array)
                    if (achievementsData !== null && achievementsData !== undefined) {
                        // Valid data types: object, Map, or array (which will be converted)
                        const isValidType =
                            achievementsData instanceof Map ||
                            (typeof achievementsData === 'object' && !Array.isArray(achievementsData)) ||
                            Array.isArray(achievementsData);

                        if (isValidType) {
                            this.achievementManager.loadAchievements(achievementsData);
                        }
                    }
                }
            }
        } catch (error) {
            // Don't throw - allow game to continue without achievements loaded
        }
    }

    /**
     * Load prestige from save data
     */
    async loadPrestige() {
        try {
            const recent = await saveManager.getMostRecentSlot();
            if (recent) {
                const saveData = await saveManager.loadGame(recent);
                if (saveData && saveData.prestige) {
                    this.prestigeManager.loadPrestige(saveData.prestige);
                }
            }
        } catch (error) {
            // Silent error handling
        }
    }

    /**
     * Save game and transition to main menu
     */
    async saveAndExit() {
        try {
            const worldState = this.worldManager.getWorldState();
            const equipmentState = this.equipmentManager.getSaveData();
            const shopState = this.shopManager.getSaveData();
            const inventoryState = this.lootManager.getInventory();
            const statistics = this.statisticsManager.getSaveData();
            const achievements = this.achievementManager.getSaveData();
            const prestige = this.prestigeManager.getSaveData();

            const worldConfig = this.scene.cache.json.get('worldConfig');
            const gameData = saveManager.createDefaultSaveData(worldConfig);
            gameData.world = worldState;
            gameData.equipment = equipmentState;
            gameData.shop = shopState;
            gameData.inventory = inventoryState;
            gameData.statistics = statistics;
            gameData.achievements = achievements;
            gameData.prestige = prestige;

            // Save hero mana and abilities state
            if (this.scene.hero && this.scene.hero.data) {
                gameData.player.mana = this.scene.hero.data.mana || gameData.player.mana;
                gameData.player.maxMana = this.scene.hero.data.maxMana || gameData.player.maxMana;
                gameData.player.manaRegen = this.scene.hero.data.manaRegen || gameData.player.manaRegen;
                gameData.player.abilities = this.scene.hero.data.abilities || gameData.player.abilities;
            }

            saveManager.saveGame(gameData, 1);
        } catch (error) {
            // Handle save error silently
        }

        // Clean up audio manager
        this.scene.audioManager.destroy();

        this.scene.scene.start('MainScene');
    }
}

