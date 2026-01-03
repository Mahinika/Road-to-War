/**
 * Scene Event Cleanup Utilities
 * Provides systematic event listener management and cleanup for Phaser scenes
 */

export class SceneEventManager {
    /**
     * Create a new SceneEventManager
     * @param {Phaser.Scene} scene - The Phaser scene
     */
    constructor(scene) {
        this.scene = scene;
        this.eventListeners = new Map();
        this.timers = new Set();
        this.intervals = new Set();
    }

    /**
     * Add an event listener with automatic cleanup tracking
     * @param {string|Phaser.Events.EventEmitter} emitter - Event emitter or event name
     * @param {string} event - Event name (if emitter is EventEmitter)
     * @param {Function} callback - Event callback function
     * @param {Object} context - Context for the callback
     * @param {boolean} once - Whether to listen only once
     * @returns {Function} Cleanup function
     */
    addListener(emitter, event, callback, context = null, once = false) {
        let actualEmitter;
        let actualEvent;

        if (typeof emitter === 'string') {
            // emitter is actually the event name, use scene.events
            actualEmitter = this.scene.events;
            actualEvent = emitter;
        } else {
            // emitter is an EventEmitter object
            actualEmitter = emitter;
            actualEvent = event;
        }

        if (!actualEmitter || !actualEvent || !callback) {
            console.warn('SceneEventManager: Invalid parameters for addListener');
            return () => { };
        }

        // Create a unique key for this listener
        const key = `${actualEmitter.constructor.name}_${actualEvent}_${callback.name || 'anonymous'}`;

        // Store listener info for cleanup
        if (!this.eventListeners.has(key)) {
            this.eventListeners.set(key, []);
        }

        const listenerInfo = {
            emitter: actualEmitter,
            event: actualEvent,
            callback: callback,
            context: context,
            once: once
        };

        this.eventListeners.get(key).push(listenerInfo);

        // Add the actual listener
        if (once) {
            actualEmitter.once(actualEvent, callback, context);
        } else {
            actualEmitter.on(actualEvent, callback, context);
        }

        // Return cleanup function
        return () => this.removeListener(key, listenerInfo);
    }

    /**
     * Remove a specific listener
     * @param {string} key - Listener key
     * @param {Object} listenerInfo - Listener information object
     */
    removeListener(key, listenerInfo) {
        if (!this.eventListeners.has(key)) return;

        const listeners = this.eventListeners.get(key);
        const index = listeners.indexOf(listenerInfo);

        if (index > -1) {
            const { emitter, event, callback, context } = listenerInfo;
            emitter.off(event, callback, context);
            listeners.splice(index, 1);
        }

        if (listeners.length === 0) {
            this.eventListeners.delete(key);
        }
    }

    /**
     * Add a timer with automatic cleanup tracking
     * @param {number} delay - Delay in milliseconds
     * @param {Function} callback - Timer callback
     * @param {Object} context - Context for the callback
     * @param {Array} args - Arguments to pass to the callback
     * @returns {Phaser.Time.TimerEvent} Timer event
     */
    addTimer(delay, callback, context = null, ...args) {
        const timer = this.scene.time.delayedCall(delay, callback, args, context);
        this.timers.add(timer);
        return timer;
    }

    /**
     * Add an interval with automatic cleanup tracking
     * @param {number} delay - Delay between calls in milliseconds
     * @param {Function} callback - Interval callback
     * @param {Object} context - Context for the callback
     * @param {Array} args - Arguments to pass to the callback
     * @returns {Phaser.Time.TimerEvent} Timer event
     */
    addInterval(delay, callback, context = null, ...args) {
        const timer = this.scene.time.addEvent({
            delay: delay,
            callback: callback,
            args: args,
            callbackScope: context,
            loop: true
        });
        this.intervals.add(timer);
        return timer;
    }

    /**
     * Remove a timer
     * @param {Phaser.Time.TimerEvent} timer - Timer to remove
     */
    removeTimer(timer) {
        if (timer && this.timers.has(timer)) {
            timer.destroy();
            this.timers.delete(timer);
        }
    }

    /**
     * Remove an interval
     * @param {Phaser.Time.TimerEvent} timer - Interval to remove
     */
    removeInterval(timer) {
        if (timer && this.intervals.has(timer)) {
            timer.destroy();
            this.intervals.delete(timer);
        }
    }

    /**
     * Clean up all tracked event listeners, timers, and intervals
     */
    cleanup() {
        // Clean up event listeners
        for (const [key, listeners] of this.eventListeners) {
            for (const listenerInfo of listeners) {
                try {
                    const { emitter, event, callback, context } = listenerInfo;
                    emitter.off(event, callback, context);
                } catch (error) {
                    console.warn(`SceneEventManager: Error cleaning up listener ${key}:`, error);
                }
            }
        }
        this.eventListeners.clear();

        // Clean up timers
        for (const timer of this.timers) {
            try {
                timer.destroy();
            } catch (error) {
                console.warn('SceneEventManager: Error cleaning up timer:', error);
            }
        }
        this.timers.clear();

        // Clean up intervals
        for (const interval of this.intervals) {
            try {
                interval.destroy();
            } catch (error) {
                console.warn('SceneEventManager: Error cleaning up interval:', error);
            }
        }
        this.intervals.clear();
    }

    /**
     * Get cleanup statistics
     * @returns {Object} Statistics about tracked resources
     */
    getStats() {
        return {
            eventListeners: this.eventListeners.size,
            timers: this.timers.size,
            intervals: this.intervals.size,
            totalListeners: Array.from(this.eventListeners.values()).reduce((sum, listeners) => sum + listeners.length, 0)
        };
    }
}

/**
 * Scene Resource Manager - Manages scene lifecycle and cleanup
 */
export class SceneResourceManager {
    /**
     * Create a new SceneResourceManager
     * @param {Phaser.Scene} scene - The Phaser scene
     */
    constructor(scene) {
        this.scene = scene;
        this.eventManager = new SceneEventManager(scene);
        this.resources = new Set();
        this.uiElements = new Set();
        this.textures = new Set();
    }

    /**
     * Track a resource for automatic cleanup
     * @param {Object} resource - Resource to track (Phaser GameObject, etc.)
     */
    trackResource(resource) {
        if (resource && typeof resource.destroy === 'function') {
            this.resources.add(resource);
        }
    }

    /**
     * Track a UI element for automatic cleanup
     * @param {Object} element - UI element to track
     */
    trackUIElement(element) {
        if (element) {
            this.uiElements.add(element);
        }
    }

    /**
     * Track a texture for automatic cleanup
     * @param {string} textureKey - Texture key to track
     */
    trackTexture(textureKey) {
        if (textureKey && typeof textureKey === 'string') {
            this.textures.add(textureKey);
        }
    }

    /**
     * Proxy for eventManager.addListener
     * Satisfies test suite requirements
     */
    addEventListener(event, callback, context = null) {
        return this.eventManager.addListener(event, callback, context);
    }

    /**
     * Proxy for eventManager.addTimer
     * Satisfies test suite requirements
     */
    addTimedEvent(delay, callback, context = null) {
        return this.eventManager.addTimer(delay, callback, context);
    }

    /**
     * Clean up all tracked resources
     */
    cleanup() {
        // Clean up event manager
        this.eventManager.cleanup();

        // Clean up UI elements
        for (const element of this.uiElements) {
            try {
                if (element && typeof element.destroy === 'function' && !element.destroyed) {
                    element.destroy();
                }
            } catch (error) {
                console.warn('SceneResourceManager: Error cleaning up UI element:', error);
            }
        }
        this.uiElements.clear();

        // Clean up resources
        for (const resource of this.resources) {
            try {
                if (resource && typeof resource.destroy === 'function' && !resource.destroyed) {
                    resource.destroy();
                }
            } catch (error) {
                console.warn('SceneResourceManager: Error cleaning up resource:', error);
            }
        }
        this.resources.clear();

        // Note: Textures are managed by Phaser and should be cleaned up by the scene
        // We don't destroy them here as they might be shared
        this.textures.clear();
    }

    /**
     * Get resource statistics
     * @returns {Object} Statistics about tracked resources
     */
    getStats() {
        return {
            ...this.eventManager.getStats(),
            resources: this.resources.size,
            uiElements: this.uiElements.size,
            textures: this.textures.size
        };
    }
}

/**
 * Safe scene destruction utility
 * @param {Phaser.Scene} scene - Scene to destroy safely
 */
export function safeDestroyScene(scene) {
    if (!scene) return;

    try {
        // Check if scene has a resource manager
        if (scene.resourceManager) {
            scene.resourceManager.cleanup();
        }

        // Check if scene has an event manager
        if (scene.eventManager) {
            scene.eventManager.cleanup();
        }

        // Call scene shutdown if it exists
        if (typeof scene.shutdown === 'function') {
            scene.shutdown();
        }

        // Remove from scene manager
        if (scene.scene && typeof scene.scene.remove === 'function') {
            scene.scene.remove(scene.key);
        }
    } catch (error) {
        console.error('safeDestroyScene: Error during scene destruction:', error);
    }
}


