import { ErrorHandler } from './error-handler.js';
import { withTimeout } from './async-helpers.js';
import { saveMigration } from './save-migration.js';

/**
 * Save Manager - Handles game save/load functionality
 * Uses localStorage for browser-based persistence or Electron IPC for desktop
 */

export class SaveManager {
    constructor() {
        this.saveKey = 'roadOfWarSave';
        this.maxSaveSlots = 3;
        this.autoSaveEnabled = true;
        this.autoSaveInterval = 30000; // 30 seconds
        this.lastAutoSave = 0;
        this.isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;
    }

    /**
     * Save game data to specified slot
     * @param {Object} gameData - Game data to save
     * @param {number} slot - Save slot number (1-3)
     * @returns {Promise<boolean>|boolean} - True if save successful
     */
    async saveGame(gameData, slot = 1) {
        // Clear cache when saving to ensure fresh data on next load
        this.clearRecentSlotCache();
        
        try {
            if (slot < 1 || slot > this.maxSaveSlots) {
                return { success: false, error: 'Invalid save slot' };
            }

            if (this.isElectron) {
                // Use Electron IPC with timeout
                const result = await withTimeout(
                    window.electronAPI.saveGame(gameData, slot),
                    5000,
                    'Save operation timed out'
                );
                if (result.success) {
                    return { success: true };
                } else {
                    ErrorHandler.handle(result.error || new Error('Save failed'), 'SaveManager.saveGame', 'error');
                    return { success: false, error: result.error };
                }
            } else {
                // Use localStorage
                const saveData = {
                    ...gameData,
                    timestamp: Date.now(),
                    slot: slot,
                    version: saveMigration.currentVersion
                };

                const slotKey = `${this.saveKey}_slot${slot}`;
                localStorage.setItem(slotKey, JSON.stringify(saveData));

                // Also update the most recent save
                localStorage.setItem(`${this.saveKey}_recent`, JSON.stringify({
                    slot: slot,
                    timestamp: Date.now()
                }));

                return { success: true };
            }
        } catch (error) {
            return false;
        }
    }

    /**
     * Load game data from specified slot
     * @param {number} slot - Save slot number (1-3)
     * @returns {Promise<Object|null>|Object|null} - Game data or null if not found
     */
    async loadGame(slot = 1) {
        try {
            if (slot < 1 || slot > this.maxSaveSlots) {
                return null;
            }

            if (this.isElectron) {
                // Use Electron IPC
                const result = await window.electronAPI.loadGame(slot);
                if (result.success && result.data) {
                    const parsedData = result.data;
                    
                    // Validate and migrate save data
                    if (!this.validateSaveData(parsedData)) {
                        const migrated = this.migrateSaveData(parsedData);
                        if (this.validateSaveData(migrated)) {
                            // Save migrated data back
                            await this.saveGame(migrated, slot);
                            return migrated;
                        } else {
                            return null;
                        }
                    }
                    
                    // Migrate if needed
                    const migrated = this.migrateSaveData(parsedData);
                    if (migrated.version !== parsedData.version) {
                        await this.saveGame(migrated, slot);
                    }
                    
                    return migrated;
                } else {
                    return null;
                }
            } else {
                // Use localStorage
                const slotKey = `${this.saveKey}_slot${slot}`;
                const saveData = localStorage.getItem(slotKey);

                if (!saveData) {
                    return null;
                }

                const parsedData = JSON.parse(saveData);
                
                // Validate and migrate save data
                if (!this.validateSaveData(parsedData)) {
                    const migrated = this.migrateSaveData(parsedData);
                    if (this.validateSaveData(migrated)) {
                        // Save migrated data back
                        await this.saveGame(migrated, slot);
                        return migrated;
                    } else {
                        return null;
                    }
                }
                
                // Migrate if needed
                const migrated = this.migrateSaveData(parsedData);
                if (migrated.version !== parsedData.version) {
                    await this.saveGame(migrated, slot);
                }
                
                return migrated;
            }
        } catch (error) {
            return null;
        }
    }

    /**
     * Get information about all save slots
     * @returns {Promise<Array>|Array} - Array of save slot information
     */
    async getSaveSlots() {
        if (this.isElectron) {
            // Use Electron IPC
            const result = await window.electronAPI.getSaveSlots();
            if (result.success) {
                return result.slots;
            } else {
                return [];
            }
        } else {
            // Use localStorage
            const slots = [];
            
            for (let i = 1; i <= this.maxSaveSlots; i++) {
                const slotKey = `${this.saveKey}_slot${i}`;
                const saveData = localStorage.getItem(slotKey);
                
                if (saveData) {
                    try {
                        const parsedData = JSON.parse(saveData);
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

            return slots;
        }
    }

    /**
     * Get most recent save slot (cached to prevent excessive loads)
     * @returns {Promise<number|null>|number|null} - Most recent slot number or null
     */
    async getMostRecentSlot() {
        // Cache the result for this session to prevent excessive loads
        if (this._cachedRecentSlot !== undefined) {
            return this._cachedRecentSlot;
        }
        
        try {
            if (this.isElectron) {
                // Use Electron IPC
                const result = await window.electronAPI.getMostRecentSlot();
                if (result.success) {
                    this._cachedRecentSlot = result.slot;
                    return result.slot;
                } else {
                    this._cachedRecentSlot = null;
                    return null;
                }
            } else {
                // Use localStorage
                const recentData = localStorage.getItem(`${this.saveKey}_recent`);
                if (recentData) {
                    const parsed = JSON.parse(recentData);
                    this._cachedRecentSlot = parsed.slot || null;
                    return this._cachedRecentSlot;
                }
                this._cachedRecentSlot = null;
                return null;
            }
        } catch (error) {
            this._cachedRecentSlot = null;
            return null;
        }
    }
    
    /**
     * Clear cached recent slot (call after saving to refresh cache)
     */
    clearRecentSlotCache() {
        this._cachedRecentSlot = undefined;
    }

    /**
     * Delete save data from specified slot
     * @param {number} slot - Save slot number (1-3)
     * @returns {Promise<boolean>|boolean} - True if deletion successful
     */
    async deleteSave(slot = 1) {
        try {
            if (slot < 1 || slot > this.maxSaveSlots) {
                return false;
            }

            if (this.isElectron) {
                // Use Electron IPC
                const result = await window.electronAPI.deleteSave(slot);
                if (result.success) {
                    return true;
                } else {
                    return false;
                }
            } else {
                // Use localStorage
                const slotKey = `${this.saveKey}_slot${slot}`;
                localStorage.removeItem(slotKey);

                // Clear from recent if this was the most recent
                const recentSlot = await this.getMostRecentSlot();
                if (recentSlot === slot) {
                    localStorage.removeItem(`${this.saveKey}_recent`);
                }

                return true;
            }
        } catch (error) {
            return false;
        }
    }

    /**
     * Clear all save data
     * @returns {Promise<boolean>|boolean} - True if clear successful
     */
    async clearAllSaves() {
        try {
            if (this.isElectron) {
                // Use Electron IPC
                const result = await window.electronAPI.clearAllSaves();
                if (result.success) {
                    return true;
                } else {
                    return false;
                }
            } else {
                // Use localStorage
                for (let i = 1; i <= this.maxSaveSlots; i++) {
                    const slotKey = `${this.saveKey}_slot${i}`;
                    localStorage.removeItem(slotKey);
                }
                localStorage.removeItem(`${this.saveKey}_recent`);
                return true;
            }
        } catch (error) {
            return false;
        }
    }

    /**
     * Format timestamp for display
     * @param {number} timestamp - Unix timestamp
     * @returns {string} - Formatted date string
     */
    formatTimestamp(timestamp) {
        if (!timestamp || timestamp === 0) {
            return 'No Save';
        }

        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    /**
     * Auto-save game data
     * @param {Function} getGameData - Function that returns current game data
     * @param {number} slot - Save slot (defaults to most recent)
     * @returns {Promise<boolean>|boolean} - True if auto-save successful
     */
    async autoSave(getGameData, slot = null) {
        if (!this.autoSaveEnabled) return false;
        
        const now = Date.now();
        if (now - this.lastAutoSave < this.autoSaveInterval) {
            return false; // Too soon since last save
        }
        
        try {
            const targetSlot = slot || await this.getMostRecentSlot() || 1;
            const gameData = getGameData();
            
            if (this.validateSaveData(gameData)) {
                const success = await this.saveGame(gameData, targetSlot);
                if (success) {
                    this.lastAutoSave = now;
                    return true;
                }
            }
        } catch (error) {
        }
        
        return false;
    }

    /**
     * Validate save data structure
     * @param {Object} saveData - Save data to validate
     * @returns {boolean} - True if valid
     */
    validateSaveData(saveData) {
        if (!saveData || typeof saveData !== 'object') {
            return false;
        }
        
        // Check required fields
        const requiredFields = ['player', 'equipment', 'inventory', 'world', 'settings'];
        for (const field of requiredFields) {
            if (!saveData.hasOwnProperty(field)) {
                return false;
            }
        }
        
        // Validate player data
        if (!saveData.player || typeof saveData.player !== 'object') {
            return false;
        }
        
        // Validate equipment data
        if (!saveData.equipment || typeof saveData.equipment !== 'object') {
            return false;
        }
        
        return true;
    }

    /**
     * Get save version from save data
     * @param {Object} saveData - Save data
     * @returns {string} Version string
     */
    getSaveVersion(saveData) {
        return saveMigration.getSaveVersion(saveData);
    }

    /**
     * Migrate save data to latest version
     * @param {Object} saveData - Save data to migrate
     * @returns {Object} - Migrated save data
     */
    migrateToLatest(saveData) {
        return saveMigration.migrateToLatest(saveData);
    }

    /**
     * Migrate save data from older versions (backward compatibility)
     * @param {Object} saveData - Save data to migrate
     * @returns {Object} - Migrated save data
     */
    migrateSaveData(saveData) {
        // Use new migration system
        return this.migrateToLatest(saveData);
    }

    /**
     * Create default game data structure
     * @param {Object} worldConfig - Optional world configuration (from world-config.json)
     * @returns {Object} - Default game data
     */
    createDefaultSaveData(worldConfig = null) {
        // Use worldConfig if provided, otherwise fall back to hard-coded defaults
        const startingStats = worldConfig?.player?.startingStats || {
            health: 100,
            maxHealth: 100,
            attack: 10,
            defense: 5
        };

        // Get paladin config for mana stats
        const paladinConfig = worldConfig?.paladin || {};
        const maxMana = paladinConfig.maxMana || 100;
        
        return {
            player: {
                level: 1,
                experience: 0,
                gold: 100,
                health: startingStats.health,
                maxHealth: startingStats.maxHealth,
                attack: startingStats.attack,
                defense: startingStats.defense,
                mana: maxMana,
                maxMana: maxMana,
                manaRegen: paladinConfig.manaRegen || 10,
                abilities: {
                    defensive: { active: false, turnsRemaining: 0 },
                    heal: { cooldown: 0 },
                    autoAttack: { cooldown: 0 }
                }
            },
            party: {
                heroes: []
            },
            equipment: {
                weapon: null,
                chest: null,
                ring: null,
                amulet: null,
                currentHeroId: null,
                allHeroEquipment: {},
                allHeroStats: {}
            },
            inventory: [],
            shop: {
                gold: 100
            },
            world: {
                currentSegment: 0,
                currentMile: 0,
                maxMileReached: 0,
                enemiesDefeated: 0,
                distanceTraveled: 0
            },
            settings: {
                masterVolume: 0.8,
                sfxVolume: 0.7,
                musicVolume: 0.6,
                autoSpeed: true,
                showDamageNumbers: true,
                fullscreen: false,
                particleEffects: true
            },
            statistics: {
                combat: {
                    totalDamageDealt: 0,
                    totalDamageTaken: 0,
                    enemiesDefeated: 0,
                    combatsWon: 0,
                    combatsLost: 0,
                    criticalHits: 0,
                    totalHits: 0,
                    misses: 0
                },
                progression: {
                    levelsGained: 0,
                    currentLevel: 1,
                    totalExperience: 0,
                    segmentsVisited: 0,
                    distanceTraveled: 0,
                    maxLevelReached: 1
                },
                collection: {
                    itemsFound: 0,
                    itemsEquipped: 0,
                    goldEarned: 0,
                    goldSpent: 0,
                    legendaryItemsFound: 0,
                    uniqueItemsFound: []
                },
                time: {
                    totalPlayTime: 0,
                    sessionStartTime: Date.now(),
                    longestSession: 0,
                    sessionsCount: 0
                },
                world: {
                    encountersTriggered: 0,
                    shopsVisited: 0,
                    treasuresFound: 0,
                    questsCompleted: 0
                }
            },
            achievements: {},
            prestige: {
                prestigeLevel: 0,
                prestigePoints: 0,
                prestigePointsEarned: 0,
                purchasedUpgrades: []
            },
            version: saveMigration.currentVersion
        };
    }
}

// Export singleton instance
export const saveManager = new SaveManager();
