/**
 * Animation Configuration System
 * Centralized configuration for all animation settings
 */

// Default configuration - can be overridden by JSON config
const DEFAULT_CONFIG = {
    frameCounts: {
        walk: 16,
        run: 16,
        idle: 12,
        attack: 12,
        defend: 12,
        heal: 12,
        death: 10,
        dodge: 12,
        strafing: 16,
        backpedaling: 16
    },
    frameRates: {
        walk: 14,
        run: 16,
        idle: 10,
        attack: 14,
        defend: 12,
        heal: 12,
        death: 10,
        dodge: 16,
        strafing: 14,
        backpedaling: 14
    },
    defaultFrameCount: 12,
    defaultFrameRate: 12,
    frameDimensions: {
        width: 40,
        height: 60
    },
    textureSettings: {
        baseWidth: 192,
        baseHeight: 192,
        waitTimeout: 2000,
        pollInterval: 50,
        maxRetries: 15,
        retryDelay: 64
    },
    animationDefaults: {
        loop: true,
        forceRestart: false,
        useSharedPool: true
    },
    performance: {
        enableMetrics: true,
        enableCaching: true,
        cleanupUnusedAfter: 300000, // 5 minutes
        minUsageCountToKeep: 0
    }
};

let loadedConfig = null;

/**
 * Load animation configuration from JSON file
 * @param {Phaser.Scene} scene - Phaser scene instance
 * @returns {Promise<Object>} Configuration object
 */
export async function loadAnimationConfig(scene) {
    if (loadedConfig) {
        return loadedConfig;
    }

    try {
        // Try to load from JSON file
        if (scene && scene.cache && scene.cache.json.exists('animation-config')) {
            const jsonConfig = scene.cache.json.get('animation-config');
            loadedConfig = { ...DEFAULT_CONFIG, ...jsonConfig };
        } else {
            // Fall back to default config
            loadedConfig = { ...DEFAULT_CONFIG };
        }
    } catch (error) {
        console.warn('[AnimationConfig] Failed to load JSON config, using defaults:', error);
        loadedConfig = { ...DEFAULT_CONFIG };
    }

    return loadedConfig;
}

/**
 * Get animation configuration (loads if not already loaded)
 * @param {Phaser.Scene} scene - Phaser scene instance
 * @returns {Object} Configuration object
 */
export function getAnimationConfig(scene) {
    if (!loadedConfig && scene) {
        // Synchronous fallback - use defaults if not loaded yet
        return DEFAULT_CONFIG;
    }
    return loadedConfig || DEFAULT_CONFIG;
}

/**
 * Get frame count for an animation type
 * @param {string} animationName - Animation name
 * @param {Phaser.Scene} scene - Phaser scene instance
 * @returns {number} Frame count
 */
export function getFrameCount(animationName, scene = null) {
    const config = getAnimationConfig(scene);
    return config.frameCounts[animationName] || config.defaultFrameCount;
}

/**
 * Get frame rate for an animation type
 * @param {string} animationName - Animation name
 * @param {Phaser.Scene} scene - Phaser scene instance
 * @param {number} defaultFrameRate - Default frame rate if not specified
 * @returns {number} Frame rate in fps
 */
export function getFrameRate(animationName, scene = null, defaultFrameRate = null) {
    const config = getAnimationConfig(scene);
    const rate = config.frameRates[animationName];
    return rate !== undefined ? rate : (defaultFrameRate !== null ? defaultFrameRate : config.defaultFrameRate);
}

/**
 * Get frame dimensions
 * @param {Phaser.Scene} scene - Phaser scene instance
 * @returns {{width: number, height: number}} Frame dimensions
 */
export function getFrameDimensions(scene = null) {
    const config = getAnimationConfig(scene);
    return config.frameDimensions;
}

/**
 * Get texture settings
 * @param {Phaser.Scene} scene - Phaser scene instance
 * @returns {Object} Texture settings
 */
export function getTextureSettings(scene = null) {
    const config = getAnimationConfig(scene);
    return config.textureSettings;
}

/**
 * Get animation defaults
 * @param {Phaser.Scene} scene - Phaser scene instance
 * @returns {Object} Animation defaults
 */
export function getAnimationDefaults(scene = null) {
    const config = getAnimationConfig(scene);
    return config.animationDefaults;
}

/**
 * Get performance settings
 * @param {Phaser.Scene} scene - Phaser scene instance
 * @returns {Object} Performance settings
 */
export function getPerformanceSettings(scene = null) {
    const config = getAnimationConfig(scene);
    return config.performance;
}

/**
 * Reset configuration (useful for testing or hot-reload)
 */
export function resetConfig() {
    loadedConfig = null;
}

/**
 * Update configuration at runtime
 * @param {Object} updates - Partial configuration to merge
 */
export function updateConfig(updates) {
    if (!loadedConfig) {
        loadedConfig = { ...DEFAULT_CONFIG };
    }
    loadedConfig = { ...loadedConfig, ...updates };
}

export const AnimationConfig = {
    load: loadAnimationConfig,
    get: getAnimationConfig,
    getFrameCount,
    getFrameRate,
    getFrameDimensions,
    getTextureSettings,
    getAnimationDefaults,
    getPerformanceSettings,
    reset: resetConfig,
    update: updateConfig
};

