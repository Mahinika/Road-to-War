import { Logger } from './logger.js';
import { ensurePlaceholderTexture, getPlaceholderKey } from './placeholder-helper.js';

/**
 * Asset Loader - Manages lazy loading and caching of game assets
 * Implements on-demand asset loading similar to Unity's Addressables pattern
 */
export class AssetLoader {
    constructor(scene) {
        this.scene = scene;
        this.cache = new Map(); // Map<key, asset>
        this.loadingQueue = new Map(); // Map<key, Promise>
        this.loadedAssets = new Set(); // Track loaded asset keys
        this.loadStats = {
            totalLoads: 0,
            cacheHits: 0,
            cacheMisses: 0,
            loadErrors: 0,
            loadTimes: []
        };
        
        // LRU cache configuration
        this.maxCacheSize = 100; // Maximum number of cached assets
        this.cacheAccessOrder = []; // Track access order for LRU eviction
        
        // Priority levels
        this.PRIORITY = {
            CRITICAL: 0,
            HIGH: 1,
            NORMAL: 2,
            LOW: 3
        };
    }

    /**
     * Load a single asset with optional priority
     * @param {string} key - Asset key
     * @param {string} type - Asset type ('image', 'json', 'audio', etc.)
     * @param {string} path - Asset path
     * @param {number} priority - Loading priority (0 = critical, 3 = low)
     * @returns {Promise<*>} Promise that resolves with the asset
     */
    async loadAsset(key, type, path, priority = this.PRIORITY.NORMAL) {
        // Check cache first
        if (this.cache.has(key)) {
            this.loadStats.cacheHits++;
            this.updateCacheAccess(key);
            return this.cache.get(key);
        }

        this.loadStats.cacheMisses++;

        // Check if already loading
        if (this.loadingQueue.has(key)) {
            return this.loadingQueue.get(key);
        }

        // Start loading
        const loadPromise = this._loadAssetInternal(key, type, path, priority);
        this.loadingQueue.set(key, loadPromise);

        try {
            const asset = await loadPromise;
            this.cache.set(key, asset);
            this.loadedAssets.add(key);
            this.updateCacheAccess(key);
            this.loadStats.totalLoads++;
            
            // Evict old assets if cache is full
            if (this.cache.size > this.maxCacheSize) {
                this.evictLRU();
            }
            
            return asset;
        } catch (error) {
            this.loadStats.loadErrors++;
            Logger.error('AssetLoader', `Failed to load asset ${key}:`, error);
            
            // Fallback to placeholder
            return this._loadPlaceholder(key, type);
        } finally {
            this.loadingQueue.delete(key);
        }
    }

    /**
     * Load multiple assets
     * @param {Array<{key: string, type: string, path: string, priority?: number}>} assets - Array of asset definitions
     * @returns {Promise<Map<string, *>>} Promise that resolves with a Map of loaded assets
     */
    async loadAssets(assets) {
        const loadPromises = assets.map(asset => 
            this.loadAsset(asset.key, asset.type, asset.path, asset.priority || this.PRIORITY.NORMAL)
                .then(result => ({ key: asset.key, result }))
        );

        const results = await Promise.all(loadPromises);
        const assetMap = new Map();
        
        results.forEach(({ key, result }) => {
            assetMap.set(key, result);
        });

        return assetMap;
    }

    /**
     * Preload assets in background (non-blocking)
     * @param {Array<{key: string, type: string, path: string}>} assets - Array of asset definitions
     * @returns {Promise<void>} Promise that resolves when all assets are preloaded
     */
    async preloadAssets(assets) {
        // Load with low priority in background
        const preloadPromises = assets.map(asset =>
            this.loadAsset(asset.key, asset.type, asset.path, this.PRIORITY.LOW)
        );

        await Promise.all(preloadPromises);
        Logger.info('AssetLoader', `Preloaded ${assets.length} assets`);
    }

    /**
     * Unload an asset from cache
     * @param {string} key - Asset key to unload
     * @returns {boolean} True if asset was unloaded
     */
    unloadAsset(key) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
            this.loadedAssets.delete(key);
            this.cacheAccessOrder = this.cacheAccessOrder.filter(k => k !== key);
            
            // Remove from Phaser cache if it's a texture
            if (this.scene && this.scene.textures && this.scene.textures.exists(key)) {
                this.scene.textures.remove(key);
            }
            
            Logger.debug('AssetLoader', `Unloaded asset: ${key}`);
            return true;
        }
        return false;
    }

    /**
     * Check if an asset is loaded
     * @param {string} key - Asset key
     * @returns {boolean} True if asset is loaded
     */
    isLoaded(key) {
        return this.loadedAssets.has(key) || (this.scene && this.scene.cache.exists(key));
    }

    /**
     * Get asset from cache (does not load if not cached)
     * @param {string} key - Asset key
     * @returns {*} Asset or null if not cached
     */
    getAsset(key) {
        if (this.cache.has(key)) {
            this.updateCacheAccess(key);
            return this.cache.get(key);
        }
        
        // Fallback to Phaser cache
        if (this.scene && this.scene.cache) {
            if (this.scene.cache.json.exists(key)) {
                return this.scene.cache.json.get(key);
            }
            if (this.scene.textures && this.scene.textures.exists(key)) {
                return key; // Return key for textures
            }
        }
        
        return null;
    }

    /**
     * Internal asset loading implementation
     * @private
     */
    async _loadAssetInternal(key, type, path, priority) {
        const startTime = performance.now();

        return new Promise((resolve, reject) => {
            if (!this.scene || !this.scene.load) {
                reject(new Error('Scene or scene.load not available'));
                return;
            }

            // Set up load completion handler
            const onComplete = () => {
                const loadTime = performance.now() - startTime;
                this.loadStats.loadTimes.push(loadTime);
                
                // Get asset from Phaser cache
                let asset = null;
                switch (type) {
                    case 'json':
                        asset = this.scene.cache.json.get(key);
                        break;
                    case 'image':
                    case 'texture':
                        asset = key; // Return key for textures
                        break;
                    case 'audio':
                        asset = this.scene.cache.audio.get(key);
                        break;
                    default:
                        asset = this.scene.cache.get(key);
                }

                if (asset) {
                    resolve(asset);
                } else {
                    reject(new Error(`Asset ${key} not found in cache after loading`));
                }
            };

            // Set up error handler
            const onError = (file) => {
                this.scene.load.off('filecomplete', onFileComplete);
                this.scene.load.off('loaderror', onLoadError);
                reject(new Error(`Failed to load ${key}: ${file.src}`));
            };

            // File-specific handlers
            const assetKey = key; // Capture key in closure
            const onFileComplete = (completedKey, type, data) => {
                if (completedKey === assetKey) {
                    this.scene.load.off('filecomplete', onFileComplete);
                    this.scene.load.off('loaderror', onLoadError);
                    onComplete();
                }
            };

            const onLoadError = (file) => {
                if (file.key === assetKey) {
                    onError(file);
                }
            };

            // Register handlers
            this.scene.load.once('filecomplete', onFileComplete);
            this.scene.load.once('loaderror', onLoadError);

            // Start loading based on type
            switch (type) {
                case 'json':
                    this.scene.load.json(key, path);
                    break;
                case 'image':
                case 'texture':
                    this.scene.load.image(key, path);
                    break;
                case 'audio':
                    this.scene.load.audio(key, path);
                    break;
                default:
                    this.scene.load.json(key, path); // Default to JSON
            }

            // Start the loader
            this.scene.load.start();
        });
    }

    /**
     * Load placeholder asset as fallback
     * @private
     */
    _loadPlaceholder(key, type) {
        if (!this.scene) {
            return null;
        }

        try {
            const placeholderKey = getPlaceholderKey(key);
            ensurePlaceholderTexture(this.scene, { key: placeholderKey, width: 64, height: 64 });
            return placeholderKey;
        } catch (error) {
            Logger.error('AssetLoader', `Failed to create placeholder for ${key}:`, error);
            return null;
        }
    }

    /**
     * Update cache access order for LRU eviction
     * @private
     */
    updateCacheAccess(key) {
        // Remove from current position
        this.cacheAccessOrder = this.cacheAccessOrder.filter(k => k !== key);
        // Add to end (most recently used)
        this.cacheAccessOrder.push(key);
    }

    /**
     * Evict least recently used asset from cache
     * @private
     */
    evictLRU() {
        if (this.cacheAccessOrder.length > 0) {
            const lruKey = this.cacheAccessOrder.shift();
            this.unloadAsset(lruKey);
            Logger.debug('AssetLoader', `Evicted LRU asset: ${lruKey}`);
        }
    }

    /**
     * Get loading statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        const avgLoadTime = this.loadStats.loadTimes.length > 0
            ? this.loadStats.loadTimes.reduce((a, b) => a + b, 0) / this.loadStats.loadTimes.length
            : 0;

        return {
            ...this.loadStats,
            cacheSize: this.cache.size,
            loadedCount: this.loadedAssets.size,
            queueSize: this.loadingQueue.size,
            averageLoadTime: avgLoadTime,
            cacheHitRate: this.loadStats.totalLoads > 0
                ? (this.loadStats.cacheHits / (this.loadStats.cacheHits + this.loadStats.cacheMisses)) * 100
                : 0
        };
    }

    /**
     * Clear all cached assets
     */
    clearCache() {
        const keys = Array.from(this.cache.keys());
        keys.forEach(key => this.unloadAsset(key));
        this.cache.clear();
        this.loadedAssets.clear();
        this.cacheAccessOrder = [];
        Logger.info('AssetLoader', 'Cache cleared');
    }

    /**
     * Cleanup and destroy the asset loader
     */
    destroy() {
        this.clearCache();
        this.loadingQueue.clear();
        this.scene = null;
    }
}

