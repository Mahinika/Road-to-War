import { Logger } from '../utils/logger.js';
import { BaseManager } from './base-manager.js';

/**
 * Prestige Manager - Handles prestige/reset system for meta-progression
 * Manages prestige levels, prestige points, and permanent upgrades
 */

export class PrestigeManager extends BaseManager {
    /**
     * Get manager dependencies
     * @returns {string[]} Array of dependency names
     */
    static getDependencies() {
        return []; // PrestigeManager has no dependencies
    }

    /**
     * Create a new PrestigeManager
     * @param {Phaser.Scene} scene - Phaser scene instance
     * @param {Object} config - Configuration object
     */
    constructor(scene, config = {}) {
        super(scene, config);
        this.prestigeConfig = null;
        
        // Prestige state
        this.prestigeLevel = 0;
        this.prestigePoints = 0;
        this.prestigePointsEarned = 0; // Total points earned across all prestiges
        this.purchasedUpgrades = new Set(); // Set of purchased upgrade IDs
        
        // Load configuration
        this.loadPrestigeConfig();
    }

    /**
     * Initialize the manager
     * @returns {Promise<void>}
     */
    async init() {
        await super.init();
        Logger.info('PrestigeManager', 'Initialized');
    }

    /**
     * Reload prestige config for hot-reload support
     * @async
     */
    async reloadPrestigeConfig() {
        try {
            Logger.info('PrestigeManager', 'Reloading prestige config...');

            // Reload the JSON data
            await this.scene.cache.json.remove('prestigeConfig');
            this.scene.load.json('prestigeConfig', '/data/prestige-config.json');
            await new Promise((resolve) => {
                this.scene.load.once('filecomplete-json-prestigeConfig', resolve);
                this.scene.load.start();
            });

            // Reload the config
            this.loadPrestigeConfig();

            Logger.info('PrestigeManager', 'Prestige config reloaded successfully');

        } catch (error) {
            Logger.error('PrestigeManager', 'Failed to reload prestige config:', error);
            throw error;
        }
    }

    /**
     * Load prestige configuration from scene cache
     */
    loadPrestigeConfig() {
        try {
            this.prestigeConfig = this.scene.cache.json.get('prestigeConfig');
        } catch (error) {
            Logger.warn('PrestigeManager', 'Prestige config not found, using defaults');
            this.prestigeConfig = this.getDefaultConfig();
        }
    }

    /**
     * Get default prestige configuration if file load fails
     * @returns {Object} - Default configuration
     */
    getDefaultConfig() {
        return {
            pointsPerLevel: 1,
            basePointsMultiplier: 1.0,
            upgrades: [
                // Basic Combat Upgrades
                {
                    id: 'attack_bonus_1',
                    name: 'Warrior Spirit',
                    description: '+10% base attack for all heroes',
                    cost: 1,
                    type: 'stat_multiplier',
                    stat: 'attack',
                    value: 0.1
                },
                {
                    id: 'defense_bonus_1',
                    name: 'Iron Will',
                    description: '+10% base defense for all heroes',
                    cost: 1,
                    type: 'stat_multiplier',
                    stat: 'defense',
                    value: 0.1
                },
                {
                    id: 'health_bonus_1',
                    name: 'Vitality Surge',
                    description: '+10% base max health',
                    cost: 1,
                    type: 'stat_multiplier',
                    stat: 'maxHealth',
                    value: 0.1
                },

                // Economy Upgrades
                {
                    id: 'gold_bonus_1',
                    name: 'Treasure Hunter',
                    description: '+15% gold from all sources',
                    cost: 2,
                    type: 'gold_multiplier',
                    value: 0.15
                },
                {
                    id: 'gold_bonus_2',
                    name: 'Master Merchant',
                    description: '+25% gold from all sources',
                    cost: 4,
                    type: 'gold_multiplier',
                    value: 0.25
                },

                // Progression Upgrades
                {
                    id: 'xp_bonus_1',
                    name: 'Learning Acceleration',
                    description: '+15% experience gain',
                    cost: 2,
                    type: 'xp_multiplier',
                    value: 0.15
                },
                {
                    id: 'xp_bonus_2',
                    name: 'Wisdom of the Ancients',
                    description: '+25% experience gain',
                    cost: 4,
                    type: 'xp_multiplier',
                    value: 0.25
                },

                // Advanced Combat Upgrades
                {
                    id: 'attack_bonus_2',
                    name: 'Legendary Blade',
                    description: '+15% base attack (stacks with Warrior Spirit)',
                    cost: 3,
                    type: 'stat_multiplier',
                    stat: 'attack',
                    value: 0.15
                },
                {
                    id: 'defense_bonus_2',
                    name: 'Aegis Shield',
                    description: '+15% base defense (stacks with Iron Will)',
                    cost: 3,
                    type: 'stat_multiplier',
                    stat: 'defense',
                    value: 0.15
                },
                {
                    id: 'health_bonus_2',
                    name: 'Eternal Life',
                    description: '+15% base max health (stacks with Vitality Surge)',
                    cost: 3,
                    type: 'stat_multiplier',
                    stat: 'maxHealth',
                    value: 0.15
                },

                // Meta Upgrades
                {
                    id: 'prestige_efficiency',
                    name: 'Prestige Mastery',
                    description: '+20% prestige points from future resets',
                    cost: 5,
                    type: 'prestige_multiplier',
                    value: 0.2
                }
            ]
        };
    }

    /**
     * Calculate potential prestige points based on current game progress
     * @param {Object} gameData - Current game data (mile, level, gold, etc.)
     * @returns {number} - Potential prestige points
     */
    calculatePrestigePoints(gameData) {
        if (!gameData) return 0;

        let points = 0;

        // Base points from level
        if (gameData.player && gameData.player.level) {
            points += Math.floor(gameData.player.level / 10) * this.prestigeConfig.pointsPerLevel;
        }

        // Points from distance traveled
        if (gameData.world && gameData.world.distanceTraveled) {
            points += Math.floor(gameData.world.distanceTraveled / 1000) * 0.1;
        }

        // Points from enemies defeated
        if (gameData.world && gameData.world.enemiesDefeated) {
            points += Math.floor(gameData.world.enemiesDefeated / 100) * 0.5;
        }

        // Apply base multiplier
        points *= this.prestigeConfig.basePointsMultiplier;

        // Apply prestige efficiency bonus
        const prestigeBonus = this.getPrestigeMultiplier();
        points *= (1 + prestigeBonus);

        // Minimum 1 point
        return Math.max(1, Math.floor(points));
    }

    /**
     * Perform prestige reset and award points
     * @param {Object} gameData - Current game data
     * @returns {Object} - Result of prestige (points earned, level increased)
     */
    performPrestige(gameData) {
        const pointsEarned = this.calculatePrestigePoints(gameData);
        
        this.prestigeLevel++;
        this.prestigePoints += pointsEarned;
        this.prestigePointsEarned += pointsEarned;
        
        // Emit prestige event
        this.scene.events.emit('prestige_complete', {
            prestigeLevel: this.prestigeLevel,
            pointsEarned: pointsEarned,
            totalPoints: this.prestigePoints
        });
        
        Logger.info('PrestigeManager', `Prestige ${this.prestigeLevel} complete! Earned ${pointsEarned} prestige points.`);
        
        return {
            success: true,
            prestigeLevel: this.prestigeLevel,
            pointsEarned: pointsEarned,
            totalPoints: this.prestigePoints
        };
    }

    /**
     * Purchase a permanent prestige upgrade
     * @param {string} upgradeId - ID of upgrade to purchase
     * @returns {boolean} - True if purchased successfully
     */
    purchaseUpgrade(upgradeId) {
        const upgrade = this.getUpgrade(upgradeId);
        if (!upgrade) {
            Logger.error('PrestigeManager', `Upgrade not found: ${upgradeId}`);
            return false;
        }
        
        if (this.purchasedUpgrades.has(upgradeId)) {
            Logger.warn('PrestigeManager', `Upgrade already purchased: ${upgradeId}`);
            return false;
        }
        
        if (this.prestigePoints < upgrade.cost) {
            Logger.warn('PrestigeManager', `Not enough prestige points. Need ${upgrade.cost}, have ${this.prestigePoints}`);
            return false;
        }
        
        this.prestigePoints -= upgrade.cost;
        this.purchasedUpgrades.add(upgradeId);
        
        // Emit upgrade purchased event
        this.scene.events.emit('prestige_upgrade_purchased', {
            upgradeId: upgradeId,
            upgrade: upgrade
        });
        
        Logger.info('PrestigeManager', `Purchased upgrade: ${upgrade.name}`);
        return true;
    }

    /**
     * Get details for a specific prestige upgrade
     * @param {string} upgradeId - ID of upgrade
     * @returns {Object|null} - Upgrade data or null
     */
    getUpgrade(upgradeId) {
        if (!this.prestigeConfig || !this.prestigeConfig.upgrades) return null;
        return this.prestigeConfig.upgrades.find(u => u.id === upgradeId) || null;
    }

    /**
     * Get list of upgrades available for purchase
     * @returns {Array<Object>} - List of available upgrades
     */
    getAvailableUpgrades() {
        if (!this.prestigeConfig || !this.prestigeConfig.upgrades) return [];
        return this.prestigeConfig.upgrades.filter(u => !this.purchasedUpgrades.has(u.id));
    }

    /**
     * Get list of already purchased upgrades
     * @returns {Array<Object>} - List of purchased upgrades
     */
    getPurchasedUpgrades() {
        if (!this.prestigeConfig || !this.prestigeConfig.upgrades) return [];
        return this.prestigeConfig.upgrades.filter(u => this.purchasedUpgrades.has(u.id));
    }

    /**
     * Calculate stat bonuses from prestige upgrades
     * @param {string} stat - Stat name (attack, defense, etc.)
     * @returns {number} - Bonus multiplier (e.g., 0.1 for +10%)
     */
    getStatBonus(stat) {
        let bonus = 0;
        
        this.getPurchasedUpgrades().forEach(upgrade => {
            if (upgrade.type === 'stat_multiplier' && upgrade.stat === stat) {
                bonus += upgrade.value || 0;
            }
        });
        
        return bonus;
    }

    /**
     * Get gold multiplier from prestige upgrades
     * @returns {number} - Gold multiplier bonus
     */
    getGoldMultiplier() {
        let multiplier = 1.0;
        
        this.getPurchasedUpgrades().forEach(upgrade => {
            if (upgrade.type === 'gold_multiplier') {
                multiplier += upgrade.value || 0;
            }
        });
        
        return multiplier;
    }

    /**
     * Get experience multiplier from prestige upgrades
     * @returns {number} - Experience multiplier bonus
     */
    getExperienceMultiplier() {
        let multiplier = 1.0;

        this.getPurchasedUpgrades().forEach(upgrade => {
            if (upgrade.type === 'xp_multiplier') {
                multiplier += upgrade.value || 0;
            }
        });

        return multiplier;
    }

    /**
     * Get prestige efficiency multiplier from prestige upgrades
     * @returns {number} - Prestige points multiplier bonus
     */
    getPrestigeMultiplier() {
        let multiplier = 0; // Start at 0, additive bonuses

        this.getPurchasedUpgrades().forEach(upgrade => {
            if (upgrade.type === 'prestige_multiplier') {
                multiplier += upgrade.value || 0;
            }
        });

        return multiplier;
    }

    /**
     * Get item quality bonus from prestige upgrades (Phase 6: Prestige Gear Integration)
     * @returns {number} - Quality chance bonus per prestige level
     */
    getItemQualityBonus() {
        let bonus = 0;

        this.getPurchasedUpgrades().forEach(upgrade => {
            if (upgrade.type === 'item_quality_bonus') {
                bonus += upgrade.value || 0;
            }
        });

        return bonus * this.prestigeLevel;
    }

    /**
     * Get item level boost from prestige upgrades (Phase 6: Prestige Gear Integration)
     * @returns {number} - Item level boost per prestige level
     */
    getItemLevelBoost() {
        let boost = 0;

        this.getPurchasedUpgrades().forEach(upgrade => {
            if (upgrade.type === 'item_level_boost') {
                boost += upgrade.value || 0;
            }
        });

        return boost * this.prestigeLevel;
    }

    /**
     * Get gear effectiveness multiplier from prestige upgrades (Phase 6: Prestige Gear Integration)
     * @returns {number} - Gear stat effectiveness multiplier
     */
    getGearEffectiveness() {
        let multiplier = 1.0;

        this.getPurchasedUpgrades().forEach(upgrade => {
            if (upgrade.type === 'gear_effectiveness') {
                multiplier += upgrade.value || 0;
            }
        });

        return multiplier;
    }

    /**
     * Get talent cost reduction from prestige upgrades (Phase 6: Prestige Talent Integration)
     * @returns {number} - Talent point cost reduction (0.1 = 10% reduction)
     */
    getTalentCostReduction() {
        let reduction = 0;

        this.getPurchasedUpgrades().forEach(upgrade => {
            if (upgrade.type === 'talent_cost_reduction') {
                reduction += upgrade.value || 0;
            }
        });

        return reduction;
    }

    /**
     * Get prestige talent points from prestige upgrades (Phase 6: Prestige Talent Integration)
     * @returns {number} - Additional talent points from prestige
     */
    getPrestigeTalentPoints() {
        let points = 0;

        this.getPurchasedUpgrades().forEach(upgrade => {
            if (upgrade.type === 'prestige_talent_points') {
                points += (upgrade.value || 0) * this.prestigeLevel;
            }
        });

        return points;
    }

    /**
     * Get combat bonus from prestige upgrades (Phase 6: Prestige Talent Integration)
     * @returns {number} - Combat damage/healing multiplier
     */
    getCombatBonus() {
        let multiplier = 1.0;

        this.getPurchasedUpgrades().forEach(upgrade => {
            if (upgrade.type === 'combat_bonus') {
                multiplier += upgrade.value || 0;
            }
        });

        return multiplier;
    }

    /**
     * Load prestige data from save
     * @param {Object} prestigeData - Prestige data from save
     */
    loadPrestige(prestigeData) {
        if (!prestigeData) return;
        
        this.prestigeLevel = prestigeData.prestigeLevel || 0;
        this.prestigePoints = prestigeData.prestigePoints || 0;
        this.prestigePointsEarned = prestigeData.prestigePointsEarned || 0;
        
        if (prestigeData.purchasedUpgrades) {
            this.purchasedUpgrades = new Set(prestigeData.purchasedUpgrades);
        }
    }

    /**
     * Get prestige data for saving
     * @returns {Object} - Prestige data ready for save
     */
    getSaveData() {
        return {
            prestigeLevel: this.prestigeLevel,
            prestigePoints: this.prestigePoints,
            prestigePointsEarned: this.prestigePointsEarned,
            purchasedUpgrades: Array.from(this.purchasedUpgrades)
        };
    }

    /**
     * Get current prestige state
     * @returns {Object} - Current prestige state
     */
    getState() {
        return {
            prestigeLevel: this.prestigeLevel,
            prestigePoints: this.prestigePoints,
            prestigePointsEarned: this.prestigePointsEarned,
            availableUpgrades: this.getAvailableUpgrades(),
            purchasedUpgrades: this.getPurchasedUpgrades()
        };
    }
}

