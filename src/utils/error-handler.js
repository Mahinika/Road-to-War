/**
 * Error Handler - Centralized error handling and validation
 * Provides standardized error logging, validation, and UI feedback
 */

export class ErrorHandler {
    /**
     * Handle an error with standardized logging and event emission
     * @param {Error|string} error - Error object or error message
     * @param {string} context - Context where error occurred (e.g., 'CombatManager.startCombat')
     * @param {string} severity - Error severity: 'debug', 'info', 'warn', 'error'
     * @returns {Object} Error data object
     */
    static handle(error, context, severity = 'error') {
        const errorData = {
            message: error instanceof Error ? error.message : String(error),
            context: context,
            severity: severity,
            timestamp: Date.now(),
            stack: error instanceof Error ? error.stack : undefined
        };
        
        // Log to console based on severity
        const logMethod = severity === 'error' ? 'error' : 
                          severity === 'warn' ? 'warn' : 
                          severity === 'info' ? 'log' : 'log';
        console[logMethod](`[${severity.toUpperCase()}][${context}]`, errorData.message, errorData.stack || '');
        
        // Emit error event for UI feedback (if scene is available)
        if (typeof window !== 'undefined' && window.gameScene) {
            window.gameScene.events.emit('error_occurred', errorData);
        }
        
        return errorData;
    }
    
    /**
     * Validate that an entity has required properties
     * @param {Object} entity - Entity to validate
     * @param {Array<string>} requiredProps - Array of required property paths (e.g., ['data', 'data.stats'])
     * @param {string} context - Context for error messages
     * @throws {Error} If entity is invalid
     */
    static validateEntity(entity, requiredProps, context) {
        if (!entity) {
            throw new Error(`${context}: Entity is null or undefined`);
        }
        
        for (const propPath of requiredProps) {
            const props = propPath.split('.');
            let current = entity;
            
            for (const prop of props) {
                if (current === null || current === undefined) {
                    throw new Error(`${context}: Missing required property '${propPath}'`);
                }
                if (!(prop in current)) {
                    throw new Error(`${context}: Missing required property '${propPath}'`);
                }
                current = current[prop];
            }
        }
    }
    
    /**
     * Validate multiple entities at once
     * @param {Array<Object>} entities - Array of {entity, requiredProps} objects
     * @param {string} context - Context for error messages
     * @throws {Error} If any entity is invalid
     */
    static validateEntities(entities, context) {
        for (const { entity, requiredProps } of entities) {
            this.validateEntity(entity, requiredProps, context);
        }
    }
}

