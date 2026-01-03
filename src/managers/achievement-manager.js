import { Logger } from '../utils/logger.js';
import { GameEvents } from '../utils/event-constants.js';
import { BaseManager } from './base-manager.js';

/**
 * Achievement Manager - Tracks and validates player achievements
 * Monitors game events and awards achievements when conditions are met
 */

export class AchievementManager extends BaseManager {
    /**
     * Get manager dependencies
     * @returns {string[]} Array of dependency names
     */
    static getDependencies() {
        return ['statisticsManager'];
    }

    /**
     * Create a new AchievementManager.
     * @param {Phaser.Scene} scene - Phaser scene instance.
     * @param {Object} config - Configuration object (may contain statisticsManager)
     */
    constructor(scene, config = {}) {
        super(scene, config);
        this.statisticsManager = config.statisticsManager || null;
        this.achievementsData = null;
        this.statisticsManager = null;
        
        // Achievement state
        this.achievements = new Map(); // Map of achievementId -> { unlocked: boolean, progress: number, unlockedAt: timestamp }
        
        // Event listeners
        this.setupEventListeners();
    }

    /**
     * Initialize the manager
     * @param {Object} statisticsManager - StatisticsManager instance (for backward compatibility)
     * @returns {Promise<void>}
     */
    async init(statisticsManager = null) {
        await super.init();
        if (statisticsManager) {
            this.statisticsManager = statisticsManager;
        }
        this.loadAchievementsData();
        this.initializeAchievements();
        Logger.info('AchievementManager', 'Initialized');
    }

    /**
     * Reload achievements data for hot-reload support
     * @async
     */
    async reloadAchievements() {
        try {
            Logger.info('AchievementManager', 'Reloading achievements data...');

            // Reload the JSON data
            await this.scene.cache.json.remove('achievements');
            this.scene.load.json('achievements', '/data/achievements.json');
            await new Promise((resolve) => {
                this.scene.load.once('filecomplete-json-achievements', resolve);
                this.scene.load.start();
            });

            // Reload the data and reinitialize achievements
            this.loadAchievementsData();
            this.initializeAchievements();

            Logger.info('AchievementManager', 'Achievements data reloaded successfully');

        } catch (error) {
            Logger.error('AchievementManager', 'Failed to reload achievements data:', error);
            throw error;
        }
    }

    /**
     * Initialize achievement system
     * @param {Object} statisticsManager - Statistics manager instance
     */
    init(statisticsManager) {
        this.statisticsManager = statisticsManager;
        this.loadAchievementsData();
        this.initializeAchievements();
    }

    /**
     * Load achievements data from cache
     */
    loadAchievementsData() {
        try {
            this.achievementsData = this.scene.cache.json.get('achievements');
        } catch (error) {
            Logger.warn('AchievementManager', 'Achievements data not found, using empty data');
            this.achievementsData = { achievements: [] };
        }
    }

    /**
     * Initialize all achievements
     */
    initializeAchievements() {
        if (!this.achievementsData || !this.achievementsData.achievements) return;
        
        this.achievementsData.achievements.forEach(achievement => {
            if (!this.achievements.has(achievement.id)) {
                this.achievements.set(achievement.id, {
                    unlocked: false,
                    progress: 0,
                    unlockedAt: null
                });
            }
        });
    }

    /**
     * Set up event listeners for achievement checking
     */
    setupEventListeners() {
        // Combat events
        this.scene.events.on(GameEvents.COMBAT.END, (data) => {
            this.checkCombatAchievements(data);
        });
        
        // Progression events
        this.scene.events.on('level_up', (data) => {
            this.checkProgressionAchievements(data);
        });
        
        // Collection events
        this.scene.events.on(GameEvents.ITEM.PICKED_UP, (data) => {
            this.checkCollectionAchievements(data);
        });
        
        this.scene.events.on(GameEvents.ITEM.EQUIPMENT_CHANGED, (data) => {
            this.checkEquipmentAchievements(data);
        });
        
        // World events
        this.scene.events.on('encounter_trigger', () => {
            this.checkWorldAchievements();
        });
        
        // Periodic achievement check
        this.scene.time.addEvent({
            delay: 5000, // Check every 5 seconds
            callback: () => {
                this.checkAllAchievements();
            },
            loop: true
        });
    }

    /**
     * Check combat-related achievements
     * @param {Object} data - Combat end data
     */
    checkCombatAchievements(data) {
        if (!this.statisticsManager) return;
        
        const stats = this.statisticsManager.getStatisticsByCategory('combat');
        
        this.checkAchievement('defeat_10_enemies', stats.enemiesDefeated >= 10);
        this.checkAchievement('defeat_100_enemies', stats.enemiesDefeated >= 100);
        this.checkAchievement('defeat_1000_enemies', stats.enemiesDefeated >= 1000);
        this.checkAchievement('win_10_combats', stats.combatsWon >= 10);
        this.checkAchievement('win_100_combats', stats.combatsWon >= 100);
        this.checkAchievement('critical_hit_10', stats.criticalHits >= 10);
        this.checkAchievement('critical_hit_100', stats.criticalHits >= 100);
    }

    /**
     * Check progression-related achievements
     * @param {Object} data - Level up data
     */
    checkProgressionAchievements(data) {
        if (!this.statisticsManager) return;
        
        const stats = this.statisticsManager.getStatisticsByCategory('progression');
        const newLevel = data.newLevel || stats.currentLevel;
        
        this.checkAchievement('reach_level_5', newLevel >= 5);
        this.checkAchievement('reach_level_10', newLevel >= 10);
        this.checkAchievement('reach_level_20', newLevel >= 20);
        this.checkAchievement('reach_level_50', newLevel >= 50);
        this.checkAchievement('visit_10_segments', stats.segmentsVisited >= 10);
        this.checkAchievement('visit_100_segments', stats.segmentsVisited >= 100);
    }

    /**
     * Check collection-related achievements
     * @param {Object} data - Item pickup data
     */
    checkCollectionAchievements(data) {
        if (!this.statisticsManager) return;
        
        const stats = this.statisticsManager.getStatisticsByCategory('collection');
        
        this.checkAchievement('collect_10_items', stats.itemsFound >= 10);
        this.checkAchievement('collect_50_items', stats.itemsFound >= 50);
        this.checkAchievement('collect_100_items', stats.itemsFound >= 100);
        this.checkAchievement('earn_1000_gold', stats.goldEarned >= 1000);
        this.checkAchievement('earn_10000_gold', stats.goldEarned >= 10000);
        
        // Check for legendary items
        if (data.item && data.item.data && data.item.data.rarity === 'legendary') {
            this.checkAchievement('find_legendary_item', true);
        }
    }

    /**
     * Check equipment-related achievements
     * @param {Object} data - Equipment change data
     */
    checkEquipmentAchievements(data) {
        if (!this.statisticsManager) return;
        
        const stats = this.statisticsManager.getStatisticsByCategory('collection');
        
        this.checkAchievement('equip_10_items', stats.itemsEquipped >= 10);
        this.checkAchievement('equip_50_items', stats.itemsEquipped >= 50);
    }

    /**
     * Check world-related achievements
     */
    checkWorldAchievements() {
        if (!this.statisticsManager) return;
        
        const stats = this.statisticsManager.getStatisticsByCategory('world');
        
        this.checkAchievement('visit_10_shops', stats.shopsVisited >= 10);
        this.checkAchievement('find_10_treasures', stats.treasuresFound >= 10);
        this.checkAchievement('complete_10_quests', stats.questsCompleted >= 10);
    }

    /**
     * Check all achievements based on current statistics
     */
    checkAllAchievements() {
        if (!this.statisticsManager) return;
        
        const stats = this.statisticsManager.getStatistics();
        
        // Combat achievements
        this.checkAchievement('defeat_10_enemies', stats.combat.enemiesDefeated >= 10);
        this.checkAchievement('defeat_100_enemies', stats.combat.enemiesDefeated >= 100);
        this.checkAchievement('defeat_1000_enemies', stats.combat.enemiesDefeated >= 1000);
        this.checkAchievement('win_10_combats', stats.combat.combatsWon >= 10);
        this.checkAchievement('win_100_combats', stats.combat.combatsWon >= 100);
        this.checkAchievement('critical_hit_10', stats.combat.criticalHits >= 10);
        this.checkAchievement('critical_hit_100', stats.combat.criticalHits >= 100);
        
        // Progression achievements
        this.checkAchievement('reach_level_5', stats.progression.currentLevel >= 5);
        this.checkAchievement('reach_level_10', stats.progression.currentLevel >= 10);
        this.checkAchievement('reach_level_20', stats.progression.currentLevel >= 20);
        this.checkAchievement('reach_level_50', stats.progression.currentLevel >= 50);
        this.checkAchievement('visit_10_segments', stats.progression.segmentsVisited >= 10);
        this.checkAchievement('visit_100_segments', stats.progression.segmentsVisited >= 100);
        
        // Collection achievements
        this.checkAchievement('collect_10_items', stats.collection.itemsFound >= 10);
        this.checkAchievement('collect_50_items', stats.collection.itemsFound >= 50);
        this.checkAchievement('collect_100_items', stats.collection.itemsFound >= 100);
        this.checkAchievement('earn_1000_gold', stats.collection.goldEarned >= 1000);
        this.checkAchievement('earn_10000_gold', stats.collection.goldEarned >= 10000);
        this.checkAchievement('equip_10_items', stats.collection.itemsEquipped >= 10);
        this.checkAchievement('equip_50_items', stats.collection.itemsEquipped >= 50);
        
        // World achievements
        this.checkAchievement('visit_10_shops', stats.world.shopsVisited >= 10);
        this.checkAchievement('find_10_treasures', stats.world.treasuresFound >= 10);
        this.checkAchievement('complete_10_quests', stats.world.questsCompleted >= 10);
    }

    /**
     * Check a specific achievement
     * @param {string} achievementId - Achievement ID
     * @param {boolean|number} condition - Condition to check (true/false or progress value)
     */
    checkAchievement(achievementId, condition) {
        const achievement = this.achievements.get(achievementId);
        if (!achievement || achievement.unlocked) return;
        
        const achievementData = this.getAchievementData(achievementId);
        if (!achievementData) return;
        
        // Update progress
        if (typeof condition === 'number') {
            achievement.progress = Math.min(condition, achievementData.requirement || condition);
        } else if (condition === true) {
            achievement.progress = achievementData.requirement || 1;
        }
        
        // Check if achievement is unlocked
        const requirement = achievementData.requirement || 1;
        if (achievement.progress >= requirement) {
            this.unlockAchievement(achievementId);
        }
    }

    /**
     * Unlock an achievement
     * @param {string} achievementId - Achievement ID
     */
    unlockAchievement(achievementId) {
        const achievement = this.achievements.get(achievementId);
        if (!achievement || achievement.unlocked) return;
        
        achievement.unlocked = true;
        achievement.unlockedAt = Date.now();
        
        const achievementData = this.getAchievementData(achievementId);
        
        // Emit achievement unlocked event
        this.scene.events.emit('achievement_unlocked', {
            id: achievementId,
            name: achievementData?.name || achievementId,
            description: achievementData?.description || '',
            reward: achievementData?.reward || null
        });
        
        // Apply reward if any
        if (achievementData && achievementData.reward) {
            this.applyReward(achievementData.reward);
        }
        
        Logger.info('AchievementManager', `Achievement unlocked: ${achievementData?.name || achievementId}`);
    }

    /**
     * Get achievement data by ID
     * @param {string} achievementId - Achievement ID
     * @returns {Object|null} - Achievement data
     */
    getAchievementData(achievementId) {
        if (!this.achievementsData || !this.achievementsData.achievements) return null;
        
        return this.achievementsData.achievements.find(a => a.id === achievementId) || null;
    }

    /**
     * Apply achievement reward
     * @param {Object} reward - Reward data
     */
    applyReward(reward) {
        if (!reward) return;
        
        // Emit reward event for other systems to handle
        this.scene.events.emit('achievement_reward', reward);
        
        // Apply gold reward
        if (reward.gold) {
            this.scene.events.emit(GameEvents.ECONOMY.GOLD_CHANGED, { amount: reward.gold });
        }
        
        // Apply experience reward
        if (reward.experience) {
            this.scene.events.emit('experience_gained', { amount: reward.experience });
        }
    }

    /**
     * Get all achievements
     * @returns {Map} - Map of achievements
     */
    getAchievements() {
        return this.achievements;
    }

    /**
     * Get achievement by ID
     * @param {string} achievementId - Achievement ID
     * @returns {Object|null} - Achievement state
     */
    getAchievement(achievementId) {
        return this.achievements.get(achievementId) || null;
    }

    /**
     * Get unlocked achievements count
     * @returns {number} - Number of unlocked achievements
     */
    getUnlockedCount() {
        let count = 0;
        this.achievements.forEach(achievement => {
            if (achievement.unlocked) count++;
        });
        return count;
    }

    /**
     * Get total achievements count
     * @returns {number} - Total number of achievements
     */
    getTotalCount() {
        return this.achievements.size;
    }

    /**
     * Load achievements from save data
     * @param {Object|Map|Array} achievementsData - Achievements data from save
     */
    loadAchievements(achievementsData) {
        if (!achievementsData) {
            Logger.debug('AchievementManager', 'No achievements data provided to loadAchievements');
            return;
        }
        
        // Handle null or undefined
        if (achievementsData === null || achievementsData === undefined) {
            Logger.debug('AchievementManager', 'Achievements data is null or undefined');
            return;
        }
        
        // Handle arrays - convert to object format if needed
        if (Array.isArray(achievementsData)) {
            Logger.warn('AchievementManager', 'Achievements data is an array, attempting to convert to object format');
            // Try to convert array to object format
            // If array contains objects with 'id' property, convert to object map
            const convertedData = {};
            achievementsData.forEach((item, index) => {
                if (item && typeof item === 'object' && item.id) {
                    convertedData[item.id] = {
                        unlocked: item.unlocked || false,
                        progress: item.progress || 0,
                        unlockedAt: item.unlockedAt || null
                    };
                } else if (item && typeof item === 'object') {
                    // Fallback: use index as key if no id property
                    convertedData[`achievement_${index}`] = item;
                }
            });
            achievementsData = convertedData;
        }
        
        // Handle Map structures
        if (achievementsData instanceof Map) {
            try {
            achievementsData.forEach((data, id) => {
                if (this.achievements.has(id)) {
                    Object.assign(this.achievements.get(id), data);
                }
            });
                Logger.debug('AchievementManager', `Loaded ${achievementsData.size} achievements from Map`);
            } catch (error) {
                Logger.error('AchievementManager', 'Error loading achievements from Map:', error);
            }
            return;
        }
        
        // Handle plain objects (expected format)
        if (typeof achievementsData === 'object' && !Array.isArray(achievementsData)) {
            try {
                let loadedCount = 0;
            Object.keys(achievementsData).forEach(id => {
                if (this.achievements.has(id)) {
                        const savedData = achievementsData[id];
                        if (savedData && typeof savedData === 'object') {
                            Object.assign(this.achievements.get(id), {
                                unlocked: savedData.unlocked || false,
                                progress: savedData.progress || 0,
                                unlockedAt: savedData.unlockedAt || null
                            });
                            loadedCount++;
                        }
                }
            });
                Logger.debug('AchievementManager', `Loaded ${loadedCount} achievements from object`);
            } catch (error) {
                Logger.error('AchievementManager', 'Error loading achievements from object:', error);
            }
            return;
        }
        
        // Log unexpected data type
        Logger.warn('AchievementManager', 'Unexpected achievements data type:', typeof achievementsData, achievementsData);
    }

    /**
     * Get achievements for saving
     * @returns {Object} - Achievements data ready for save
     */
    getSaveData() {
        const saveData = {};
        this.achievements.forEach((achievement, id) => {
            saveData[id] = {
                unlocked: achievement.unlocked,
                progress: achievement.progress,
                unlockedAt: achievement.unlockedAt
            };
        });
        return saveData;
    }
}

