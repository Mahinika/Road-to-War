/**
 * Animation Hot-Reload Manager
 * Watches config files and regenerates animations on changes
 */

import { Logger } from '../utils/logger.js';
import { resetConfig, updateConfig } from '../config/animation-config.js';
import { resetKeyframeConfigs } from '../config/keyframe-generator.js';

export class AnimationHotReload {
    constructor(scene, animationManager) {
        this.scene = scene;
        this.animationManager = animationManager;
        this.enabled = false;
        this.watchers = new Map();
        this.reloadQueue = [];
        this.reloading = false;
    }

    /**
     * Enable hot-reload
     */
    enable() {
        if (this.enabled) {
            return;
        }

        this.enabled = true;
        Logger.info('AnimationHotReload', 'Hot-reload enabled');

        // Watch for config file changes via polling (since we're in browser/Electron)
        this.startPolling();
    }

    /**
     * Disable hot-reload
     */
    disable() {
        if (!this.enabled) {
            return;
        }

        this.enabled = false;
        this.stopPolling();
        Logger.info('AnimationHotReload', 'Hot-reload disabled');
    }

    /**
     * Start polling for config changes
     */
    startPolling() {
        if (this.pollInterval) {
            return;
        }

        // Poll every 1 second for config changes
        this.pollInterval = setInterval(() => {
            this.checkForChanges();
        }, 1000);
    }

    /**
     * Stop polling
     */
    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    /**
     * Check for config file changes
     */
    async checkForChanges() {
        if (this.reloading) {
            return;
        }

        try {
            // Check if animation config changed
            if (this.scene.cache && this.scene.cache.json.exists('animation-config')) {
                const currentConfig = this.scene.cache.json.get('animation-config');
                const lastConfig = this.lastAnimationConfig;

                if (!lastConfig || JSON.stringify(currentConfig) !== JSON.stringify(lastConfig)) {
                    this.lastAnimationConfig = JSON.parse(JSON.stringify(currentConfig));
                    await this.reloadAnimationConfig();
                }
            }

            // Check if keyframe config changed
            if (this.scene.cache && this.scene.cache.json.exists('keyframe-configs')) {
                const currentConfig = this.scene.cache.json.get('keyframe-configs');
                const lastConfig = this.lastKeyframeConfig;

                if (!lastConfig || JSON.stringify(currentConfig) !== JSON.stringify(lastConfig)) {
                    this.lastKeyframeConfig = JSON.parse(JSON.stringify(currentConfig));
                    await this.reloadKeyframeConfig();
                }
            }
        } catch (error) {
            Logger.warn('AnimationHotReload', `Error checking for changes: ${error.message}`);
        }
    }

    /**
     * Reload animation configuration
     */
    async reloadAnimationConfig() {
        Logger.info('AnimationHotReload', 'Animation config changed, reloading...');
        
        // Reset config to force reload
        resetConfig();
        
        // Update config with new values
        if (this.scene.cache && this.scene.cache.json.exists('animation-config')) {
            const newConfig = this.scene.cache.json.get('animation-config');
            updateConfig(newConfig);
        }

        // Notify listeners
        this.notifyConfigChanged('animation-config');
    }

    /**
     * Reload keyframe configuration
     */
    async reloadKeyframeConfig() {
        Logger.info('AnimationHotReload', 'Keyframe config changed, reloading...');
        
        // Reset keyframe configs
        resetKeyframeConfigs();
        
        // Queue regeneration of affected animations
        await this.queueAnimationRegeneration();
        
        // Notify listeners
        this.notifyConfigChanged('keyframe-configs');
    }

    /**
     * Queue animation regeneration for all active animations
     */
    async queueAnimationRegeneration() {
        if (this.reloading) {
            return;
        }

        this.reloading = true;
        Logger.info('AnimationHotReload', 'Regenerating animations...');

        try {
            // Get all registered animations
            const allAnims = this.scene.anims.anims.entries;
            const characterTypes = new Set();

            // Extract character types from animation keys
            for (const key of Object.keys(allAnims)) {
                const parts = key.split('-');
                if (parts.length >= 2) {
                    characterTypes.add(parts[0]);
                }
            }

            // Regenerate animations for each character type
            for (const characterType of characterTypes) {
                try {
                    // Use a placeholder character ID for shared animations
                    const characterId = 'hot-reload';
                    const animationNames = ['idle', 'walk', 'attack', 'defend', 'heal', 'death'];

                    await this.animationManager.initializeAnimations(
                        characterType,
                        characterId,
                        animationNames,
                        {
                            forceRecreate: true,
                            useSharedPool: true
                        }
                    );

                    Logger.debug('AnimationHotReload', `Regenerated animations for ${characterType}`);
                } catch (error) {
                    Logger.error('AnimationHotReload', `Failed to regenerate animations for ${characterType}: ${error.message}`);
                }
            }

            Logger.info('AnimationHotReload', 'Animation regeneration complete');
        } catch (error) {
            Logger.error('AnimationHotReload', `Error during animation regeneration: ${error.message}`);
        } finally {
            this.reloading = false;
        }
    }

    /**
     * Register a listener for config changes
     * @param {string} configType - Config type ('animation-config' or 'keyframe-configs')
     * @param {Function} callback - Callback function
     */
    onConfigChanged(configType, callback) {
        if (!this.listeners) {
            this.listeners = new Map();
        }

        if (!this.listeners.has(configType)) {
            this.listeners.set(configType, []);
        }

        this.listeners.get(configType).push(callback);
    }

    /**
     * Notify listeners of config changes
     * @param {string} configType - Config type
     */
    notifyConfigChanged(configType) {
        if (!this.listeners || !this.listeners.has(configType)) {
            return;
        }

        const callbacks = this.listeners.get(configType);
        for (const callback of callbacks) {
            try {
                callback();
            } catch (error) {
                Logger.warn('AnimationHotReload', `Error in config change callback: ${error.message}`);
            }
        }
    }

    /**
     * Manually trigger reload
     */
    async manualReload() {
        Logger.info('AnimationHotReload', 'Manual reload triggered');
        await this.reloadKeyframeConfig();
    }
}

