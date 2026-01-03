/**
 * Party State Manager - Standardized party data management across scenes
 * Ensures consistent storage, retrieval, and validation of party state
 */

import { SafeExecutor } from './error-handling.js';
import { Logger } from './logger.js';
import { PartyManager } from '../managers/party-manager.js';

export class PartyStateManager {
    /**
     * Create a new PartyStateManager
     * @param {Phaser.Scene} scene - The Phaser scene
     */
    constructor(scene) {
        this.scene = scene;
        this.partyManager = null;
        this.isInitialized = false;
    }

    /**
     * Initialize party state from various sources with priority order
     * Priority: partyManager (live) > registry partyManager > partyData > saved game data
     * @returns {boolean} True if party state was successfully initialized
     */
    initialize() {
        if (this.isInitialized) return true;

        return SafeExecutor.execute(() => {
            // 1. Try to get existing partyManager from registry (highest priority)
            let partyManager = this.getPartyManagerFromRegistry();
            if (partyManager && this.validatePartyManager(partyManager)) {
                this.partyManager = partyManager;
                Logger.info('PartyStateManager', 'Loaded existing partyManager from registry');
                this.isInitialized = true;
                return true;
            }

            // 2. Try to get partyManager from scene settings
            partyManager = this.getPartyManagerFromSceneSettings();
            if (partyManager && this.validatePartyManager(partyManager)) {
                this.partyManager = partyManager;
                this.storePartyManagerInRegistry(partyManager);
                Logger.info('PartyStateManager', 'Loaded partyManager from scene settings');
                this.isInitialized = true;
                return true;
            }

            // 3. Try to restore from partyData
            const partyData = this.getPartyDataFromRegistry();
            if (partyData && this.validatePartyData(partyData)) {
                const statCalculator = this.scene.statCalculator;
                this.partyManager = this.createPartyManagerFromData(partyData, statCalculator);
                Logger.info('PartyStateManager', 'Restored party from partyData');
                this.isInitialized = true;
                return true;
            }

            // 4. Try to restore from saved game data
            const savedGameData = this.getPartyDataFromSavedGame();
            if (savedGameData && this.validatePartyData(savedGameData)) {
                const statCalculator = this.scene.statCalculator;
                this.partyManager = this.createPartyManagerFromData(savedGameData, statCalculator);
                Logger.info('PartyStateManager', 'Restored party from saved game');
                this.isInitialized = true;
                return true;
            }

            Logger.warn('PartyStateManager', 'No valid party data found');
            return false;
        }, false, 'PartyStateManager.initialize');
    }

    /**
     * Get party manager from scene registry
     * @returns {Object|null} Party manager or null
     */
    getPartyManagerFromRegistry() {
        return SafeExecutor.execute(() => {
            return this.scene.registry.get('partyManager') || null;
        }, null, 'PartyStateManager.getPartyManagerFromRegistry');
    }

    /**
     * Get party manager from scene settings (scene launch data)
     * @returns {Object|null} Party manager or null
     */
    getPartyManagerFromSceneSettings() {
        return SafeExecutor.execute(() => {
            return this.scene.sys?.settings?.data?.partyManager || null;
        }, null, 'PartyStateManager.getPartyManagerFromSceneSettings');
    }

    /**
     * Get party data from registry
     * @returns {Object|null} Party data or null
     */
    getPartyDataFromRegistry() {
        return SafeExecutor.execute(() => {
            // Try scene registry first, then game registry
            return this.scene.registry.get('partyData') ||
                   this.scene.game?.registry?.get('partyData') || null;
        }, null, 'PartyStateManager.getPartyDataFromRegistry');
    }

    /**
     * Get party data from saved game
     * @returns {Object|null} Party data from save or null
     */
    getPartyDataFromSavedGame() {
        return SafeExecutor.execute(() => {
            // This would typically integrate with the save system
            // For now, return null as this should be handled by the save system
            return null;
        }, null, 'PartyStateManager.getPartyDataFromSavedGame');
    }

    /**
     * Validate party manager structure
     * @param {Object} partyManager - Party manager to validate
     * @returns {boolean} True if valid
     */
    validatePartyManager(partyManager) {
        return SafeExecutor.execute(() => {
            if (!partyManager || typeof partyManager !== 'object') return false;
            if (!Array.isArray(partyManager.heroes)) return false;
            if (partyManager.heroes.length !== 5) return false;
            return partyManager.heroes.every(hero => hero && typeof hero === 'object' && hero.id);
        }, false, 'PartyStateManager.validatePartyManager');
    }

    /**
     * Validate party data structure
     * @param {Object} partyData - Party data to validate
     * @returns {boolean} True if valid
     */
    validatePartyData(partyData) {
        return SafeExecutor.execute(() => {
            if (!partyData || typeof partyData !== 'object') return false;
            if (!Array.isArray(partyData.heroes)) return false;
            if (partyData.heroes.length === 0) return false;
            return partyData.heroes.every(hero => hero && typeof hero === 'object' && hero.id);
        }, false, 'PartyStateManager.validatePartyData');
    }

    /**
     * Create party manager from party data
     * @param {Object} partyData - Party data
     * @returns {Object} Party manager instance
     */
    createPartyManagerFromData(partyData, statCalculator = null) {
        return SafeExecutor.execute(() => {
            const partyManager = new PartyManager(this.scene);
            partyManager.loadData(partyData, statCalculator);
            return partyManager;
        }, null, 'PartyStateManager.createPartyManagerFromData');
    }

    /**
     * Store party manager in registry
     * @param {Object} partyManager - Party manager to store
     */
    storePartyManagerInRegistry(partyManager) {
        SafeExecutor.execute(() => {
            if (partyManager) {
                this.scene.registry.set('partyManager', partyManager);
            }
        }, null, 'PartyStateManager.storePartyManagerInRegistry');
    }

    /**
     * Store party data in registry
     * @param {Object} partyData - Party data to store
     */
    storePartyDataInRegistry(partyData) {
        SafeExecutor.execute(() => {
            if (partyData) {
                this.scene.registry.set('partyData', partyData);
                // Also store in game registry for cross-scene access
                if (this.scene.game?.registry) {
                    this.scene.game.registry.set('partyData', partyData);
                }
            }
        }, null, 'PartyStateManager.storePartyDataInRegistry');
    }

    /**
     * Save current party state to registry
     */
    savePartyState() {
        SafeExecutor.execute(() => {
            if (this.partyManager) {
                const partyData = this.partyManager.getSaveData();
                this.storePartyDataInRegistry(partyData);
                Logger.info('PartyStateManager', 'Party state saved to registry');
            }
        }, null, 'PartyStateManager.savePartyState');
    }

    /**
     * Get the current party manager
     * @returns {Object|null} Party manager or null
     */
    getPartyManager() {
        return this.partyManager;
    }

    /**
     * Get party data for saving
     * @returns {Object|null} Party data or null
     */
    getPartyData() {
        return SafeExecutor.execute(() => {
            return this.partyManager?.getSaveData() || null;
        }, null, 'PartyStateManager.getPartyData');
    }

    /**
     * Check if party state is valid
     * @returns {boolean} True if party state is valid
     */
    isValid() {
        return this.isInitialized && this.validatePartyManager(this.partyManager);
    }

    /**
     * Clear party state (for scene transitions)
     */
    clear() {
        SafeExecutor.execute(() => {
            this.partyManager = null;
            this.isInitialized = false;
            Logger.info('PartyStateManager', 'Party state cleared');
        }, null, 'PartyStateManager.clear');
    }

    /**
     * Destroy and cleanup
     */
    destroy() {
        this.clear();
        this.scene = null;
    }
}

// Export singleton factory function to avoid import issues
let partyStateManagerInstance = null;

export function getPartyStateManager(scene) {
    if (!partyStateManagerInstance || partyStateManagerInstance.scene !== scene) {
        partyStateManagerInstance = new PartyStateManager(scene);
    }
    return partyStateManagerInstance;
}
