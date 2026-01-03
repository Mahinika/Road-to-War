/**
 * Error Handling Utilities
 * Provides standardized error handling patterns and recovery mechanisms
 */

export class ErrorHandler {
    /**
     * Create a new ErrorHandler
     * @param {string} context - Context identifier for error logging
     * @param {Object} options - Error handling options
     */
    constructor(context = 'Unknown', options = {}) {
        this.context = context;
        this.options = {
            logErrors: options.logErrors !== false,
            throwErrors: options.throwErrors || false,
            retryAttempts: options.retryAttempts || 0,
            retryDelay: options.retryDelay || 1000,
            ...options
        };
    }

    /**
     * Handle an error with standardized logging and recovery
     * @param {Error|string} error - The error that occurred
     * @param {string} operation - Description of the operation that failed
     * @param {Object} context - Additional context information
     * @returns {boolean} True if error was handled gracefully, false if it should be rethrown
     */
    handle(error, operation = 'Unknown operation', context = {}) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : '';

        if (this.options.logErrors) {
            console.error(`[${this.context}] Error in ${operation}:`, errorMessage, context);
            if (errorStack) {
                console.error(`[${this.context}] Stack trace:`, errorStack);
            }
        }

        // Call custom error handler if provided
        if (this.options.onError) {
            try {
                this.options.onError(error, operation, context);
            } catch (handlerError) {
                console.error(`[${this.context}] Error in custom error handler:`, handlerError);
            }
        }

        return !this.options.throwErrors;
    }

    /**
     * Execute an operation with error handling
     * @param {Function} operation - The operation to execute
     * @param {string} operationName - Name of the operation
     * @param {Object} context - Additional context
     * @returns {*} Result of the operation or undefined if failed
     */
    async execute(operation, operationName = 'operation', context = {}) {
        try {
            return await operation();
        } catch (error) {
            if (!this.handle(error, operationName, context)) {
                throw error;
            }
            return undefined;
        }
    }

    /**
     * Execute an operation with retry logic
     * @param {Function} operation - The operation to execute
     * @param {string} operationName - Name of the operation
     * @param {Object} context - Additional context
     * @returns {*} Result of the operation or undefined if all retries failed
     */
    async executeWithRetry(operation, operationName = 'operation', context = {}) {
        let lastError;

        for (let attempt = 0; attempt <= this.options.retryAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;

                if (attempt < this.options.retryAttempts) {
                    if (this.options.logErrors) {
                        console.warn(`[${this.context}] Retry ${attempt + 1}/${this.options.retryAttempts} for ${operationName} after error:`, error.message);
                    }

                    // Wait before retry
                    await this.delay(this.options.retryDelay);
                }
            }
        }

        // All retries failed
        if (!this.handle(lastError, `${operationName} (all ${this.options.retryAttempts + 1} attempts failed)`, context)) {
            throw lastError;
        }

        return undefined;
    }

    /**
     * Utility method for delays
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after the delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Safe execution utilities
 */
export class SafeExecutor {
    /**
     * Safely execute a function that might throw
     * @param {Function} fn - Function to execute
     * @param {*} defaultValue - Default value to return if function throws
     * @param {string} context - Context for error logging
     * @returns {*} Function result or default value
     */
    static execute(fn, defaultValue = null, context = 'SafeExecutor') {
        try {
            return fn();
        } catch (error) {
            console.warn(`[${context}] Safe execution failed:`, error.message);
            return defaultValue;
        }
    }

    /**
     * Safely execute an async function
     * @param {Function} fn - Async function to execute
     * @param {*} defaultValue - Default value to return if function throws
     * @param {string} context - Context for error logging
     * @returns {Promise<*>} Promise that resolves to function result or default value
     */
    static async executeAsync(fn, defaultValue = null, context = 'SafeExecutor') {
        try {
            return await fn();
        } catch (error) {
            console.warn(`[${context}] Safe async execution failed:`, error.message);
            return defaultValue;
        }
    }

    /**
     * Safely access a nested property with fallback
     * @param {Object} obj - Object to access
     * @param {string} path - Dot-separated path to property
     * @param {*} defaultValue - Default value if property doesn't exist
     * @returns {*} Property value or default value
     */
    static get(obj, path, defaultValue = undefined) {
        if (!obj || typeof obj !== 'object') return defaultValue;

        const keys = path.split('.');
        let current = obj;

        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return defaultValue;
            }
        }

        return current;
    }

    /**
     * Safely set a nested property
     * @param {Object} obj - Object to modify
     * @param {string} path - Dot-separated path to property
     * @param {*} value - Value to set
     * @returns {boolean} True if successful, false otherwise
     */
    static set(obj, path, value) {
        if (!obj || typeof obj !== 'object') return false;

        const keys = path.split('.');
        const lastKey = keys.pop();
        let current = obj;

        for (const key of keys) {
            if (!(key in current) || current[key] === null || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        try {
            current[lastKey] = value;
            return true;
        } catch (error) {
            console.warn('SafeExecutor.set failed:', error.message);
            return false;
        }
    }
}

/**
 * Validation utilities
 */
export class Validator {
    /**
     * Validate that a value is not null or undefined
     * @param {*} value - Value to check
     * @param {string} name - Name of the value for error messages
     * @throws {Error} If value is null or undefined
     */
    static notNull(value, name = 'value') {
        if (value === null || value === undefined) {
            throw new Error(`${name} cannot be null or undefined`);
        }
    }

    /**
     * Validate that a value is a function
     * @param {*} value - Value to check
     * @param {string} name - Name of the value for error messages
     * @throws {Error} If value is not a function
     */
    static isFunction(value, name = 'value') {
        if (typeof value !== 'function') {
            throw new Error(`${name} must be a function, got ${typeof value}`);
        }
    }

    /**
     * Validate that a value is an object
     * @param {*} value - Value to check
     * @param {string} name - Name of the value for error messages
     * @throws {Error} If value is not an object
     */
    static isObject(value, name = 'value') {
        if (!value || typeof value !== 'object') {
            throw new Error(`${name} must be an object, got ${typeof value}`);
        }
    }

    /**
     * Validate that a value is a string
     * @param {*} value - Value to check
     * @param {string} name - Name of the value for error messages
     * @throws {Error} If value is not a string
     */
    static isString(value, name = 'value') {
        if (typeof value !== 'string') {
            throw new Error(`${name} must be a string, got ${typeof value}`);
        }
    }

    /**
     * Validate that a value is a number
     * @param {*} value - Value to check
     * @param {string} name - Name of the value for error messages
     * @param {number} min - Minimum value (optional)
     * @param {number} max - Maximum value (optional)
     * @throws {Error} If value is not a valid number or outside range
     */
    static isNumber(value, name = 'value', min = -Infinity, max = Infinity) {
        if (typeof value !== 'number' || isNaN(value)) {
            throw new Error(`${name} must be a valid number, got ${typeof value}`);
        }
        if (value < min || value > max) {
            throw new Error(`${name} must be between ${min} and ${max}, got ${value}`);
        }
    }

    /**
     * Validate Phaser scene
     * @param {*} scene - Scene to validate
     * @throws {Error} If scene is not a valid Phaser scene
     */
    static isPhaserScene(scene) {
        if (!scene || typeof scene !== 'object') {
            throw new Error('Scene must be a valid Phaser scene object');
        }
        if (!scene.scene || typeof scene.scene !== 'object') {
            throw new Error('Scene must have a valid scene manager');
        }
    }
}

/**
 * Recovery strategies for common failure scenarios
 */
export class RecoveryStrategies {
    /**
     * Retry strategy with exponential backoff
     * @param {Function} operation - Operation to retry
     * @param {number} maxAttempts - Maximum number of attempts
     * @param {number} baseDelay - Base delay in milliseconds
     * @returns {Promise} Promise that resolves to operation result
     */
    static async retryWithBackoff(operation, maxAttempts = 3, baseDelay = 1000) {
        let lastError;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;

                if (attempt < maxAttempts) {
                    const delay = baseDelay * Math.pow(2, attempt - 1);
                    console.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms delay`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        throw lastError;
    }

    /**
     * Circuit breaker pattern
     */
    static createCircuitBreaker(operation, failureThreshold = 5, recoveryTimeout = 60000) {
        let failures = 0;
        let lastFailureTime = 0;
        let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN

        return async function circuitBreakerOperation(...args) {
            const now = Date.now();

            if (state === 'OPEN') {
                if (now - lastFailureTime > recoveryTimeout) {
                    state = 'HALF_OPEN';
                } else {
                    throw new Error('Circuit breaker is OPEN - operation temporarily disabled');
                }
            }

            try {
                const result = await operation.apply(this, args);
                if (state === 'HALF_OPEN') {
                    state = 'CLOSED';
                    failures = 0;
                }
                return result;
            } catch (error) {
                failures++;
                lastFailureTime = now;

                if (failures >= failureThreshold) {
                    state = 'OPEN';
                }

                throw error;
            }
        };
    }

    /**
     * Graceful degradation strategy
     * @param {Function} primaryOperation - Primary operation to try
     * @param {Function} fallbackOperation - Fallback operation
     * @returns {Promise} Promise that resolves to operation result
     */
    static async gracefulDegradation(primaryOperation, fallbackOperation) {
        try {
            return await primaryOperation();
        } catch (error) {
            console.warn('Primary operation failed, using fallback:', error.message);
            return await fallbackOperation();
        }
    }
}

// Global error handler instance for common use
export const globalErrorHandler = new ErrorHandler('Global', {
    logErrors: true,
    throwErrors: false,
    retryAttempts: 2,
    retryDelay: 1000
});


