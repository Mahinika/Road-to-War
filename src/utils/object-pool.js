/**
 * Object Pooling System for UI Elements
 * Provides efficient reuse of frequently created/destroyed Phaser objects
 */

export class ObjectPool {
    /**
     * Create a new ObjectPool
     * @param {Function} createFunction - Function to create new objects
     * @param {Function} resetFunction - Function to reset objects when returned to pool
     * @param {number} initialSize - Initial pool size
     * @param {number} maxSize - Maximum pool size (0 = unlimited)
     */
    constructor(createFunction, resetFunction = null, initialSize = 10, maxSize = 100) {
        this.createFunction = createFunction;
        this.resetFunction = resetFunction || ((obj) => obj);
        this.maxSize = maxSize;
        this.pool = [];
        this.activeCount = 0;

        // Pre-populate the pool
        this.expand(initialSize);
    }

    /**
     * Expand the pool by creating new objects
     * @param {number} count - Number of objects to create
     */
    expand(count) {
        for (let i = 0; i < count; i++) {
            if (this.maxSize > 0 && this.pool.length >= this.maxSize) break;
            const obj = this.createFunction();
            obj._poolIndex = this.pool.length;
            obj._isPooled = true;
            this.pool.push(obj);
        }
    }

    /**
     * Get an object from the pool
     * @returns {Object|null} Pooled object or null if creation failed
     */
    get() {
        let obj;

        if (this.pool.length > 0) {
            obj = this.pool.pop();
        } else {
            // Pool is empty, create new object
            obj = this.createFunction();
            if (!obj) {
                // Creation failed (scene not ready, etc.)
                return null;
            }
            obj._poolIndex = -1; // Mark as dynamically created
        }

        obj._isPooled = false;
        this.activeCount++;
        return obj;
    }

    /**
     * Return an object to the pool
     * @param {Object} obj - Object to return to pool
     */
    release(obj) {
        if (!obj || obj._isPooled) return;

        // Reset the object
        this.resetFunction(obj);

        // Mark as pooled
        obj._isPooled = true;
        this.activeCount--;

        // Add back to pool if not at max size
        if (this.maxSize === 0 || this.pool.length < this.maxSize) {
            this.pool.push(obj);
        } else {
            // Pool is full, destroy the object
            if (typeof obj.destroy === 'function') {
                obj.destroy();
            }
        }
    }

    /**
     * Release all active objects back to the pool
     */
    releaseAll() {
        // This would require tracking active objects, which we don't currently do
        // For now, just log a warning
        console.warn('ObjectPool.releaseAll() not implemented - objects should be released individually');
    }

    /**
     * Warm the pool by pre-creating objects
     * @param {number} count - Number of objects to pre-create
     */
    warm(count) {
        this.expand(count);
    }

    /**
     * Auto-scale pool size based on usage
     * Expands if pool is frequently empty, shrinks if pool is rarely used
     */
    autoScale() {
        const usageRate = this.activeCount / (this.pool.length + this.activeCount || 1);
        
        // If pool is frequently empty (high usage), expand
        if (usageRate > 0.8 && this.pool.length < 5) {
            this.expand(Math.ceil(this.maxSize * 0.2)); // Expand by 20% of max
        }
        
        // If pool is rarely used (low usage), shrink
        if (usageRate < 0.2 && this.pool.length > this.maxSize * 0.5) {
            // Shrink by removing excess objects
            const excess = Math.floor(this.pool.length - this.maxSize * 0.5);
            for (let i = 0; i < excess && this.pool.length > 0; i++) {
                const obj = this.pool.pop();
                if (typeof obj.destroy === 'function') {
                    try {
                        obj.destroy();
                    } catch (error) {
                        console.warn('ObjectPool: Error destroying object during auto-scale:', error);
                    }
                }
            }
        }
    }

    /**
     * Get pool statistics
     * @returns {Object} Pool statistics
     */
    getStats() {
        const total = this.pool.length + this.activeCount;
        const usageRate = total > 0 ? (this.activeCount / total) * 100 : 0;
        
        return {
            total,
            available: this.pool.length,
            active: this.activeCount,
            maxSize: this.maxSize,
            usageRate: usageRate.toFixed(2) + '%',
            efficiency: this.pool.length > 0 ? ((this.pool.length / total) * 100).toFixed(2) + '%' : '0%'
        };
    }

    /**
     * Clear the pool and destroy all objects
     * @param {boolean} destroyActive - Whether to destroy active objects too
     */
    clear(destroyActive = false) {
        for (const obj of this.pool) {
            if (typeof obj.destroy === 'function') {
                try {
                    obj.destroy();
                } catch (error) {
                    console.warn('ObjectPool: Error destroying pooled object:', error);
                }
            }
        }
        this.pool.length = 0;
        
        if (destroyActive) {
            // Note: We can't track active objects without additional infrastructure
            // This is a limitation - active objects should be released before clearing
            console.warn('ObjectPool: Cannot destroy active objects - they must be released first');
        }
        
        this.activeCount = 0;
    }
}

/**
 * UI Object Pools - Pre-configured pools for common UI elements
 */
export class UIObjectPools {
    /**
     * Create UI object pools for a scene
     * @param {Phaser.Scene} scene - The Phaser scene
     */
    constructor(scene) {
        this.scene = scene;
        this.pools = new Map();

        this.initializePools();
    }

    /**
     * Initialize common UI object pools
     * Pools are created lazily (initialSize = 0) to avoid creating objects before scene is ready
     */
    initializePools() {
        // Text objects pool - lazy initialization (initialSize = 0)
        this.pools.set('text', new ObjectPool(
            () => {
                if (!this.scene) {
                    console.error('UIObjectPools: Scene is undefined');
                    return null;
                }
                if (!this.scene.add) {
                    console.error('UIObjectPools: Scene.add is undefined - scene not initialized yet');
                    return null;
                }
                if (typeof this.scene.add.text !== 'function') {
                    console.error('UIObjectPools: Scene.add.text is not a function');
                    return null;
                }
                try {
                    return this.scene.add.text(0, 0, '', {
                        font: '16px Arial',
                        fill: '#ffffff'
                    });
                } catch (error) {
                    console.error('UIObjectPools: Error creating text object:', error);
                    return null;
                }
            },
            (text) => {
                if (text && !text.destroyed) {
                    text.setText('');
                    text.setPosition(0, 0);
                    text.setStyle({
                        font: '16px Arial',
                        fill: '#ffffff'
                    });
                    text.setVisible(false);
                    text.setActive(false);
                }
            },
            0, 100 // initialSize = 0 (lazy), maxSize = 100
        ));

        // Rectangle objects pool - lazy initialization
        this.pools.set('rectangle', new ObjectPool(
            () => {
                if (!this.scene || !this.scene.add || typeof this.scene.add.rectangle !== 'function') {
                    console.error('UIObjectPools: Scene not ready for rectangle creation');
                    return null;
                }
                try {
                    return this.scene.add.rectangle(0, 0, 100, 100, 0xffffff);
                } catch (error) {
                    console.error('UIObjectPools: Error creating rectangle object:', error);
                    return null;
                }
            },
            (rect) => {
                if (rect && !rect.destroyed) {
                    rect.setPosition(0, 0);
                    rect.setSize(100, 100);
                    rect.setFillStyle(0xffffff);
                    rect.setVisible(false);
                    rect.setActive(false);
                }
            },
            0, 75 // initialSize = 0 (lazy), maxSize = 75
        ));

        // Image objects pool - lazy initialization
        this.pools.set('image', new ObjectPool(
            () => {
                if (!this.scene || !this.scene.add || typeof this.scene.add.image !== 'function') {
                    console.error('UIObjectPools: Scene not ready for image creation');
                    return null;
                }
                try {
                    return this.scene.add.image(0, 0, '');
                } catch (error) {
                    console.error('UIObjectPools: Error creating image object:', error);
                    return null;
                }
            },
            (image) => {
                if (image && !image.destroyed) {
                    image.setTexture('');
                    image.setPosition(0, 0);
                    image.setScale(1);
                    image.setVisible(false);
                    image.setActive(false);
                }
            },
            0, 50 // initialSize = 0 (lazy), maxSize = 50
        ));

        // Graphics objects pool - lazy initialization
        this.pools.set('graphics', new ObjectPool(
            () => {
                if (!this.scene || !this.scene.add || typeof this.scene.add.graphics !== 'function') {
                    console.error('UIObjectPools: Scene not ready for graphics creation');
                    return null;
                }
                try {
                    return this.scene.add.graphics();
                } catch (error) {
                    console.error('UIObjectPools: Error creating graphics object:', error);
                    return null;
                }
            },
            (graphics) => {
                if (graphics && !graphics.destroyed) {
                    graphics.clear();
                    graphics.setVisible(false);
                    graphics.setActive(false);
                }
            },
            0, 25 // initialSize = 0 (lazy), maxSize = 25
        ));
    }

    /**
     * Get an object from a specific pool
     * @param {string} poolName - Name of the pool
     * @returns {Object} Pooled object
     */
    get(poolName) {
        const pool = this.pools.get(poolName);
        if (!pool) {
            console.warn(`UIObjectPools: Pool '${poolName}' not found`);
            return null;
        }
        return pool.get();
    }

    /**
     * Return an object to its pool
     * @param {string} poolName - Name of the pool
     * @param {Object} obj - Object to return
     */
    release(poolName, obj) {
        const pool = this.pools.get(poolName);
        if (!pool) {
            console.warn(`UIObjectPools: Pool '${poolName}' not found`);
            return;
        }
        pool.release(obj);
    }

    /**
     * Get statistics for all pools
     * @returns {Object} Pool statistics
     */
    getStats() {
        const stats = {};
        for (const [name, pool] of this.pools) {
            stats[name] = pool.getStats();
        }
        return stats;
    }

    /**
     * Clear all pools and destroy objects
     */
    clear() {
        for (const pool of this.pools.values()) {
            pool.clear();
        }
        this.pools.clear();
    }

    /**
     * Expand a specific pool
     * @param {string} poolName - Name of the pool
     * @param {number} count - Number of objects to add
     */
    expandPool(poolName, count) {
        const pool = this.pools.get(poolName);
        if (pool) {
            pool.expand(count);
        }
    }
}

/**
 * Pool Manager - Manages multiple object pools
 */
export class PoolManager {
    constructor() {
        this.pools = new Map();
        this.scenePools = new WeakMap();
    }

    /**
     * Create or get a pool for a specific scene
     * @param {Phaser.Scene} scene - The Phaser scene
     * @returns {UIObjectPools} UI object pools for the scene
     */
    getScenePools(scene) {
        if (!this.scenePools.has(scene)) {
            this.scenePools.set(scene, new UIObjectPools(scene));
        }
        return this.scenePools.get(scene);
    }

    /**
     * Create a custom pool
     * @param {string} name - Pool name
     * @param {Function} createFunction - Function to create objects
     * @param {Function} resetFunction - Function to reset objects
     * @param {number} initialSize - Initial pool size
     * @param {number} maxSize - Maximum pool size
     * @returns {ObjectPool} The created pool
     */
    createPool(name, createFunction, resetFunction = null, initialSize = 10, maxSize = 100) {
        const pool = new ObjectPool(createFunction, resetFunction, initialSize, maxSize);
        this.pools.set(name, pool);
        return pool;
    }

    /**
     * Get a custom pool
     * @param {string} name - Pool name
     * @returns {ObjectPool} The pool
     */
    getPool(name) {
        return this.pools.get(name);
    }

    /**
     * Clean up all pools for a scene
     * @param {Phaser.Scene} scene - The Phaser scene
     */
    cleanupScene(scene) {
        const scenePools = this.scenePools.get(scene);
        if (scenePools) {
            scenePools.clear();
            this.scenePools.delete(scene);
        }
    }

    /**
     * Get global statistics
     * @returns {Object} Global pool statistics
     */
    getGlobalStats() {
        const stats = {
            customPools: {},
            scenePools: this.scenePools.size
        };

        for (const [name, pool] of this.pools) {
            stats.customPools[name] = pool.getStats();
        }

        return stats;
    }
}

// Global pool manager instance
export const poolManager = new PoolManager();