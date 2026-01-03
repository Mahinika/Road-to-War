import { Logger } from '../utils/logger.js';

/**
 * Data Service - Centralized data access with caching and validation
 * Provides type-safe getters for all game data files
 */
export class DataService {
    constructor(scene) {
        this.scene = scene;
        this.cache = new Map();
        this._initialized = false;
    }

    /**
     * Initialize the data service
     * Preloads and caches all data files
     */
    async init() {
        if (this._initialized) {
            return;
        }

        try {
            // Cache all data files
            this.cache.set('worldConfig', this.scene.cache.json.get('worldConfig'));
            this.cache.set('items', this.scene.cache.json.get('items'));
            this.cache.set('classes', this.scene.cache.json.get('classes'));
            this.cache.set('specializations', this.scene.cache.json.get('specializations'));
            this.cache.set('talents', this.scene.cache.json.get('talents'));
            this.cache.set('statsConfig', this.scene.cache.json.get('stats-config'));
            this.cache.set('enemies', this.scene.cache.json.get('enemies'));
            this.cache.set('achievements', this.scene.cache.json.get('achievements'));
            this.cache.set('prestigeConfig', this.scene.cache.json.get('prestigeConfig'));
            this.cache.set('abilities', this.scene.cache.json.get('abilities'));
            this.cache.set('bloodlines', this.scene.cache.json.get('bloodlines'));
            this.cache.set('skillGems', this.scene.cache.json.get('skillGems'));
            this.cache.set('animationConfig', this.scene.cache.json.get('animationConfig'));
            this.cache.set('keyframeConfigs', this.scene.cache.json.get('keyframeConfigs'));

            this._initialized = true;
            Logger.info('DataService', 'Initialized with cached data');
        } catch (error) {
            Logger.warn('DataService', 'Some data files may not be loaded:', error);
        }
    }

    /**
     * Get cached data or load from scene cache
     * @param {string} key - Data key
     * @returns {*} Cached data or null
     */
    getCached(key) {
        if (this.cache.has(key)) {
            return this.cache.get(key);
        }

        // Fallback to scene cache
        try {
            const data = this.scene.cache.json.get(key);
            if (data) {
                this.cache.set(key, data);
            }
            return data;
        } catch (error) {
            Logger.warn('DataService', `Data not found: ${key}`);
            return null;
        }
    }

    /**
     * Invalidate cache for a specific key (for hot-reload)
     * @param {string} key - Data key to invalidate
     */
    invalidate(key) {
        this.cache.delete(key);
        Logger.debug('DataService', `Cache invalidated for: ${key}`);
    }

    /**
     * Clear all cache
     */
    clearCache() {
        this.cache.clear();
        Logger.debug('DataService', 'Cache cleared');
    }

    // Type-safe getters for all data files
    getWorldConfig() {
        return this.getCached('worldConfig');
    }

    getItems() {
        return this.getCached('items');
    }

    getClasses() {
        return this.getCached('classes');
    }

    getSpecializations() {
        return this.getCached('specializations');
    }

    getTalents() {
        return this.getCached('talents');
    }

    getStatsConfig() {
        return this.getCached('statsConfig');
    }

    getEnemies() {
        return this.getCached('enemies');
    }

    getAchievements() {
        return this.getCached('achievements');
    }

    getPrestigeConfig() {
        return this.getCached('prestigeConfig');
    }

    getAbilities() {
        return this.getCached('abilities');
    }

    getBloodlines() {
        return this.getCached('bloodlines');
    }

    getSkillGems() {
        return this.getCached('skillGems');
    }

    getAnimationConfig() {
        return this.getCached('animationConfig');
    }

    getKeyframeConfigs() {
        return this.getCached('keyframeConfigs');
    }
}

