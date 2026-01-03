import { Logger } from './logger.js';
import { GameEvents } from './event-constants.js';

/**
 * Event Bus - Enhanced event system with validation, history, and performance monitoring
 * Wraps Phaser's event system with additional features for debugging and type safety
 */
export class EventBus {
    constructor(scene) {
        this.scene = scene;
        this.eventHistory = [];
        this.maxHistorySize = 100;
        this.performanceMetrics = {
            eventCounts: new Map(),
            totalEvents: 0,
            averageTime: 0
        };
        this.eventTimings = [];
        this.schemas = null; // Will be loaded from event-schemas.js
        this.enabled = true;
    }

    /**
     * Load event schemas for validation
     * @param {Object} schemas - Event schema definitions
     */
    setSchemas(schemas) {
        this.schemas = schemas;
    }

    /**
     * Validate event payload against schema
     * @param {string} event - Event name
     * @param {Object} payload - Event payload
     * @returns {Object} Validation result { valid: boolean, errors: string[] }
     */
    validatePayload(event, payload) {
        if (!this.schemas || !this.schemas[event]) {
            return { valid: true, errors: [] }; // No schema = no validation
        }

        const schema = this.schemas[event];
        const errors = [];

        // Check required fields
        if (schema.required) {
            for (const field of schema.required) {
                if (payload[field] === undefined) {
                    errors.push(`Missing required field: ${field}`);
                }
            }
        }

        // Check field types
        if (schema.fields) {
            for (const [field, expectedType] of Object.entries(schema.fields)) {
                if (payload[field] !== undefined) {
                    const actualType = this.getType(payload[field]);
                    if (actualType !== expectedType) {
                        errors.push(`Field ${field}: expected ${expectedType}, got ${actualType}`);
                    }
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get type of a value
     * @param {*} value - Value to check
     * @returns {string} Type name
     */
    getType(value) {
        if (Array.isArray(value)) return 'array';
        if (value === null) return 'null';
        return typeof value;
    }

    /**
     * Emit an event with validation and tracking
     * @param {string} event - Event name
     * @param {Object} payload - Event payload
     * @param {Object} options - Options { skipValidation: boolean, skipHistory: boolean }
     */
    emit(event, payload = {}, options = {}) {
        if (!this.enabled) return;

        const startTime = performance.now();

        // Validate payload if schemas are loaded
        if (!options.skipValidation && this.schemas) {
            const validation = this.validatePayload(event, payload);
            if (!validation.valid) {
                Logger.warn('EventBus', `Invalid payload for ${event}:`, validation.errors);
                // Continue anyway (non-blocking validation)
            }
        }

        // Track performance
        this.performanceMetrics.totalEvents++;
        const count = this.performanceMetrics.eventCounts.get(event) || 0;
        this.performanceMetrics.eventCounts.set(event, count + 1);

        // Emit via Phaser's event system
        this.scene.events.emit(event, payload);

        // Record in history
        if (!options.skipHistory) {
            const timing = performance.now() - startTime;
            this.eventHistory.push({
                event,
                payload,
                timestamp: Date.now(),
                timing
            });

            // Keep history size limited
            if (this.eventHistory.length > this.maxHistorySize) {
                this.eventHistory.shift();
            }

            // Track timing
            this.eventTimings.push(timing);
            if (this.eventTimings.length > 100) {
                this.eventTimings.shift();
            }
        }
    }

    /**
     * Listen to an event
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @param {Object} context - Context for handler
     */
    on(event, handler, context = null) {
        if (context) {
            this.scene.events.on(event, handler, context);
        } else {
            this.scene.events.on(event, handler);
        }
    }

    /**
     * Remove event listener
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     */
    off(event, handler) {
        this.scene.events.off(event, handler);
    }

    /**
     * Get event history
     * @param {number} limit - Maximum number of events to return
     * @returns {Array} Array of recent events
     */
    getEventHistory(limit = 100) {
        return this.eventHistory.slice(-limit);
    }

    /**
     * Get performance metrics
     * @returns {Object} Performance metrics
     */
    getPerformanceMetrics() {
        const averageTime = this.eventTimings.length > 0
            ? this.eventTimings.reduce((a, b) => a + b, 0) / this.eventTimings.length
            : 0;

        return {
            totalEvents: this.performanceMetrics.totalEvents,
            eventCounts: Object.fromEntries(this.performanceMetrics.eventCounts),
            averageTime: averageTime.toFixed(3) + 'ms',
            recentTimings: this.eventTimings.slice(-10)
        };
    }

    /**
     * Clear event history
     */
    clearHistory() {
        this.eventHistory = [];
        this.eventTimings = [];
    }

    /**
     * Reset performance metrics
     */
    resetMetrics() {
        this.performanceMetrics = {
            eventCounts: new Map(),
            totalEvents: 0,
            averageTime: 0
        };
        this.eventTimings = [];
    }

    /**
     * Enable/disable event bus
     * @param {boolean} enabled - Enable state
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }
}

