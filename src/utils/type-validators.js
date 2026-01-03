/**
 * Type Validator - Type checking and validation utilities
 * Provides consistent type validation across the codebase
 */

export class TypeValidator {
    /**
     * Validate if value is a number within optional range
     * @param {*} value - Value to validate
     * @param {number|null} min - Minimum value (inclusive), null for no minimum
     * @param {number|null} max - Maximum value (inclusive), null for no maximum
     * @returns {boolean} True if valid number
     */
    static isNumber(value, min = null, max = null) {
        if (typeof value !== 'number' || isNaN(value)) {
            return false;
        }
        if (min !== null && value < min) {
            return false;
        }
        if (max !== null && value > max) {
            return false;
        }
        return true;
    }
    
    /**
     * Validate if value is an object with optional required keys
     * @param {*} value - Value to validate
     * @param {Array<string>} requiredKeys - Array of required property keys
     * @returns {boolean} True if valid object
     */
    static isObject(value, requiredKeys = []) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return false;
        }
        for (const key of requiredKeys) {
            if (!(key in value)) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Validate if value is an array with optional minimum length
     * @param {*} value - Value to validate
     * @param {number} minLength - Minimum array length
     * @returns {boolean} True if valid array
     */
    static isArray(value, minLength = 0) {
        return Array.isArray(value) && value.length >= minLength;
    }
    
    /**
     * Validate if value is a string with optional minimum length
     * @param {*} value - Value to validate
     * @param {number} minLength - Minimum string length
     * @returns {boolean} True if valid string
     */
    static isString(value, minLength = 0) {
        return typeof value === 'string' && value.length >= minLength;
    }
    
    /**
     * Validate if value is a boolean
     * @param {*} value - Value to validate
     * @returns {boolean} True if valid boolean
     */
    static isBoolean(value) {
        return typeof value === 'boolean';
    }
    
    /**
     * Validate if value is a function
     * @param {*} value - Value to validate
     * @returns {boolean} True if valid function
     */
    static isFunction(value) {
        return typeof value === 'function';
    }
}

