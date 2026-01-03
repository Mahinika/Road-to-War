import { Logger } from '../../utils/logger.js';

/**
 * Threat System - Handles threat/aggro management
 * Manages threat generation, target selection, and threat decay
 */
export class ThreatSystem {
    constructor(scene, config = {}) {
        this.scene = scene;
        this.partyManager = config.partyManager || null;

        // Threat table: Map<enemyId, Map<heroId, threat>>
        this.threatTable = new Map();

        // Threat decay settings
        this.threatDecayRate = 0.95; // 5% decay per second
        this.threatDecayInterval = 1000; // Decay every second
        this.lastDecayTime = 0;
    }

    /**
     * Initialize threat table for an enemy
     * @param {Object} enemy - Enemy object
     */
    initializeEnemyThreat(enemy) {
        if (!enemy?.data?.id) {
            Logger.warn('ThreatSystem', 'Cannot initialize threat: invalid enemy');
            return;
        }

        const enemyId = enemy.data.id;

        if (!this.threatTable.has(enemyId)) {
            this.threatTable.set(enemyId, new Map());
        }

        // Initialize threat for all heroes
        if (this.partyManager) {
            const heroes = this.partyManager.getHeroes();
            heroes.forEach(hero => {
                if (hero?.id) {
                    this.threatTable.get(enemyId).set(hero.id, 0);
                }
            });
        }

        Logger.debug('ThreatSystem', `Initialized threat table for enemy ${enemyId}`);
    }

    /**
     * Get threat level for a hero against an enemy
     * @param {string} enemyId - Enemy ID
     * @param {string} heroId - Hero ID
     * @returns {number} Threat level
     */
    getThreat(enemyId, heroId) {
        if (!this.threatTable.has(enemyId)) {
            this.threatTable.set(enemyId, new Map());
        }
        return this.threatTable.get(enemyId).get(heroId) || 0;
    }

    /**
     * Add threat for a hero
     * @param {string} enemyId - Enemy ID
     * @param {string} heroId - Hero ID
     * @param {number} amount - Threat amount to add
     */
    addThreat(enemyId, heroId, amount) {
        if (!this.threatTable.has(enemyId)) {
            this.threatTable.set(enemyId, new Map());
        }

        const currentThreat = this.threatTable.get(enemyId).get(heroId) || 0;
        const newThreat = Math.max(0, currentThreat + amount);
        this.threatTable.get(enemyId).set(heroId, newThreat);

        Logger.debug('ThreatSystem', `Added ${amount} threat for hero ${heroId} vs enemy ${enemyId} (total: ${newThreat})`);
    }

    /**
     * Set threat for a hero (absolute value)
     * @param {string} enemyId - Enemy ID
     * @param {string} heroId - Hero ID
     * @param {number} amount - Threat amount to set
     */
    setThreat(enemyId, heroId, amount) {
        if (!this.threatTable.has(enemyId)) {
            this.threatTable.set(enemyId, new Map());
        }

        this.threatTable.get(enemyId).set(heroId, Math.max(0, amount));
    }

    /**
     * Get hero with highest threat for an enemy
     * @param {string} enemyId - Enemy ID
     * @returns {Object|null} Hero with highest threat or null
     */
    getHighestThreatHero(enemyId) {
        if (!this.threatTable.has(enemyId) || !this.partyManager) {
            return null;
        }

        const threatMap = this.threatTable.get(enemyId);
        let maxThreat = -1;
        let highestThreatHeroId = null;

        for (const [heroId, threat] of threatMap.entries()) {
            if (threat > maxThreat) {
                maxThreat = threat;
                highestThreatHeroId = heroId;
            }
        }

        if (highestThreatHeroId) {
            return this.partyManager.getHeroById(highestThreatHeroId);
        }

        return null;
    }

    /**
     * Get all threat levels for an enemy
     * @param {string} enemyId - Enemy ID
     * @returns {Map} Map of heroId -> threat
     */
    getAllThreats(enemyId) {
        if (!this.threatTable.has(enemyId)) {
            return new Map();
        }
        return new Map(this.threatTable.get(enemyId));
    }

    /**
     * Apply threat decay (called periodically)
     * @param {number} currentTime - Current time
     */
    updateThreatDecay(currentTime) {
        if (currentTime - this.lastDecayTime < this.threatDecayInterval) {
            return;
        }

        this.lastDecayTime = currentTime;

        for (const [enemyId, threatMap] of this.threatTable.entries()) {
            for (const [heroId, threat] of threatMap.entries()) {
                const decayedThreat = Math.floor(threat * this.threatDecayRate);
                threatMap.set(heroId, decayedThreat);
            }
        }
    }

    /**
     * Clear threat table for an enemy
     * @param {string} enemyId - Enemy ID
     */
    clearEnemyThreat(enemyId) {
        this.threatTable.delete(enemyId);
    }

    /**
     * Reduce threat for a hero
     * @param {string} enemyId - Enemy ID
     * @param {string} heroId - Hero ID
     * @param {number} amount - Amount to reduce
     * @param {boolean} isPercentage - If true, amount is a percentage (0-1)
     */
    reduceThreat(enemyId, heroId, amount = 0, isPercentage = false) {
        if (!this.threatTable.has(enemyId)) {
            return;
        }

        const currentThreat = this.getThreat(enemyId, heroId);
        if (currentThreat <= 0) {
            return;
        }

        let newThreat;
        if (isPercentage) {
            newThreat = Math.floor(currentThreat * (1 - amount));
        } else {
            newThreat = Math.max(0, currentThreat - amount);
        }

        this.setThreat(enemyId, heroId, newThreat);
    }

    /**
     * Clear all threat tables
     */
    clearAllThreats() {
        this.threatTable.clear();
    }
}

