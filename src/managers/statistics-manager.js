import { Logger } from '../utils/logger.js';
import { GameEvents } from '../utils/event-constants.js';
import { BaseManager } from './base-manager.js';

/**
 * Statistics Manager - Tracks comprehensive player statistics
 * Collects and stores gameplay data for insights and achievements
 */

export class StatisticsManager extends BaseManager {
    /**
     * Get manager dependencies
     * @returns {string[]} Array of dependency names
     */
    static getDependencies() {
        return []; // StatisticsManager has no dependencies
    }

    /**
     * Create a new StatisticsManager.
     * @param {Phaser.Scene} scene - Phaser scene instance.
     * @param {Object} config - Configuration object
     */
    constructor(scene, config = {}) {
        super(scene, config);
        
        // Statistics data structure
        this.stats = {
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
                uniqueItemsFound: new Set()
            },
            time: {
                totalPlayTime: 0, // in milliseconds
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
        };
        
        // Event listeners
        this.setupEventListeners();
        
        Logger.info('StatisticsManager', 'Initialized');
    }

    /**
     * Set up event listeners for statistics tracking
     */
    setupEventListeners() {
        // Combat events
        this.scene.events.on(GameEvents.COMBAT.END, (data) => {
            this.trackCombatEnd(data);
        });
        
        this.scene.events.on('damage_dealt', (data) => {
            this.trackDamageDealt(data);
        });
        
        this.scene.events.on('damage_taken', (data) => {
            this.trackDamageTaken(data);
        });
        
        this.scene.events.on('critical_hit', () => {
            this.stats.combat.criticalHits++;
        });
        
        this.scene.events.on('miss', () => {
            this.stats.combat.misses++;
        });
        
        // Progression events
        this.scene.events.on('level_up', (data) => {
            this.trackLevelUp(data);
        });
        
        this.scene.events.on('experience_gained', (data) => {
            this.stats.progression.totalExperience += data.amount || 0;
        });
        
        this.scene.events.on('segment_visited', () => {
            this.stats.progression.segmentsVisited++;
        });
        
        // Collection events
        this.scene.events.on(GameEvents.ITEM.PICKED_UP, (data) => {
            this.trackItemPickup(data);
        });
        
        this.scene.events.on(GameEvents.ITEM.EQUIPMENT_CHANGED, (data) => {
            if (data.itemId) {
                this.stats.collection.itemsEquipped++;
            }
        });
        
        this.scene.events.on(GameEvents.ECONOMY.GOLD_CHANGED, (data) => {
            if (data.amount > 0) {
                this.stats.collection.goldEarned += data.amount;
            } else {
                this.stats.collection.goldSpent += Math.abs(data.amount);
            }
        });
        
        // World events
        this.scene.events.on('encounter_trigger', () => {
            this.stats.world.encountersTriggered++;
        });
        
        this.scene.events.on('shop_visited', () => {
            this.stats.world.shopsVisited++;
        });
        
        this.scene.events.on('treasure_found', () => {
            this.stats.world.treasuresFound++;
        });
    }

    /**
     * Track combat end statistics
     * @param {Object} data - Combat end data
     */
    trackCombatEnd(data) {
        if (data.victory) {
            this.stats.combat.combatsWon++;
            this.stats.combat.enemiesDefeated++;
        } else {
            this.stats.combat.combatsLost++;
        }
    }

    /**
     * Track damage dealt
     * @param {Object} data - Damage data
     */
    trackDamageDealt(data) {
        this.stats.combat.totalDamageDealt += data.amount || 0;
        this.stats.combat.totalHits++;
    }

    /**
     * Track damage taken
     * @param {Object} data - Damage data
     */
    trackDamageTaken(data) {
        this.stats.combat.totalDamageTaken += data.amount || 0;
    }

    /**
     * Track level up
     * @param {Object} data - Level up data
     */
    trackLevelUp(data) {
        this.stats.progression.levelsGained++;
        const newLevel = data.newLevel || this.stats.progression.currentLevel + 1;
        this.stats.progression.currentLevel = newLevel;
        this.stats.progression.maxLevelReached = Math.max(
            this.stats.progression.maxLevelReached,
            newLevel
        );
    }

    /**
     * Track item pickup
     * @param {Object} data - Item pickup data
     */
    trackItemPickup(data) {
        this.stats.collection.itemsFound++;
        
        if (data.item && data.item.data) {
            const itemData = data.item.data;
            
            // Track unique items
            if (itemData.id) {
                this.stats.collection.uniqueItemsFound.add(itemData.id);
            }
            
            // Track legendary items
            if (itemData.rarity === 'legendary') {
                this.stats.collection.legendaryItemsFound++;
            }
        }
    }

    /**
     * Update distance traveled
     * @param {number} distance - Distance to add
     */
    updateDistanceTraveled(distance) {
        this.stats.progression.distanceTraveled += distance;
    }

    /**
     * Update play time
     */
    updatePlayTime() {
        const now = Date.now();
        const sessionTime = now - this.stats.time.sessionStartTime;
        this.stats.time.totalPlayTime += sessionTime;
        this.stats.time.longestSession = Math.max(
            this.stats.time.longestSession,
            sessionTime
        );
        this.stats.time.sessionStartTime = now;
    }

    /**
     * Get all statistics
     * @returns {Object} - Complete statistics object
     */
    getStatistics() {
        // Update play time before returning
        this.updatePlayTime();
        
        // Convert Set to Array for JSON serialization
        const statsCopy = JSON.parse(JSON.stringify(this.stats));
        statsCopy.collection.uniqueItemsFound = Array.from(this.stats.collection.uniqueItemsFound);
        
        return statsCopy;
    }

    /**
     * Get statistics by category
     * @param {string} category - Category name (combat, progression, collection, time, world)
     * @returns {Object} - Statistics for that category
     */
    getStatisticsByCategory(category) {
        return this.stats[category] || {};
    }

    /**
     * Load statistics from save data
     * @param {Object} statsData - Statistics data from save
     */
    loadStatistics(statsData) {
        if (!statsData) return;
        
        // Merge loaded stats with current
        if (statsData.combat) {
            Object.assign(this.stats.combat, statsData.combat);
        }
        if (statsData.progression) {
            Object.assign(this.stats.progression, statsData.progression);
        }
        if (statsData.collection) {
            Object.assign(this.stats.collection, statsData.collection);
            if (statsData.collection.uniqueItemsFound) {
                this.stats.collection.uniqueItemsFound = new Set(statsData.collection.uniqueItemsFound);
            }
        }
        if (statsData.time) {
            Object.assign(this.stats.time, statsData.time);
            this.stats.time.sessionStartTime = Date.now();
        }
        if (statsData.world) {
            Object.assign(this.stats.world, statsData.world);
        }
    }

    /**
     * Get statistics for saving
     * @returns {Object} - Statistics data ready for save
     */
    getSaveData() {
        this.updatePlayTime();
        
        const saveData = JSON.parse(JSON.stringify(this.stats));
        saveData.collection.uniqueItemsFound = Array.from(this.stats.collection.uniqueItemsFound);
        
        return saveData;
    }

    /**
     * Reset all statistics
     */
    resetStatistics() {
        this.stats = {
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
                uniqueItemsFound: new Set()
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
        };
    }

    /**
     * Format time duration
     * @param {number} milliseconds - Time in milliseconds
     * @returns {string} - Formatted time string
     */
    formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
}

