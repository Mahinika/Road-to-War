import { Logger } from '../utils/logger.js';
import { AssetLoader } from '../utils/asset-loader.js';

/**
 * Base Manager - Standard interface for all managers
 * Provides consistent lifecycle hooks, dependency declaration, and state management
 */
export class BaseManager {
    /**
     * Create a new BaseManager
     * @param {Phaser.Scene} scene - Phaser scene instance
     * @param {Object} config - Configuration object (may contain dependencies)
     */
    constructor(scene, config = {}) {
        this.scene = scene;
        this.config = config;
        this.initialized = false;
        this._state = {};
        this._assetLoader = null; // Lazy initialization
    }

    /**
     * Get asset loader instance (lazy initialization)
     * @returns {AssetLoader|null} Asset loader or null if scene not available
     */
    getAssetLoader() {
        if (!this._assetLoader && this.scene) {
            // Try to get from registry first (set by PreloadScene)
            this._assetLoader = this.scene.registry.get('assetLoader');
            
            // If not in registry, create new instance
            if (!this._assetLoader) {
                this._assetLoader = new AssetLoader(this.scene);
            }
        }
        return this._assetLoader;
    }

    /**
     * Load a single asset
     * @param {string} key - Asset key
     * @param {string} type - Asset type ('image', 'json', 'audio')
     * @param {string} path - Asset path
     * @param {number} priority - Loading priority (0 = critical, 3 = low)
     * @returns {Promise<*>} Promise that resolves with the asset
     */
    async loadAsset(key, type, path, priority = 2) {
        const loader = this.getAssetLoader();
        if (loader) {
            return loader.loadAsset(key, type, path, priority);
        }
        
        // Fallback to direct Phaser loading if loader not available
        Logger.warn(this.constructor.name, 'AssetLoader not available, using direct loading');
        if (this.scene && this.scene.load) {
            switch (type) {
                case 'json':
                    this.scene.load.json(key, path);
                    break;
                case 'image':
                    this.scene.load.image(key, path);
                    break;
                case 'audio':
                    this.scene.load.audio(key, path);
                    break;
            }
            this.scene.load.start();
        }
        return null;
    }

    /**
     * Get asset from cache
     * @param {string} key - Asset key
     * @returns {*} Asset or null
     */
    getAsset(key) {
        const loader = this.getAssetLoader();
        if (loader) {
            return loader.getAsset(key);
        }
        
        // Fallback to Phaser cache
        if (this.scene && this.scene.cache) {
            if (this.scene.cache.json.exists(key)) {
                return this.scene.cache.json.get(key);
            }
            if (this.scene.textures && this.scene.textures.exists(key)) {
                return key;
            }
        }
        return null;
    }

    /**
     * Get manager dependencies
     * Override in subclasses to declare dependencies
     * @returns {string[]} Array of dependency names
     */
    static getDependencies() {
        return [];
    }

    /**
     * Initialize the manager
     * Override in subclasses for manager-specific initialization
     * @returns {Promise<void>|void} Can return a promise for async initialization
     */
    async init() {
        this.initialized = true;
        Logger.info(this.constructor.name, 'Initialized');
    }

    /**
     * Update loop (optional)
     * Override in subclasses if manager needs per-frame updates
     * @param {number} time - Current time
     * @param {number} delta - Time delta since last update
     */
    update(time, delta) {
        // Override in subclasses if needed
    }

    /**
     * Get manager state for debugging/testing
     * Override in subclasses to provide state information
     * @returns {Object} State object
     */
    getState() {
        return {
            initialized: this.initialized,
            ...this._state
        };
    }

    /**
     * Cleanup and destroy the manager
     * Override in subclasses for manager-specific cleanup
     */
    destroy() {
        this.initialized = false;
        this._state = {};
        this._assetLoader = null;
        Logger.info(this.constructor.name, 'Destroyed');
    }
}

